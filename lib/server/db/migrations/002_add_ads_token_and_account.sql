ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS user_access_token TEXT,
  ADD COLUMN IF NOT EXISTS ad_account_id TEXT,
  ADD COLUMN IF NOT EXISTS ad_account_name TEXT,
  ADD COLUMN IF NOT EXISTS ad_account_currency TEXT;
