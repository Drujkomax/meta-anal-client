import type { NextApiResponse } from 'next';
import { getAccountByIdForMetaUsers } from '../../services/accountService';
import { metaClient } from '../../services/metaClient';
import { createHttpError, type ApiRequest } from '../http';

function qv(v: string | string[] | undefined): string | undefined {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && v.length) return v[0];
  return undefined;
}

async function account(req: ApiRequest) {
  if (!req.user) throw createHttpError(401, 'Authentication required');
  const id = qv(req.query.account_id);
  if (!id) throw createHttpError(400, 'Missing query param: account_id');
  const acc = await getAccountByIdForMetaUsers(id, req.user.metaUserIds);
  if (!acc) throw createHttpError(404, 'Account not found for current user');
  if (!acc.ad_account_id || !acc.user_access_token) {
    throw createHttpError(400, 'Account has no ad account or token');
  }
  return acc;
}

export async function pagesHandler(req: ApiRequest, res: NextApiResponse): Promise<void> {
  const acc = await account(req);
  const data = await metaClient.getPages(acc.user_access_token as string);
  res.status(200).json({ data: data.data });
}

export async function pagePostsHandler(req: ApiRequest, res: NextApiResponse): Promise<void> {
  const acc = await account(req);
  const pageId = qv(req.query.id);
  if (!pageId) throw createHttpError(400, 'Missing page id');
  const data = await metaClient.getPromotablePosts(pageId, acc.user_access_token as string);
  res.status(200).json({ data: data.data });
}

export async function pixelsHandler(req: ApiRequest, res: NextApiResponse): Promise<void> {
  const acc = await account(req);
  const data = await metaClient.getAdPixels(acc.ad_account_id as string, acc.user_access_token as string);
  res.status(200).json({ data: data.data });
}

export async function audiencesHandler(req: ApiRequest, res: NextApiResponse): Promise<void> {
  const acc = await account(req);
  const [custom, saved] = await Promise.all([
    metaClient.getCustomAudiences(acc.ad_account_id as string, acc.user_access_token as string),
    metaClient.getSavedAudiences(acc.ad_account_id as string, acc.user_access_token as string),
  ]);
  res.status(200).json({ data: { custom: custom.data, saved: saved.data } });
}

export async function targetingSearchHandler(req: ApiRequest, res: NextApiResponse): Promise<void> {
  const acc = await account(req);
  const q = qv(req.query.q) || '';
  const type = qv(req.query.type) || 'adinterest';
  const data =
    type === 'adgeolocation'
      ? await metaClient.searchGeo(acc.user_access_token as string, q)
      : await metaClient.searchInterests(acc.user_access_token as string, q);
  res.status(200).json({ data: data.data });
}
