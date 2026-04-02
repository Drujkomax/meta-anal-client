-- ============================================================
-- Migration 004: Persistent analytics storage
--
-- Creates the core metrics table for storing daily ad performance
-- data pulled from Meta Marketing API, plus a sync log to track
-- polling state per account.
--
-- Designed for TimescaleDB compatibility — the daily_ad_metrics
-- table can be converted to a hypertable on (date) if needed.
-- ============================================================

-- ============================================================
-- 1. DAILY AD METRICS — core fact table
-- ============================================================
-- Stores one row per (account, campaign, adset, ad, date).
-- Adset/ad columns are nullable to support campaign-level rollups.
CREATE TABLE IF NOT EXISTS daily_ad_metrics (
  id              BIGSERIAL PRIMARY KEY,
  account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  ad_account_id   TEXT NOT NULL,

  -- Ad hierarchy identifiers
  campaign_id     TEXT NOT NULL,
  campaign_name   TEXT NOT NULL DEFAULT '',
  adset_id        TEXT,
  adset_name      TEXT,
  ad_id           TEXT,
  ad_name         TEXT,

  -- Time dimension
  date            DATE NOT NULL,

  -- Delivery metrics
  spend           NUMERIC(14,4) NOT NULL DEFAULT 0,
  impressions     BIGINT NOT NULL DEFAULT 0,
  reach           BIGINT NOT NULL DEFAULT 0,
  clicks          BIGINT NOT NULL DEFAULT 0,
  unique_clicks   BIGINT NOT NULL DEFAULT 0,

  -- Computed / returned by API
  ctr             NUMERIC(8,4) DEFAULT 0,
  cpc             NUMERIC(12,4) DEFAULT 0,
  cpm             NUMERIC(12,4) DEFAULT 0,
  frequency       NUMERIC(8,4) DEFAULT 0,

  -- Conversions & ROAS (stored as JSONB for flexibility)
  -- Each element looks like: { "action_type": "purchase", "value": "12" }
  actions         JSONB DEFAULT '[]',
  action_values   JSONB DEFAULT '[]',
  cost_per_action JSONB DEFAULT '[]',
  purchase_roas   JSONB DEFAULT '[]',

  -- Currency of the ad account for this row
  currency        TEXT NOT NULL DEFAULT 'USD',

  -- Sync metadata
  synced_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The natural key: one row per entity per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_dam_natural_key
  ON daily_ad_metrics (account_id, campaign_id, COALESCE(adset_id, ''), COALESCE(ad_id, ''), date);

-- Indexes optimised for dashboard queries
CREATE INDEX IF NOT EXISTS idx_dam_account_date
  ON daily_ad_metrics (account_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_dam_ad_account_date
  ON daily_ad_metrics (ad_account_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_dam_campaign_date
  ON daily_ad_metrics (campaign_id, date DESC);

-- ============================================================
-- 2. SYNC LOG — tracks polling state per account
-- ============================================================
CREATE TABLE IF NOT EXISTS sync_log (
  id              BIGSERIAL PRIMARY KEY,
  account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  sync_type       TEXT NOT NULL DEFAULT 'full',       -- 'full' | 'incremental'
  status          TEXT NOT NULL DEFAULT 'running',     -- 'running' | 'completed' | 'failed'
  date_from       DATE,                                -- range that was synced
  date_to         DATE,
  rows_synced     INTEGER NOT NULL DEFAULT 0,
  error_message   TEXT,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sync_log_account
  ON sync_log (account_id, started_at DESC);

-- ============================================================
-- 3. Clean up legacy table that was never used in code
-- ============================================================
DROP TABLE IF EXISTS analytics_cache;
