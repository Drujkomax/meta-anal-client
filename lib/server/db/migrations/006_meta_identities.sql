CREATE TABLE IF NOT EXISTS meta_identities (
  meta_user_id TEXT PRIMARY KEY,
  meta_user_name TEXT,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_oauth_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Backfill existing distinct owners as active identities
INSERT INTO meta_identities (meta_user_id, meta_user_name)
SELECT DISTINCT owner_meta_user_id, 'Legacy User ' || owner_meta_user_id
FROM accounts
ON CONFLICT (meta_user_id) DO NOTHING;

-- Add business columns to accounts
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS business_id TEXT,
  ADD COLUMN IF NOT EXISTS business_name TEXT;
