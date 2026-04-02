ALTER TABLE accounts
  ALTER COLUMN page_id DROP NOT NULL,
  ALTER COLUMN instagram_id DROP NOT NULL,
  ALTER COLUMN access_token DROP NOT NULL;

DELETE FROM accounts a
USING accounts b
WHERE a.id > b.id
  AND a.owner_meta_user_id = b.owner_meta_user_id
  AND a.ad_account_id IS NOT NULL
  AND b.ad_account_id IS NOT NULL
  AND a.ad_account_id = b.ad_account_id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'accounts_owner_meta_user_id_ad_account_id_key'
  ) THEN
    ALTER TABLE accounts
      ADD CONSTRAINT accounts_owner_meta_user_id_ad_account_id_key
      UNIQUE (owner_meta_user_id, ad_account_id);
  END IF;
END $$;
