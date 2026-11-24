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
- Disabled blanket proxy-header trust; production HSTS is emitted by the application, so deployments must enforce HTTPS at the edge.
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

- Added `database/rls/migrations/001_enable_tenant_rls.sql` with tenant policies for the business-owned tables inventoried in `helpers/schema.tsx`, parent-derived isolation for gallery images, and user scoping for sessions, auth tokens, passwords, and profiles.
- Added `database/rls/README.md` documenting runtime-role requirements, transaction-local identity context, public storefront separation, rollout order, and required isolation tests.
- Added `database/rls/tests/rls_smoke.sql` as a disposable-database smoke-test starting point.
- The SQL migration has **not** been applied to any database. It requires a real-schema comparison, a non-owner/non-BYPASSRLS runtime role, and application request transactions that set `app.user_id` with transaction-local `set_config(..., true)`.
- The current application still issues queries through a shared Kysely instance and has not yet been converted to a request-scoped transaction boundary. Applying RLS now would deny normal application requests. Public storefront, payment, webhook, email, login, and platform-admin flows also require separately designed policies or narrowly scoped service access.
- The smoke SQL is not a complete integration suite and has not been executed. No RLS build, database test, or production deployment is claimed.
