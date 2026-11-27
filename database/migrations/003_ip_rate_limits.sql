-- PostgreSQL-backed IP rate limiting. Raw client IPs are never stored.
BEGIN;
CREATE TABLE IF NOT EXISTS request_rate_limits (
  key_hash TEXT PRIMARY KEY,
  window_started_at TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL CHECK (request_count > 0),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS request_rate_limits_expires_idx ON request_rate_limits(expires_at);
COMMIT;
