import type { NextApiResponse } from 'next';
import { listAccountsByMetaUsers } from '../../services/accountService';
import { createHttpError, type ApiRequest } from '../http';

export async function listAccountsHandler(req: ApiRequest, res: NextApiResponse): Promise<void> {
  if (!req.user) {
    throw createHttpError(401, 'Authentication required');
  }

  const accounts = await listAccountsByMetaUsers(req.user.metaUserIds);

  res.status(200).json({
    data: accounts.map((account) => ({
      id: account.id,
      name: account.name,
      ad_account_id: account.ad_account_id,
      ad_account_name: account.ad_account_name,
      ad_account_currency: account.ad_account_currency,
    })),
  });
}
