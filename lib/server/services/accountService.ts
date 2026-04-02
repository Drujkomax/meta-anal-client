import dayjs from 'dayjs';
import { query } from '../config/db';

export interface AccountRecord {
  id: string;
  owner_meta_user_id: string;
  name: string;
  page_id: string | null;
  instagram_id: string | null;
  access_token: string | null;
  user_access_token: string | null;
  ad_account_id: string | null;
  ad_account_name: string | null;
  ad_account_currency: string | null;
  business_id: string | null;
  business_name: string | null;
  refresh_token: string | null;
  token_expiry: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined fields
  identity_name?: string | null;
}

export interface UpsertAccountInput {
  ownerMetaUserId: string;
  name: string;
  userAccessToken: string;
  adAccountId: string;
  adAccountName?: string | null;
  adAccountCurrency?: string | null;
  businessId?: string | null;
  businessName?: string | null;
  refreshToken?: string | null;
  tokenExpiry?: Date | null;
}

export async function upsertAccounts(inputs: UpsertAccountInput[]): Promise<AccountRecord[]> {
  const results: AccountRecord[] = [];

  for (const account of inputs) {
    const rows = await query<AccountRecord>(
      `
        INSERT INTO accounts (
          owner_meta_user_id,
          name,
          page_id,
          instagram_id,
          access_token,
          user_access_token,
          ad_account_id,
          ad_account_name,
          ad_account_currency,
          business_id,
          business_name,
          refresh_token,
          token_expiry
        )
        VALUES ($1, $2, NULL, NULL, NULL, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (owner_meta_user_id, ad_account_id)
        DO UPDATE SET
          name = EXCLUDED.name,
          user_access_token = EXCLUDED.user_access_token,
          ad_account_name = EXCLUDED.ad_account_name,
          ad_account_currency = EXCLUDED.ad_account_currency,
          business_id = EXCLUDED.business_id,
          business_name = EXCLUDED.business_name,
          refresh_token = EXCLUDED.refresh_token,
          token_expiry = EXCLUDED.token_expiry,
          updated_at = NOW()
        RETURNING *
      `,
      [
        account.ownerMetaUserId,
        account.name,
        account.userAccessToken,
        account.adAccountId,
        account.adAccountName ?? null,
        account.adAccountCurrency ?? null,
        account.businessId ?? null,
        account.businessName ?? null,
        account.refreshToken ?? null,
        account.tokenExpiry ?? null,
      ],
    );

    results.push(rows[0]);
  }

  return results;
}

export async function listAccountsByMetaUsers(metaUserIds: string[]): Promise<AccountRecord[]> {
  if (!metaUserIds.length) {
    return [];
  }

  return query<AccountRecord>(
    `
      SELECT a.*, i.meta_user_name as identity_name
      FROM accounts a
      JOIN meta_identities i ON a.owner_meta_user_id = i.meta_user_id
      WHERE a.owner_meta_user_id = ANY($1::text[])
        AND a.ad_account_id IS NOT NULL
        AND i.is_active = true
      ORDER BY a.name ASC
    `,
    [metaUserIds],
  );
}

export async function upsertMetaIdentity(metaUserId: string, metaUserName: string): Promise<void> {
  await query(
    `
      INSERT INTO meta_identities (meta_user_id, meta_user_name, connected_at, last_oauth_at, is_active)
      VALUES ($1, $2, NOW(), NOW(), true)
      ON CONFLICT (meta_user_id)
      DO UPDATE SET
        meta_user_name = EXCLUDED.meta_user_name,
        last_oauth_at = NOW(),
        is_active = true
    `,
    [metaUserId, metaUserName]
  );
}

export async function getAccountByIdForMetaUsers(
  accountId: string,
  metaUserIds: string[],
): Promise<AccountRecord | null> {
  if (!metaUserIds.length) {
    return null;
  }

  const rows = await query<AccountRecord>(
    `
      SELECT *
      FROM accounts
      WHERE id = $1
        AND owner_meta_user_id = ANY($2::text[])
        AND ad_account_id IS NOT NULL
      LIMIT 1
    `,
    [accountId, metaUserIds],
  );

  return rows[0] ?? null;
}

export async function listAllAccounts(): Promise<AccountRecord[]> {
  return query<AccountRecord>(
    `
      SELECT *
      FROM accounts
      WHERE ad_account_id IS NOT NULL
      ORDER BY created_at DESC
    `,
  );
}

export function getApproxTokenExpiryFromSeconds(expiresInSeconds: number): Date {
  return dayjs().add(expiresInSeconds, 'second').toDate();
}
