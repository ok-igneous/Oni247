# Oni247 standalone application

Oni247 is a standalone application. The current migration target is Next.js App Router with Fastify retained as a private API service. Keep the live application unchanged until the replacement has passed acceptance tests and cutover is explicitly approved.

## Runtime architecture

- Web: Next.js App Router, React 19, Node.js 22.
- API: Fastify 5, API-only; no static frontend serving.
- Compatibility: React Router pages remain temporarily available through a client-only Next.js fallback for routes not yet migrated.
- Database: PostgreSQL through Kysely and postgres.js.
- Object storage: S3-compatible object storage.
- Sessions: signed JWT in an HTTP-only `oni247_session` cookie.
- API listener: private loopback by default, port 3001. Next.js owns the public hosting `PORT`.
- Proxy trust: Fastify trusts one hop only when reached through the private Next.js proxy. Do not expose the API listener publicly with `TRUST_PROXY=1`.

## Canonical storefront URL policy

- Platform vanity URLs use `https://oni247.org/{slug}`.
- `/store/{slug}` is not supported and must return 404.
- Do not create business subdomains under `oni247.org`.
- Custom domains are resolved only when ownership is verified and the business has an active paid subscription. A trial or expired subscription is insufficient.

## Local development

1. Install Node.js 22 or newer and PostgreSQL.
2. Copy `.env.example` to `.env` and configure database, JWT, and S3 values.
3. Install dependencies with `npm install`.
4. Apply database schema/migrations to a disposable development database.
5. Run `npm run dev`; Next.js serves the web app on port 3000 and Fastify listens privately on port 3001.
6. Run `npm run audit:standalone`, `npm run typecheck`, `npm test`, and `npm run build` before proposing a release.

Vite has been removed from the web development and production build path. The legacy route registry is generated as static imports before development/build/typecheck. Vitest is still used for tests and brings Vite transitively as a development-only dependency; the application does not use Vite as its web runtime.

## Next.js migration status

- Native App Router routes exist for the platform landing page, authentication pages, dashboard overview, business vanity storefronts, public product/blog/service/gallery/event details, service booking, booking confirmation and order tracking.
- Unmigrated dashboard/editor and storefront listing sections use the temporary client-only compatibility route. Booking, tracking and checkout have native Next.js routes.
- Fastify is API-only. Next.js proxies `/_api/*`, sitemap, robots, health and readiness requests to the private API.
- The old crawler-only Vite HTML renderer and Fastify static SPA fallback are no longer part of the runtime.
- The root `pages/` directory remains as source for legacy React Router components. All old `store.$slug.*` route modules have been removed; the shared storefront component is `pages/StorefrontPage.tsx` and is imported by the canonical `pages/$slug.tsx` vanity route.

## Database security / RLS

The staged PostgreSQL RLS foundation and rollout requirements are documented in [database/rls/README.md](./database/rls/README.md). Do not apply its migration until request-scoped transaction context is implemented, a non-owner runtime role is provisioned, the actual database schema is compared, and all public/system access paths are covered. Applying the migration before those prerequisites can block normal application access. It has not been applied to production or any database.

## Release safety

No successful dependency installation, full typecheck, full test run, production build, database migration or browser acceptance run is claimed for this migration branch. Do not claim otherwise.

Do not configure production DNS, move customer traffic, change payment webhooks, or delete the previous application/database/media until staging passes end-to-end tests and the user explicitly approves cutover.
