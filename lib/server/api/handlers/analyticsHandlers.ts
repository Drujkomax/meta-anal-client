import type { NextApiResponse } from 'next';
import {
  getAccountByIdForMetaUsers,
  listAccountsByMetaUsers,
} from '../../services/accountService';
import {
  getAnalyticsForAccount,
  getCrossAccountAnalytics,
  getTrendsForAccount,
} from '../../services/analyticsService';
import { getLastSuccessfulSync } from '../../services/metricsService';
import { syncAccount } from '../../services/syncService';
import { createHttpError, type ApiRequest } from '../http';

function getQueryValue(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && value.length > 0) {
    return value[0];
  }

  return undefined;
}

export async function getAnalyticsHandler(req: ApiRequest, res: NextApiResponse): Promise<void> {
  if (!req.user) {
    throw createHttpError(401, 'Authentication required');
  }

  const accountId = getQueryValue(req.query.account_id);
  if (!accountId) {
    throw createHttpError(400, 'Missing query param: account_id');
  }

  const account = await getAccountByIdForMetaUsers(accountId, req.user.metaUserIds);
  if (!account) {
    throw createHttpError(404, 'Account not found for current user');
  }

  const dateFrom = getQueryValue(req.query.date_from);
  const dateTo = getQueryValue(req.query.date_to);

  const payload = await getAnalyticsForAccount(account, dateFrom, dateTo);
  res.status(200).json(payload);
}

export async function getAnalyticsTrendsHandler(req: ApiRequest, res: NextApiResponse): Promise<void> {
  if (!req.user) {
    throw createHttpError(401, 'Authentication required');
  }

  const accountId = getQueryValue(req.query.account_id);
  if (!accountId) {
    throw createHttpError(400, 'Missing query param: account_id');
  }

  const account = await getAccountByIdForMetaUsers(accountId, req.user.metaUserIds);
  if (!account) {
    throw createHttpError(404, 'Account not found for current user');
  }

  const dateFrom = getQueryValue(req.query.date_from);
  const dateTo = getQueryValue(req.query.date_to);

  const payload = await getTrendsForAccount(account, dateFrom, dateTo);
  res.status(200).json(payload);
}

export async function getAnalyticsCrossAccountHandler(
  req: ApiRequest,
  res: NextApiResponse,
): Promise<void> {
  if (!req.user) {
    throw createHttpError(401, 'Authentication required');
  }

  const accounts = await listAccountsByMetaUsers(req.user.metaUserIds);
  if (accounts.length === 0) {
    res.status(200).json({
      dateRange: { from: '', to: '' },
      accounts: [],
      totals: { spend: 0, impressions: 0, reach: 0, clicks: 0, ctr: 0, cpc: 0, cpm: 0 },
    });
    return;
  }

  const dateFrom = getQueryValue(req.query.date_from);
  const dateTo = getQueryValue(req.query.date_to);

  const payload = await getCrossAccountAnalytics(accounts, dateFrom, dateTo);
  res.status(200).json(payload);
}

export async function getAnalyticsSyncStatusHandler(req: ApiRequest, res: NextApiResponse): Promise<void> {
  if (!req.user) {
    throw createHttpError(401, 'Authentication required');
  }

  const accounts = await listAccountsByMetaUsers(req.user.metaUserIds);

  const statuses = await Promise.all(
    accounts.map(async (account) => {
      const lastSync = await getLastSuccessfulSync(account.id);
      return {
        accountId: account.id,
        accountName: account.name,
        adAccountId: account.ad_account_id,
        lastSyncedAt: lastSync?.completed_at ?? null,
        lastSyncStatus: lastSync?.status ?? null,
        lastSyncRows: lastSync?.rows_synced ?? 0,
      };
    }),
  );

  res.status(200).json({ data: statuses });
}

export async function triggerManualSyncHandler(req: ApiRequest, res: NextApiResponse): Promise<void> {
  if (!req.user) {
    throw createHttpError(401, 'Authentication required');
  }

  const accountId = getQueryValue(req.query.account_id) || req.body?.account_id;
  if (!accountId || typeof accountId !== 'string') {
    throw createHttpError(400, 'Missing param: account_id');
  }

  const account = await getAccountByIdForMetaUsers(accountId, req.user.metaUserIds);
  if (!account) {
    throw createHttpError(404, 'Account not found for current user');
  }

  const result = await syncAccount(account);
  res.status(200).json(result);
}
