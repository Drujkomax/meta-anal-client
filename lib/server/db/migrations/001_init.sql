CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_meta_user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  page_id TEXT NOT NULL UNIQUE,
  instagram_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expiry TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_cache (
  id BIGSERIAL PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  metric TEXT NOT NULL,
  value JSONB NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, metric, date)
);

CREATE INDEX IF NOT EXISTS idx_analytics_cache_account_date
  ON analytics_cache (account_id, date DESC);
