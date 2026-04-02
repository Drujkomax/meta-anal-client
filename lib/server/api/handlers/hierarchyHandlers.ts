import type { NextApiResponse } from 'next';
import { getAccountByIdForMetaUsers } from '../../services/accountService';
import { getAdDetail, getAdSetDetail, getCampaignDetail, listCampaigns } from '../../services/hierarchyService';
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

function getParamId(value: string | string[] | undefined): string {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && value.length > 0) {
    return value[0];
  }

  return '';
}

export async function getCampaignsHandler(req: ApiRequest, res: NextApiResponse): Promise<void> {
  if (!req.user) throw createHttpError(401, 'Authentication required');

  const accountId = getQueryValue(req.query.account_id);
  if (!accountId) throw createHttpError(400, 'Missing query param: account_id');

  const account = await getAccountByIdForMetaUsers(accountId, req.user.metaUserIds);
  if (!account) throw createHttpError(404, 'Account not found for current user');

  const dateFrom = getQueryValue(req.query.date_from) || '';
  const dateTo = getQueryValue(req.query.date_to) || '';

  const data = await listCampaigns(account.id, dateFrom, dateTo);
  res.status(200).json({ data });
}

export async function getCampaignHandler(req: ApiRequest, res: NextApiResponse): Promise<void> {
  if (!req.user) throw createHttpError(401, 'Authentication required');

  const accountId = getQueryValue(req.query.account_id);
  const campaignId = getParamId(req.query.id);
  if (!accountId) throw createHttpError(400, 'Missing query param: account_id');

  const account = await getAccountByIdForMetaUsers(accountId, req.user.metaUserIds);
  if (!account) throw createHttpError(404, 'Account not found for current user');

  const dateFrom = getQueryValue(req.query.date_from) || '';
  const dateTo = getQueryValue(req.query.date_to) || '';

  const data = await getCampaignDetail(account.id, campaignId, dateFrom, dateTo);
  if (!data) throw createHttpError(404, 'Campaign not found');

  res.status(200).json({ data });
}

export async function getAdSetHandler(req: ApiRequest, res: NextApiResponse): Promise<void> {
  if (!req.user) throw createHttpError(401, 'Authentication required');

  const accountId = getQueryValue(req.query.account_id);
  const adsetId = getParamId(req.query.id);
  if (!accountId) throw createHttpError(400, 'Missing query param: account_id');

  const account = await getAccountByIdForMetaUsers(accountId, req.user.metaUserIds);
  if (!account) throw createHttpError(404, 'Account not found for current user');

  const dateFrom = getQueryValue(req.query.date_from) || '';
  const dateTo = getQueryValue(req.query.date_to) || '';

  const data = await getAdSetDetail(account.id, adsetId, dateFrom, dateTo);
  if (!data) throw createHttpError(404, 'AdSet not found');

  res.status(200).json({ data });
}

export async function getAdHandler(req: ApiRequest, res: NextApiResponse): Promise<void> {
  if (!req.user) throw createHttpError(401, 'Authentication required');

  const accountId = getQueryValue(req.query.account_id);
  const adId = getParamId(req.query.id);
  if (!accountId) throw createHttpError(400, 'Missing query param: account_id');

  const account = await getAccountByIdForMetaUsers(accountId, req.user.metaUserIds);
  if (!account) throw createHttpError(404, 'Account not found for current user');

  const dateFrom = getQueryValue(req.query.date_from) || '';
  const dateTo = getQueryValue(req.query.date_to) || '';

  const data = await getAdDetail(account.id, adId, dateFrom, dateTo);
  if (!data) throw createHttpError(404, 'Ad not found');

  res.status(200).json({ data });
}
