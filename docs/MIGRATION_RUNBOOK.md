# Oni247 Migration Runbook

This runbook is intentionally staged. Do not skip gates or perform the production cutover until every required gate passes.

## Phase 0 — Preserve and baseline

- [x] Preserve the existing GitHub `main` branch.
- [x] Inspect repository tree and core database/auth/storage/payment modules.
- [x] Confirm the Cloudflare Pages placeholder exists.
- [x] Confirm no production deployment or domain is attached to that Pages project.
- [ ] Obtain the complete Floot source export after build-action points refresh.
- [ ] Compare export file count and paths against the live application.
- [ ] Export the Floot PostgreSQL database and media objects.
- [ ] Store encrypted backups outside the application repository.

**Gate:** Full source, database dump and media inventory are available and their checksums/counts are recorded.

## Phase 1 — Reconstruct a reproducible build

- [ ] Recover exact dependencies from the complete export and current runtime.
- [ ] Create a pinned `package.json` and lockfile.
- [ ] Add TypeScript and build configuration.
- [ ] Reproduce the current Floot route and endpoint behavior in a local standalone runtime.
- [ ] Replace generated platform routing with explicit route mapping.
- [ ] Run typecheck, unit tests and production build.
- [ ] Record any code changes required to make the export standalone.

**Gate:** The app builds and runs locally without Floot packages, services or environment variables.

## Phase 2 — Provision isolated infrastructure

- [ ] Create a new Supabase project named `oni247`; do not reuse OniVend or Warehouse.
- [ ] Select region using measured latency, availability and cost.
- [ ] Create schema migrations from the verified database dump; preserve existing data types and constraints.
- [ ] Create a dedicated application database role with least privilege.
- [ ] Design and test RLS for all tenant-owned tables.
- [ ] Create R2 bucket(s) for uploads and public delivery.
- [ ] Configure Hyperdrive with the verified Supabase connection string.
- [ ] Configure email provider and sender domain.
- [ ] Configure payment-provider secrets only when credentials and webhook URLs are confirmed.
- [ ] Configure separate preview and production secrets.

**Gate:** Database connection, migrations, RLS tests, storage upload and email test all pass in a non-production environment.

## Phase 3 — Replace platform services

- [ ] Replace `FLOOT_DATABASE_URL` with typed Hyperdrive binding.
- [ ] Verify Postgres.js/Kysely compatibility; do not retain `prepare: false` without a passing Hyperdrive integration test.
- [ ] Replace Floot session cookie and validate secure cookie behavior.
- [ ] Preserve user/password hashes or document a controlled password reset plan.
- [ ] Replace Floot email sending.
- [ ] Replace Floot media presigning with R2 authorization.
- [ ] Reconcile webhook idempotency and subscription activation.
- [ ] Add edge rate limits and CSRF/origin checks.
- [ ] Add request-scoped tenant context and RLS enforcement.

**Gate:** No Floot imports, environment variables, auth cookies, storage calls or runtime routing remain in the production dependency path.

## Phase 4 — Tenant and domain routing

- [ ] Keep `/store/{slug}` working.
- [ ] Configure the platform apex hostname.
- [ ] Configure wildcard DNS and certificate coverage for `{slug}.oni247.com`.
- [ ] Implement strict reserved-slug and host normalization rules.
- [ ] Add verified custom-domain registry and proof-of-control workflow if multiple custom domains are approved.
- [ ] Test pending, invalid, duplicate, expired and suspended domains.
- [ ] Verify all public routes serve only published content.

**Gate:** Hostname spoofing and cross-tenant access tests pass.

## Phase 5 — Data migration rehearsal

- [ ] Restore the Floot database dump into a staging Oni247 database.
- [ ] Copy media to R2 and compare object counts/checksums.
- [ ] Reconcile every table row count.
- [ ] Verify foreign keys, unique constraints, enum values and JSONB payloads.
- [ ] Verify money values exactly (no floating-point rounding).
- [ ] Verify user login and email recovery.
- [ ] Verify business slugs, images, orders, enquiries and subscription records.
- [ ] Remove demo rows only after confirming they are demo records and backups are secured.
- [ ] Run tenant-isolation and privilege-escalation tests.

**Gate:** Rehearsal has zero unexplained missing rows, broken media references or cross-tenant access.

## Phase 6 — Preview and production readiness

- [ ] Add GitHub CI for install, lint, typecheck, tests and build.
- [ ] Deploy preview Worker/static assets.
- [ ] Run the feature parity matrix against Floot and preview.
- [ ] Run load, rate-limit, abuse and recovery tests.
- [ ] Verify backup restoration and rollback.
- [ ] Review Cloudflare and Supabase plan limits/pricing before enabling paid customer traffic.
- [ ] Obtain final production cutover approval.

**Gate:** All critical tests pass; no P0/P1 defects; rollback is rehearsed.

## Phase 7 — Controlled cutover

- [ ] Freeze writes or establish a short final-delta migration window.
- [ ] Take final database and media backups.
- [ ] Import final database delta and media delta.
- [ ] Verify checksums and row counts.
- [ ] Switch DNS only after the new deployment passes smoke tests.
- [ ] Monitor errors, payment webhooks, login, upload, tenant routing and database health.
- [ ] Keep Floot available as rollback until the agreed stabilization period ends.
- [ ] Do not delete Floot data or hosting until explicit sign-off.

## Rollback triggers

Rollback to the old app if any of these occur:
- user accounts cannot authenticate reliably;
- customer data or media is missing or mapped to the wrong tenant;
- public storefronts resolve to the wrong business;
- subscription payments can be falsely activated, duplicated or lost;
- production error rate or latency exceeds the agreed threshold;
- database restore or data reconciliation cannot be completed.

Rollback means restore the old traffic path and preserve all new writes for reconciliation. Never simply discard the new database.
