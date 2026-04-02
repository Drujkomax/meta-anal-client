-- ============================================================
-- Migration 005: Campaign hierarchy metadata tables
--
-- Stores entity metadata (status, objective, budgets, targeting)
-- separately from daily_ad_metrics which holds performance data.
-- The explorer JOINs these for a full picture.
-- ============================================================

-- 1. CAMPAIGN METADATA
CREATE TABLE IF NOT EXISTS campaign_metadata (
  id                BIGSERIAL PRIMARY KEY,
  meta_campaign_id  TEXT NOT NULL,
  account_id        UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name              TEXT NOT NULL DEFAULT '',
  objective         TEXT DEFAULT '',
  status            TEXT DEFAULT 'UNKNOWN',
  effective_status  TEXT DEFAULT 'UNKNOWN',
  daily_budget      NUMERIC(14,2) DEFAULT 0,
  lifetime_budget   NUMERIC(14,2) DEFAULT 0,
  start_time        TIMESTAMPTZ,
  stop_time         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cm_account_campaign
  ON campaign_metadata (account_id, meta_campaign_id);

CREATE INDEX IF NOT EXISTS idx_cm_status
  ON campaign_metadata (account_id, effective_status);

-- 2. ADSET METADATA
CREATE TABLE IF NOT EXISTS adset_metadata (
  id                  BIGSERIAL PRIMARY KEY,
  meta_adset_id       TEXT NOT NULL,
  meta_campaign_id    TEXT NOT NULL,
  account_id          UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name                TEXT NOT NULL DEFAULT '',
  optimization_goal   TEXT DEFAULT '',
  billing_event       TEXT DEFAULT '',
  daily_budget        NUMERIC(14,2) DEFAULT 0,
  bid_amount          NUMERIC(14,4) DEFAULT 0,
  targeting           JSONB DEFAULT '{}',
  status              TEXT DEFAULT 'UNKNOWN',
  effective_status    TEXT DEFAULT 'UNKNOWN',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_am_account_adset
  ON adset_metadata (account_id, meta_adset_id);

CREATE INDEX IF NOT EXISTS idx_am_campaign
  ON adset_metadata (account_id, meta_campaign_id);

-- 3. AD METADATA
CREATE TABLE IF NOT EXISTS ad_metadata (
  id                  BIGSERIAL PRIMARY KEY,
  meta_ad_id          TEXT NOT NULL,
  meta_adset_id       TEXT NOT NULL,
  meta_campaign_id    TEXT NOT NULL,
  account_id          UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name                TEXT NOT NULL DEFAULT '',
  status              TEXT DEFAULT 'UNKNOWN',
  effective_status    TEXT DEFAULT 'UNKNOWN',
  creative_id         TEXT,
  creative_name       TEXT,
  creative_thumbnail  TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_adm_account_ad
  ON ad_metadata (account_id, meta_ad_id);

CREATE INDEX IF NOT EXISTS idx_adm_adset
  ON ad_metadata (account_id, meta_adset_id);

CREATE INDEX IF NOT EXISTS idx_adm_campaign
  ON ad_metadata (account_id, meta_campaign_id);
