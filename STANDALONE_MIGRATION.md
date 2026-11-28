# Oni247 standalone application

Oni247 is a standalone application. The migration target is a native Next.js App Router frontend with Fastify retained as a private API service. Keep the existing production application live until the replacement passes acceptance tests and cutover is explicitly approved.

## Runtime architecture

- Web: Next.js App Router, React 19, Node.js 22.
- API: Fastify 5, API-only; no static frontend serving.
- Routing: native Next.js App Router only. No React Router, BrowserRouter, compatibility runtime, generated route registry, or legacy-page fallback.
- Database: PostgreSQL through Kysely and postgres.js.
- Object storage: S3-compatible object storage.
- Sessions: signed JWT in an HTTP-only `oni247_session` cookie.
- API listener: private loopback by default, port 3001. Next.js owns the public hosting `PORT`.
- Proxy trust: Fastify trusts one hop only when reached through the private Next.js proxy. Do not expose the API listener publicly with `TRUST_PROXY=1`.

## Canonical storefront URL policy

- Platform vanity URLs use `https://oni247.org/{slug}`.
- `/store/{slug}` is not supported and returns 404.
- Do not create business subdomains under `oni247.org`.
- Custom domains are resolved only when ownership is verified and the business has an active paid subscription. A trial or expired subscription is insufficient.

## Local development

1. Install Node.js 22 or newer and PostgreSQL.
2. Copy `.env.example` to `.env` and configure database, JWT, and S3 values.
3. Install dependencies with `npm install`.
4. Apply database schema/migrations to a disposable development database.
5. Run `npm run dev`; Next.js serves the web app on port 3000 and Fastify listens privately on port 3001.
6. Run `npm run audit:nextjs`, `npm run audit:project`, `npm run typecheck`, `npm test`, and `npm run build`.

## Next.js migration status

- The migration branch contains 72 standard App Router route/layout/handler files.
- The architecture audit checks for React Router, React Helmet, legacy-page imports, legacy runtime references, compatibility rewrites, and non-standard route filenames.
- The old `legacy-pages/` tree, `src/App.tsx`, `LegacyAppClient`, `LegacyAppRuntime`, generated legacy route registry, and legacy catch-all routes are removed on the migration branch.
- Dashboard and admin sections have native App Router routes; public storefront, product, service, blog, gallery, event, form, booking, payment, authentication and tracking paths are also represented as native routes.
- Fastify remains the API service. Next.js owns web routes and proxies `/_api/*`, sitemap, robots, health and readiness requests to the private API.
- This is source-level migration status, not a claim that every user journey has passed runtime acceptance testing.

## Database security / RLS

The staged PostgreSQL RLS foundation and rollout requirements are documented in [database/rls/README.md](database/rls/README.md). Do not apply its migration until request-scoped transaction context is implemented, a non-owner runtime role is provisioned, the actual database schema is compared, and all public/system access paths are covered. Applying the migration before those prerequisites can block normal application access. It has not been applied to production.

## Release safety

The latest observed GitHub Actions verification attempt failed before any job steps were recorded. This is not a passing build and does not establish a source-code failure; the workflow must run successfully before merge. No successful dependency installation, full typecheck, full test run, production build, or browser acceptance run is claimed for this migration branch.

Do not configure production DNS, move customer traffic, change payment webhooks, or delete the previous application/database/media until staging passes end-to-end tests and the user explicitly approves cutover.
