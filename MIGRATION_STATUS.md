# Oni247 source and standalone migration

## Source snapshot

- Source export inventory: 811 files.
- Files listed in the source export missing from the GitHub snapshot: 0 after transfer.
- A separate source snapshot branch is retained for recovery.
- Working branch: `standalone-migration`.
- The previous production environment and GitHub `main` have not been modified by standalone work.

The snapshot comparison verifies path coverage, not byte-for-byte content parity or runtime readiness.

## Standalone work started

- Added a Vite + React entry point and dynamic page/layout route loader.
- Added a Fastify server that discovers existing `endpoints/**` handlers and dispatches them under `/_api/**`.
- Preserved multiple `Set-Cookie` response headers in the Web `Response` to Fastify bridge, with a single-cookie fallback for older runtimes.
- Added graceful SIGINT/SIGTERM shutdown and closes the database pool after it has been initialized.
- Disabled blanket proxy-header trust; numeric trusted-proxy hop counts are parsed correctly; production HSTS is emitted by the application, so deployments must enforce HTTPS at the edge.
- Added Node/TypeScript project configuration and package manifest.
- Replaced the legacy database environment variable with required `DATABASE_URL`.
- Replaced the legacy session cookie name with `oni247_session`, aligned JWT expiry with the seven-day cookie lifetime, and made Secure cookie behavior environment-aware.
- Replaced the legacy upload SDK integration with an S3-compatible presigned-upload adapter.
- Added `.env.example`, local setup instructions, S3 storage configuration guide and migration runbook.
- Added a source audit script for remaining legacy package, database, cookie, CDN and native URL references.
- Migrated the existing Jasmine-style tests to Vitest and configured a jsdom test environment.

## Not yet verified

No claim is made that the application currently builds or is production-ready. The next required work is:

1. Install dependencies and run TypeScript/build checks; resolve all missing dependencies and type errors.
2. Audit all application source files for remaining legacy platform SDK, URL, cookie, native-app and runtime assumptions.
3. Implement and validate the standalone database schema migration using an authorized database export; do not synthesize production schema or data.
4. Migrate existing uploaded media and replace legacy `/_cdn/` URLs.
5. Test authentication, registration, verification, password reset, tenant isolation, uploads, storefront, checkout, payment webhooks, email and all dashboard routes.
6. Add operational logging, security headers, rate limits, backup/restore and deployment configuration.

The new runtime is a first implementation, not a completed migration. Keep previous production environment live until the full acceptance checklist passes.

## PostgreSQL RLS foundation (staged; not activated)

