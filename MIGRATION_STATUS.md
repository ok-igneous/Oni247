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
- Added Node/TypeScript project configuration and package manifest.
- Replaced the Floot database environment variable with required `DATABASE_URL`.
- Replaced the Floot session cookie name with `oni247_session`, aligned JWT expiry with the seven-day cookie lifetime, and made Secure cookie behavior environment-aware.
- Replaced the `@floot/storage` upload integration with an S3-compatible presigned-upload adapter.
- Added `.env.example`, local setup instructions and migration runbook.

## Not yet verified

No claim is made that the application currently builds or is production-ready. The next required work is:

1. Install dependencies and run TypeScript/build checks; resolve all missing dependencies and type errors.
2. Audit all application source files for remaining Floot SDK, URL, cookie, native-app and runtime assumptions.
3. Implement and validate the standalone database schema migration using an authorized database export; do not synthesize production schema or data.
4. Migrate existing uploaded media and replace legacy `/_cdn/` URLs.
5. Test authentication, registration, verification, password reset, tenant isolation, uploads, storefront, checkout, payment webhooks, email and all dashboard routes.
6. Add operational logging, security headers, rate limits, backup/restore and deployment configuration.

The new runtime is a first implementation, not a completed migration. Keep Floot production live until the full acceptance checklist passes.
