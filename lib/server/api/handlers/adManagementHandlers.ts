import type { NextApiResponse } from 'next';
import { getAccountByIdForMetaUsers } from '../../services/accountService';
import {
  publishFunnel,
  updateObjectStatus,
  updateObjectBudget,
  deleteAdObject,
} from '../../services/adManagementService';
import { PublishFunnelSchema } from '../../validation/adSchemas';
import { createHttpError, type ApiRequest } from '../http';

function qv(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.length) return value[0];
  return undefined;
}

async function resolveAccount(req: ApiRequest) {
  if (!req.user) throw createHttpError(401, 'Authentication required');
  const accountId = qv(req.query.account_id);
  if (!accountId) throw createHttpError(400, 'Missing query param: account_id');
  const account = await getAccountByIdForMetaUsers(accountId, req.user.metaUserIds);
  if (!account) throw createHttpError(404, 'Account not found for current user');
  return account;
}

export async function publishHandler(req: ApiRequest, res: NextApiResponse): Promise<void> {
  const account = await resolveAccount(req);
  const parsed = PublishFunnelSchema.safeParse(req.body);
  if (!parsed.success) {
    throw createHttpError(400, parsed.error.issues.map((i) => i.message).join('; '));
  }
  const result = await publishFunnel(account, parsed.data);
  res.status(200).json({ data: result });
}

type Level = 'campaign' | 'adset' | 'ad';

export function makeUpdateHandler(level: Level) {
  return async function updateHandler(req: ApiRequest, res: NextApiResponse): Promise<void> {
    const account = await resolveAccount(req);
    const objectId = qv(req.query.id);
    if (!objectId) throw createHttpError(400, 'Missing id');

    if (req.method === 'DELETE') {
      await deleteAdObject(account, level, objectId);
      res.status(200).json({ data: { deleted: true } });
      return;
    }

    const body = (req.body ?? {}) as {
      status?: 'ACTIVE' | 'PAUSED' | 'DELETED';
      daily_budget?: number;
      lifetime_budget?: number;
    };

    if (body.status) {
      await updateObjectStatus(account, level, objectId, body.status);
    }
    if (body.daily_budget || body.lifetime_budget) {
      await updateObjectBudget(account, level, objectId, {
        daily_budget: body.daily_budget,
        lifetime_budget: body.lifetime_budget,
      });
    }
    res.status(200).json({ data: { updated: true } });
  };
}