- Added `database/rls/migrations/001_enable_tenant_rls.sql` with tenant policies for business-owned tables inventoried in `helpers/schema.tsx`, parent-derived isolation for gallery images, and a deliberate exclusion of authentication tables pending a separate bootstrap-safe design.
- Added `database/rls/README.md` documenting runtime-role requirements, transaction-local identity context, public storefront separation, rollout order, and required isolation tests.
- Added `database/rls/tests/rls_smoke.sql` as a disposable-database smoke-test starting point.
- The SQL migration has **not** been applied to any database. It requires a real-schema comparison, a non-owner/non-BYPASSRLS runtime role, and application request transactions that set `app.user_id` with transaction-local `set_config(..., true)`.
- Added a request-scoped Kysely transaction boundary in `helpers/db.tsx`: authenticated API requests are resolved against the server-side session before endpoint execution, then `app.user_id` is set transaction-locally and existing `db` calls are routed through the same transaction using `AsyncLocalStorage`. This integration has not yet been typechecked or exercised under concurrent requests; do not apply RLS until those checks pass.
- The RLS migration remains unapplied. Public storefront, payment, webhook, email, login, and platform-admin flows still require explicit access-path review. Authentication tables remain outside this first migration to avoid a session-lookup bootstrap deadlock.
- Authenticated non-authentication endpoint response bodies are consumed inside the request transaction, preserving context for lazy response bodies. Authentication routes remain outside tenant context because they are bootstrap flows over auth tables excluded from RLS. Nested `db.transaction()` calls in authenticated business endpoints now use PostgreSQL savepoints on the active request transaction, but nested rollback behavior remains untested. Session JWT verification distinguishes invalid tokens from missing/invalid server signing configuration.
- Team invitation lookup now compares email addresses case-insensitively after activation, matching the normalized-email behavior of the invitation writer and SQL activation function.
- Tenant RLS no longer treats pending invitations as tenant members. A dedicated SECURITY DEFINER invitation activation function now requires the signed-in user's verified email and activates only one matching invitation; `requireOwnedBusiness` uses it only when `RLS_ENABLED=true`. Runtime execution grants and live-schema compatibility remain unverified.
- Added an explicit platform-administrator RLS path: `users.role = 'admin'` is checked through a fixed-search-path SECURITY DEFINER helper, and a separate business-row write policy permits platform moderation. Runtime grants and authorization tests remain outstanding.
- Added public storefront RLS policies for published businesses and published content (categories, products, testimonials, portfolio, blog, events, active forms, galleries/images, and showcases). Anonymous form/event submissions use a narrow INSERT check; public registration counts, duplicate checks, gateway-enabled status, and showcase view increments use SECURITY DEFINER helpers rather than exposing submissions or payment-gateway rows. Runtime EXECUTE grants and disposable-database policy tests remain outstanding.
- Removed public exposure of product `stockQuantity` from the storefront response and replaced its direct payment-gateway lookup with a boolean-only helper. Public event endpoints now retrieve aggregate counts and duplicate checks without reading submitted answers directly.
- Order payment retries now refuse to create a second hosted checkout while an existing gateway reference is still pending; a confirmed failed reference can be retried. This reduces duplicate-charge risk, but simultaneous first-time checkout requests can still race before a gateway reference is persisted and need an atomic payment-attempt claim before RLS rollout.
- Public storefront enquiries now execute through `app_private.submit_public_enquiry(...)`: the function resolves only a published business, serializes requests per business before checking the 30-per-hour cap, and inserts the enquiry atomically. The public endpoint no longer directly reads or inserts enquiry rows. Runtime EXECUTE grant and disposable PostgreSQL tests remain outstanding.
- Public order input now validates a supplied customer email address while preserving blank/omitted email compatibility for older non-online checkout flows; malformed email addresses are rejected before order creation. Added schema regression tests (committed, not executed locally).
- Added checkout variant regression coverage for missing/invalid choices and price override behavior. Product-save validation now rejects duplicate option name/value pairs case-insensitively, preventing ambiguous checkout resolution where the first matching stored option could determine the charged price. Tests are committed but have not been executed locally.
- Public checkout remains deliberately blocked under the staged RLS model. The existing handler reads product cost/stock/variant data, reserves stock, upserts customers, and inserts orders; the payment-return handler reads orders/customer email and accesses gateway secrets. Anonymous policies on these tables would be unsafe. The required next design is a narrow trusted order-creation operation that independently validates products/variants/prices, recomputes totals, reserves stock atomically, and inserts the customer/order, plus a minimal payment lookup/claim path and concurrency-safe checkout idempotency. PostgreSQL row-level policies do not hide sensitive columns such as product cost and stock from a role allowed to read the row. No order SECURITY DEFINER function or checkout policy is claimed as implemented.
- The smoke SQL is not a complete integration suite and has not been executed. No RLS build, database test, or production deployment is claimed.


## Cloudflare deployment review (2026-11-25)

- Selected the least-disruptive target: Node.js 22 + Fastify in Cloudflare Containers, fronted by a Worker/Durable Object proxy; PostgreSQL remains the system of record and R2 stores media. A direct Workers/Pages upload is not compatible with the current Node/filesystem/PostgreSQL runtime.
- Added `docs/CLOUDFLARE_DEPLOYMENT.md` with topology, domain model, security gates, prerequisites, release sequence and rollback plan.
- Updated `STANDALONE_MIGRATION.md` to reflect the Containers architecture.
- The connected Cloudflare account currently has no DNS zones configured. No domain binding or production DNS change was made.
- The branch has no package lockfile, Dockerfile, Worker/Container adapter or Cloudflare deployment configuration.
- No production database export/destination credentials or R2 credentials were available during this review.
- No build, typecheck, test suite, database migration, RLS activation, media migration or deployment has been performed in this review.
- The staged RLS design still blocks production rollout: checkout/payment requires narrow trusted database operations and concurrency-safe payment claims; bookings, comments/reactions and media upload access paths also need explicit policies/operations and tests.
- previous production environment and GitHub `main` remain untouched.

- Additional Cloudflare account inspection: no Workers scripts exist; no `workers.dev` subdomain has been initialized; R2 is not enabled on the account (Cloudflare returned the explicit dashboard-enablement requirement). These are account-setup blockers, not repository code defects.


## Standalone staging database initialisation (2026-11-27)

