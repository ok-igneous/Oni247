# Oni247 standalone application

The official development branch is `main`. The repository is independent of the previous website-builder runtime. Keep the existing live application unchanged until a replacement deployment has passed acceptance tests and a cutover is explicitly approved.

## Runtime today

- Frontend: React 19 + Vite + React Router.
- Backend: Node.js 22 + Fastify.
- API: endpoint handlers under `endpoints/**`, currently discovered at runtime by filesystem traversal and exposed under `/_api/**`.
- Database: PostgreSQL through Kysely and postgres.js.
- Object storage: S3-compatible storage; Cloudflare R2 is supported.
- Sessions: signed JWT in an HTTP-only `oni247_session` cookie.
- Reverse-proxy headers are untrusted by default; set `TRUST_PROXY` only to the verified proxy hop count behind a trusted proxy.

## Local development

1. Install Node.js 22 or newer and PostgreSQL.
2. Copy `.env.example` to `.env` and configure database, JWT, and S3 values.
3. Install dependencies with `npm install`.
4. Apply the database schema/migrations to a disposable development database.
5. Run `npm run dev`; Vite serves the frontend on port 5173 and proxies API requests to Fastify on port 3001.
6. Run `npm run audit:standalone`, `npm run typecheck`, `npm test`, and `npm run build` before proposing a release.

## Cloudflare target

The current deployment plan is a free-first **Cloudflare Worker with Workers Static Assets**, **Hyperdrive** for PostgreSQL, and the existing R2 bucket `oni247-media`.

The existing Fastify server is not directly deployable as a Worker. Required migration work includes:
- Replace runtime filesystem endpoint discovery and dynamic imports with a deterministic build-time manifest using static imports.
- Add a typed adapter for Worker environment bindings and secrets.
- Adapt the database layer to Hyperdrive and validate the existing request-scoped RLS transaction context.
- Remove the current `prepare: false` Postgres.js setting for Hyperdrive compatibility and test driver behavior.
- Move platform authentication/system email away from SMTP/Nodemailer to a supported HTTPS email provider.
- Validate R2 upload signing, CORS and public asset delivery in the Worker runtime.
- Port health/readiness, crawler storefront rendering, sitemap and robots routes.

Cloudflare account review on 2026-11-25 found:
- Pages project `oni247` exists at `oni247.pages.dev`, but has no deployment or build configuration. Leave it untouched while the Worker target is developed.
- R2 bucket `oni247-media` exists.
- No DNS zones are configured in the connected account.
- No Worker scripts are deployed.
- Container access is unavailable without Workers Paid; do not make Containers the target unless a paid upgrade is explicitly approved.

Hyperdrive is documented as available on Workers Free with a limit of 100,000 database statements per day. Confirm current Worker CPU/request limits and all service pricing before production. See [the Cloudflare deployment plan](./docs/CLOUDFLARE_DEPLOYMENT.md) for the topology, compatibility requirements, security gates and phased execution.

## Database security / RLS

The staged PostgreSQL RLS foundation and rollout requirements are documented in [database/rls/README.md](./database/rls/README.md). Do not apply its migration until request-scoped transaction context is implemented, a non-owner runtime role is provisioned, the actual database schema is compared, and all public/system access paths are covered. Applying the migration before those prerequisites can block normal application access. It has not been applied to production or any database.

## Release safety

No successful full build, typecheck, integration test, database migration or Cloudflare deployment has yet been established by these documents. Do not claim otherwise.

Do not configure production DNS, move customer traffic, change payment webhooks, or delete the previous application/database/media until the Worker staging deployment passes end-to-end tests and the user explicitly approves cutover.
