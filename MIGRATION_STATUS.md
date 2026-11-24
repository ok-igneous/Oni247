# Oni247 source and standalone migration

## Source snapshot

- Floot source inventory: 811 files.
- Floot-listed files missing from the GitHub snapshot: 0 after transfer.
- Source snapshot branch: `floot-source-snapshot-2026-11-21`.
- Working branch: `standalone-migration`.
- Floot production and GitHub `main` have not been modified by standalone work.

The snapshot comparison verifies path coverage, not byte-for-byte content parity or runtime readiness.

## Standalone work started

- Added a Vite + React entry point and dynamic page/layout route loader.
- Added a Fastify server that discovers existing `endpoints/**` handlers and dispatches them under `/_api/**`.
- Preserved multiple `Set-Cookie` response headers in the Web `Response` to Fastify bridge, with a single-cookie fallback for older runtimes.
- Added graceful SIGINT/SIGTERM shutdown and closes the database pool after it has been initialized.
- Disabled blanket proxy-header trust; numeric trusted-proxy hop counts are parsed correctly; production HSTS is emitted by the application, so deployments must enforce HTTPS at the edge.
- Added Node/TypeScript project configuration and package manifest.
- Replaced the Floot database environment variable with required `DATABASE_URL`.
- Replaced the Floot session cookie name with `oni247_session`, aligned JWT expiry with the seven-day cookie lifetime, and made Secure cookie behavior environment-aware.
- Replaced the `@floot/storage` upload integration with an S3-compatible presigned-upload adapter.
- Added `.env.example`, local setup instructions, S3 storage configuration guide and migration runbook.
- Added a source audit script for remaining Floot package, database, cookie, CDN and native URL references.
- Migrated the existing Jasmine-style tests to Vitest and configured a jsdom test environment.

## Not yet verified

No claim is made that the application currently builds or is production-ready. The next required work is:

1. Install dependencies and run TypeScript/build checks; resolve all missing dependencies and type errors.
2. Audit all application source files for remaining Floot SDK, URL, cookie, native-app and runtime assumptions.
3. Implement and validate the standalone database schema migration using an authorized database export; do not synthesize production schema or data.
4. Migrate existing uploaded media and replace legacy `/_cdn/` URLs.
5. Test authentication, registration, verification, password reset, tenant isolation, uploads, storefront, checkout, payment webhooks, email and all dashboard routes.
6. Add operational logging, security headers, rate limits, backup/restore and deployment configuration.

The new runtime is a first implementation, not a completed migration. Keep Floot production live until the full acceptance checklist passes.

## PostgreSQL RLS foundation (staged; not activated)

- Added `database/rls/migrations/001_enable_tenant_rls.sql` with tenant policies for business-owned tables inventoried in `helpers/schema.tsx`, parent-derived isolation for gallery images, and a deliberate exclusion of authentication tables pending a separate bootstrap-safe design.
- Added `database/rls/README.md` documenting runtime-role requirements, transaction-local identity context, public storefront separation, rollout order, and required isolation tests.
- Added `database/rls/tests/rls_smoke.sql` as a disposable-database smoke-test starting point.
- The SQL migration has **not** been applied to any database. It requires a real-schema comparison, a non-owner/non-BYPASSRLS runtime role, and application request transactions that set `app.user_id` with transaction-local `set_config(..., true)`.
- Added a request-scoped Kysely transaction boundary in `helpers/db.tsx`: authenticated API requests are resolved against the server-side session before endpoint execution, then `app.user_id` is set transaction-locally and existing `db` calls are routed through the same transaction using `AsyncLocalStorage`. This integration has not yet been typechecked or exercised under concurrent requests; do not apply RLS until those checks pass.
- The RLS migration remains unapplied. Public storefront, payment, webhook, email, login, and platform-admin flows still require explicit access-path review. Authentication tables remain outside this first migration to avoid a session-lookup bootstrap deadlock.
- Authenticated non-authentication endpoint response bodies are consumed inside the request transaction, preserving context for lazy response bodies. Authentication routes remain outside tenant context because auth tables are excluded from RLS and several auth handlers open their own Kysely transactions; nested transaction behavior on the request proxy is not supported. Session JWT verification distinguishes invalid tokens from missing/invalid server signing configuration.
- Team invitation lookup now compares email addresses case-insensitively after activation, matching the normalized-email behavior of the invitation writer and SQL activation function.
- Tenant RLS no longer treats pending invitations as tenant members. A dedicated SECURITY DEFINER invitation activation function now requires the signed-in user's verified email and activates only one matching invitation; `requireOwnedBusiness` uses it only when `RLS_ENABLED=true`. Runtime execution grants and live-schema compatibility remain unverified.
- The smoke SQL is not a complete integration suite and has not been executed. No RLS build, database test, or production deployment is claimed.
