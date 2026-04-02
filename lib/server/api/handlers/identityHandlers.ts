import type { NextApiResponse } from 'next';
import { query } from '../../config/db';
import { setSessionCookie } from '../auth';
import { createHttpError, type ApiRequest } from '../http';

interface IdentityRow {
  meta_user_id: string;
  meta_user_name: string | null;
  connected_at: string;
  account_count: number;
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

export async function getIdentitiesHandler(req: ApiRequest, res: NextApiResponse): Promise<void> {
  if (!req.user || req.user.metaUserIds.length === 0) {
    res.status(200).json({ data: [] });
    return;
  }

  const rows = await query<IdentityRow>(
    `
      SELECT m.meta_user_id, m.meta_user_name, m.connected_at, COUNT(a.id)::int as account_count
      FROM meta_identities m
      LEFT JOIN accounts a
        ON a.owner_meta_user_id = m.meta_user_id
        AND a.ad_account_id IS NOT NULL
      WHERE m.meta_user_id = ANY($1::text[])
        AND m.is_active = true
      GROUP BY m.meta_user_id
      ORDER BY m.meta_user_name ASC
    `,
    [req.user.metaUserIds],
  );

  res.status(200).json({ data: rows });
}

export async function disconnectIdentityHandler(req: ApiRequest, res: NextApiResponse): Promise<void> {
  if (!req.user) {
    throw createHttpError(401, 'Authentication required');
  }

  const identityId = getParamId(req.query.id);
  if (!identityId || !req.user.metaUserIds.includes(identityId)) {
    throw createHttpError(403, 'Identity not found or unauthorized');
  }

  await query(
    `UPDATE meta_identities SET is_active = false WHERE meta_user_id = $1`,
    [identityId],
  );

  const remainingIds = req.user.metaUserIds.filter((id) => id !== identityId);
  const activeMetaUserId =
    req.user.metaUserId === identityId
      ? (remainingIds.length > 0 ? remainingIds[0] : '')
      : req.user.metaUserId;

  setSessionCookie(res, {
    metaUserIds: remainingIds,
    activeMetaUserId,
    name: req.user.name,
  });

  res.status(200).json({ ok: true });
}
