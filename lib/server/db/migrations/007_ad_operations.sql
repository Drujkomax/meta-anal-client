CREATE TABLE IF NOT EXISTS ad_operations (
  id              BIGSERIAL PRIMARY KEY,
  account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  meta_user_id    TEXT NOT NULL,
  operation_type  TEXT NOT NULL,
  level           TEXT,
  meta_object_id  TEXT,
  request_payload JSONB,
  response        JSONB,
  status          TEXT NOT NULL DEFAULT 'pending',
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_operations_account
  ON ad_operations (account_id, created_at DESC);
