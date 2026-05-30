import type { AccountRecord } from './accountService';
import type { PublishFunnelInput } from '../validation/adSchemas';
import { metaClient } from './metaClient';
import { recordOperation, markOperation } from './adOperationsRepo';
import { syncAccount } from './syncService';
import { mapMetaError } from './metaErrors';
import { createHttpError } from '../api/http';

type Level = 'campaign' | 'adset' | 'ad';

// ---------------------------------------------------------------------------
// Публикация funnel (кампания → группа → креатив → объявление)
// ---------------------------------------------------------------------------

export interface PublishDeps {
  client: Pick<
    typeof metaClient,
    'createCampaign' | 'createAdSet' | 'createAdCreativeFromPost' | 'createAd' | 'deleteObject'
  >;
  recordOperation: typeof recordOperation;
  markOperation: typeof markOperation;
  syncAccount: typeof syncAccount;
}

const defaultDeps: PublishDeps = { client: metaClient, recordOperation, markOperation, syncAccount };

export interface PublishResult {
  campaignId: string;
  adSetId: string;
  adId: string;
}

export async function publishFunnel(
  account: AccountRecord,
  input: PublishFunnelInput,
  deps: PublishDeps = defaultDeps,
): Promise<PublishResult> {
  const adAccountId = account.ad_account_id;
  const token = account.user_access_token;
  if (!adAccountId || !token) throw createHttpError(400, 'У аккаунта нет ad_account_id или токена.');

  const created: { campaignId?: string; adSetId?: string } = {};

  const run = async <T>(
    type: string,
    level: Level,
    payload: unknown,
    fn: () => Promise<T>,
  ): Promise<T> => {
    const opId = await deps.recordOperation({
      accountId: account.id,
      metaUserId: account.owner_meta_user_id,
      operationType: type,
      level,
      requestPayload: payload,
    });
    try {
      const result = await fn();
      await deps.markOperation(opId, {
        status: 'success',
        metaObjectId: (result as { id?: string }).id,
        response: result,
      });
      return result;
    } catch (error) {
      await deps.markOperation(opId, { status: 'failed', errorMessage: mapMetaError(error) });
      throw error;
    }
  };

  try {
    const campaign = await run('create_campaign', 'campaign', input.campaign, () =>
      deps.client.createCampaign(adAccountId, token, {
        ...input.campaign,
        status: 'PAUSED',
        special_ad_categories: JSON.stringify(input.campaign.special_ad_categories),
      }),
    );
    created.campaignId = campaign.id;

    const adSet = await run('create_adset', 'adset', input.adSet, () =>
      deps.client.createAdSet(adAccountId, token, {
        ...input.adSet,
        campaign_id: campaign.id,
        status: 'PAUSED',
        targeting: JSON.stringify(input.adSet.targeting),
        ...(input.adSet.promoted_object
          ? { promoted_object: JSON.stringify(input.adSet.promoted_object) }
          : {}),
      }),
    );
    created.adSetId = adSet.id;

    const creative = await run('create_creative', 'ad', { object_story_id: input.ad.object_story_id }, () =>
      deps.client.createAdCreativeFromPost(adAccountId, token, {
        name: `${input.ad.name} creative`,
        object_story_id: input.ad.object_story_id,
      }),
    );

    const ad = await run('create_ad', 'ad', input.ad, () =>
      deps.client.createAd(adAccountId, token, {
        name: input.ad.name,
        adset_id: adSet.id,
        creative_id: creative.id,
        status: 'PAUSED',
      }),
    );

    await deps.syncAccount(account).catch(() => undefined);
    return { campaignId: campaign.id, adSetId: adSet.id, adId: ad.id };
  } catch (error) {
    // Откат: удаляем созданное в обратном порядке
    if (created.adSetId) await deps.client.deleteObject(created.adSetId, token, adAccountId).catch(() => undefined);
    if (created.campaignId) await deps.client.deleteObject(created.campaignId, token, adAccountId).catch(() => undefined);
    throw createHttpError(502, `Публикация не удалась, изменения откатаны: ${mapMetaError(error)}`);
  }
}

// ---------------------------------------------------------------------------
// Управление существующими объектами (статус / бюджет / удаление)
// ---------------------------------------------------------------------------

export interface ManageDeps {
  client: Pick<typeof metaClient, 'updateObject' | 'deleteObject'>;
  recordOperation: typeof recordOperation;
  markOperation: typeof markOperation;
}

const defaultManageDeps: ManageDeps = { client: metaClient, recordOperation, markOperation };

async function withAudit(
  account: AccountRecord,
  type: string,
  level: Level,
  objectId: string,
  payload: unknown,
  deps: ManageDeps,
  fn: () => Promise<unknown>,
): Promise<unknown> {
  const adAccountId = account.ad_account_id;
  const token = account.user_access_token;
  if (!adAccountId || !token) throw createHttpError(400, 'У аккаунта нет ad_account_id или токена.');
  const opId = await deps.recordOperation({
    accountId: account.id,
    metaUserId: account.owner_meta_user_id,
    operationType: type,
    level,
    requestPayload: payload,
  });
  try {
    const res = await fn();
    await deps.markOperation(opId, { status: 'success', metaObjectId: objectId, response: res });
    return res;
  } catch (error) {
    await deps.markOperation(opId, { status: 'failed', errorMessage: mapMetaError(error) });
    throw createHttpError(502, mapMetaError(error));
  }
}

export async function updateObjectStatus(
  account: AccountRecord,
  level: Level,
  objectId: string,
  status: 'ACTIVE' | 'PAUSED' | 'DELETED',
  deps: ManageDeps = defaultManageDeps,
): Promise<unknown> {
  return withAudit(account, 'update_status', level, objectId, { status }, deps, () =>
    deps.client.updateObject(objectId, account.user_access_token as string, account.ad_account_id as string, { status }),
  );
}

export async function updateObjectBudget(
  account: AccountRecord,
  level: Level,
  objectId: string,
  budget: { daily_budget?: number; lifetime_budget?: number },
  deps: ManageDeps = defaultManageDeps,
): Promise<unknown> {
  return withAudit(account, 'update_budget', level, objectId, budget, deps, () =>
    deps.client.updateObject(objectId, account.user_access_token as string, account.ad_account_id as string, budget),
  );
}

export async function deleteAdObject(
  account: AccountRecord,
  level: Level,
  objectId: string,
  deps: ManageDeps = defaultManageDeps,
): Promise<unknown> {
  return withAudit(account, 'delete', level, objectId, {}, deps, () =>
    deps.client.deleteObject(objectId, account.user_access_token as string, account.ad_account_id as string),
  );
}