- Confirmed by the project owner that the new `oni247-staging-db` database is fresh and has no existing customer data to preserve.
- Added `database/migrations/001_initial_schema.sql`, defining the 41 application tables and 13 PostgreSQL enum types represented by the current generated Kysely schema.
- Applied the initial schema to the Neon staging database `oni247` using the dedicated `oni247_app` role. Verified 41 public application tables exist, including `platform_settings`.
- Added and applied `database/migrations/002_migration_ledger.sql`; the ledger records `001_initial_schema`.
- Ran a transactional platform-settings write/read/delete smoke check successfully.
- This is a source-derived baseline for the fresh standalone staging database, not a byte-for-byte restoration of the previous hosted database schema. No customer records or production data were copied or fabricated.
- RLS remains disabled. The staged RLS design still requires full policy, grants, tenant-isolation, public checkout/payment and concurrency tests before activation.
- Application-level route tests against the live Render service remain outstanding. In particular, confirm `GET /_api/landing` now returns HTTP 200 after the schema is present, then exercise registration, verification, business creation, storefront and checkout.
- The registration email-verification helper still contains a legacy Floot URL and must be corrected before standalone registration is accepted.


- Added the `schema_migrations` ledger and recorded both initial migration versions. A core relational smoke test successfully inserted and removed a temporary user, password record, session, business, category, product, customer and order; all temporary rows were removed.
- Replaced hardcoded Floot verification/reset links in registration, resend-verification and forgot-password handlers with `PUBLIC_APP_URL` (falling back to the incoming request origin). Configured Render staging with `PUBLIC_APP_URL=https://oni247-staging.onrender.com`.
- Render deploy `dep-dc4o9tui0phs73b0r8kg` was triggered for the auth URL correction. Its latest observed state was `build_in_progress`; completion and live endpoint checks must be confirmed before calling the staging release verified.

- Added `scripts/migrate.mjs` and the `npm run db:migrate` command. The runner applies numbered SQL files in order, records applied versions, and wraps each migration in a transaction. The runner itself has been reviewed but has not yet been executed from the Render runtime.


## Next.js App Router migration update (2026-11-28)

The active migration work is on `nextjs-app-router-migration` and tracked by draft PR #12. This update supersedes the earlier Vite/React Router compatibility-layer status described in the historical notes above.

- The branch tree contains 72 standard Next.js App Router route/layout/handler files.
- All 25 required route paths in `scripts/audit-nextjs-migration.mjs` are present.
- The `legacy-pages/` directory, `src/App.tsx`, `LegacyAppClient`, `LegacyAppRuntime`, legacy route registry generator, and legacy catch-all routes are absent from the branch tree.
- `react-router-dom`, `react-helmet`, and their legacy type package are absent from the package manifest.
- Custom `.next.tsx` route conventions and the custom Next.js page-extension override have been removed; route files use standard `page.tsx`, `layout.tsx`, and `route.ts` names.
- Native route components have replaced the legacy routing layer for dashboard, admin, authentication, storefront and public transaction/content flows.
- CI has not passed. The latest recorded GitHub Actions job terminated before recording any job steps; a retry also failed without step output. Treat verification as blocked, not passed. No production deploy, PR merge, or production cutover is authorized by this status update.


## Database startup safety (2026-11-28)

Removed the package `prestart` hook that executed SQL migrations automatically on every application start. The baseline schema migration uses non-idempotent `CREATE TYPE` and `CREATE TABLE` statements, so replaying it against an existing production database without a validated migration ledger could break deployment. Database migration is now an explicit operator action; do not run the baseline against the existing customer database.


## Source import audit update (2026-11-28)

A static relative-import audit was performed across the 72 App Router route/layout/handler files, the migrated dashboard and admin components, and the shared Next.js page components. It found and corrected:

- A missing theme-editor tabs stylesheet, restored into the Next.js dashboard component directory.
- An incorrect relative import for the business order-tracking page's Input component.
- Earlier tracking and password-reset component import-depth errors were also corrected.

The audited route and component files now resolve their relative imports against the branch tree. This is a static path check only; it does not replace TypeScript, Next.js build, or browser/runtime verification. The API proxy route uses the escaped `%5Fapi` folder name intentionally: Next.js treats a literal underscore-prefixed folder as private, while the escaped name exposes the public `/_api/*` route.


## Verification and runtime hardening update (2026-11-28)

- The production build command now runs `audit:nextjs` and `audit:project` before TypeScript and `next build`, so Render cannot build a branch that fails either architecture audit.
- The Next.js architecture audit now rejects direct Vite runtime dependencies/scripts, requires Next.js as a direct runtime dependency, rejects automatic `prestart` hooks, and checks custom-domain product/service/blog/gallery/event/booking routes.
- The repository tree contains no root Pages Router `pages/` directory, no Vite application entrypoint/config, no React Router/Helmet packages, no legacy page tree/runtime, and 72 standard App Router route/layout/handler files.
- The latest GitHub Actions job is marked failed but has no recorded steps or log URL. It failed before executing checkout, install, audit, tests, or build. The reason is not exposed by the available job record, so this cannot be treated as a source-code build failure or a passing verification. Do not merge until a runner executes the workflow successfully.
- Removed automatic SQL migration execution from `npm start`. The baseline migration is non-idempotent and must not be replayed against the existing customer database.
