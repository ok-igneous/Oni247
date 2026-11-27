# Oni247 source and standalone migration

## Source snapshot

- Source export inventory: 811 files.
- Files listed in the source export missing from the GitHub snapshot: 0 after transfer.
- A separate source snapshot branch is retained for recovery.
- Working branch: `standalone-migration`.
- The previous production environment and GitHub `main` have not been modified by standalone work.

The snapshot comparison verifies path coverage, not byte-for-byte content parity or runtime readiness.

## Standalone work started

- The original standalone baseline used a Vite + React entry point and dynamic page/layout route loader; this has now been replaced on the separate `nextjs-migration` branch.
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


## Next.js migration implementation (2026-11-27)

- Added `scripts/audit-nextjs-migration.mjs` to enumerate the existing page routes, detect route collisions, and identify Vite, React Router, React Helmet and browser-global dependencies across the application source.
- Updated `NEXTJS_MIGRATION.md`: Vite is explicitly not an approved development, build or production runtime for the completed migration. The route inventory must precede replacement of the dynamic route loader.
- The audit script has been committed but has **not yet been executed** against a checked-out working tree. No Next.js runtime or build has been claimed yet.


## Next.js architecture decision (2026-11-27)

- Owner approved migration from React/Vite to Next.js App Router with TypeScript.
- Cloudflare is not an approved provider or deployment target; provider-specific deployment plans are superseded and removed from the active plan.
- Preserve Node.js 22 + Fastify API handlers as a separate service during initial frontend migration; preserve PostgreSQL/Kysely and the existing HTTP-only session contract.
- Use provider-neutral S3-compatible object storage; do not change media provider, object keys or public URLs without a verified migration plan.
- Hosting provider remains undecided. Target portable Node.js deployment.
- Created isolated branch `nextjs-migration` from `main`; production and `main` remain untouched.
- The initial Next.js foundation is now implemented on `nextjs-migration`; typecheck, tests, production build and deployment are still unverified.


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


## Next.js migration implementation (2026-11-27)

- Added Next.js 16.4.6 App Router, root layout, optional catch-all route and a browser-only compatibility boundary for the existing interactive React app.
- Moved all 209 files from the root `pages/` directory to `legacy-pages/`. This is required because Next.js reserves root `pages/` for its Pages Router; leaving the legacy directory in place would make Next interpret unrelated component files as routes.
- Added a generated static import registry for 69 legacy page modules and 70 page-layout modules. The Vite `import.meta.glob()` route discovery was removed from `src/App.tsx`.
- Removed the Vite `index.html`, `vite.config.ts`, direct Vite dependency, Vite React plugin, and Vite web scripts. Development/build/start scripts now invoke Next.js. Vitest remains for the existing test suite; it is not the web runtime.
- Added a shared Node.js proxy helper and Next route handlers for same-origin `/_api/*`, `/sitemap.xml` and `/robots.txt`. It preserves the incoming host/protocol and multiple Set-Cookie headers when proxying to Fastify. Added regression tests for host/cookie forwarding and API-unavailable behavior; tests have not been run. The API must be private behind one trusted Next.js proxy hop; do not expose the API listener publicly with `TRUST_PROXY=1`.
- Split the local API port into `API_PORT` and added `API_ORIGIN` for the Next.js proxy. Fastify remains a separate service.
- Added Next.js Node route handlers for `/sitemap.xml` and `/robots.txt`; both use the runtime API proxy helper so `API_ORIGIN` is not baked into build-time rewrite configuration.
- **Not yet verified:** dependencies have not been installed; the route registry has not been generated in a checked-out workspace; TypeScript, unit tests, Next.js production build, custom-domain host forwarding, cookie forwarding, crawler SEO rendering and browser route parity have not been run. No staging deployment or production cutover has occurred.


- Fastify was converted to an API-only listener; the old Vite `dist/index.html` static fallback and crawler interception are no longer registered on the API service. The legacy crawler rendering modules remain in the repository as source material for the Next.js SEO migration, but are not active.
- Static GitHub tree validation after the page-directory move found 69 page modules, 70 layout modules, no route-name collisions, no root `pages/` directory, no `index.html` or `vite.config.ts`, and no direct `vite` dependency in `package.json`.
- Vitest remains temporarily as the test runner for the existing 19 tests. It is not used as the web development server or build system; replacing the test runner is a separate cleanup item if the requirement is to eliminate every transitive Vite package as well.
