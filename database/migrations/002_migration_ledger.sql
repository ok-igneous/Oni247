-- Migration ledger for the standalone Oni247 database.
BEGIN;
CREATE TABLE schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO schema_migrations(version) VALUES ('001_initial_schema');
COMMIT;
