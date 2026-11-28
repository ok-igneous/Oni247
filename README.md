# Oni247

Oni247 is an independent website and storefront platform.

## Runtime architecture

- **Web:** Next.js App Router and React 19 own all frontend rendering, routing, metadata and production builds.
- **API:** Fastify 5 is a private API-only service. It does not serve frontend pages or static SPA fallbacks.
- **Database:** PostgreSQL through Kysely and postgres.js.
- **Sessions:** signed JWT in an HTTP-only `oni247_session` cookie.
- **Storage:** S3-compatible object storage.
- **Runtime:** Node.js 22 or newer.

React Router, the legacy page runtime, the generated legacy route registry, and the old `legacy-pages/` source tree have been removed from the Next.js migration branch. Vitest is the test runner; any transitive Vite package is test-tooling only, not an application runtime.

## Canonical storefront URLs

- Platform storefronts: `https://oni247.org/{slug}` (for example, `https://oni247.org/nesmage`).
- `/store/{slug}` is not a supported route and returns 404.
- Unknown root-level slugs return 404.
- Verified custom domains serve the storefront on their own domain and require an active paid subscription.

## Local development

```bash
cp .env.example .env
npm install
npm run dev
```

Next.js runs on port 3000. Fastify listens privately on 127.0.0.1:3001 and is reached through Next.js API proxy routes. Configure PostgreSQL `DATABASE_URL`, a 32+ character `JWT_SECRET`, and S3-compatible storage credentials in `.env`.

## Build and verification

```bash
npm run audit:nextjs
npm run audit:project
npm run typecheck
npm test
npm run build
npm start
```

The production start command runs Next.js on the hosting platform's public `PORT` and Fastify on the private `API_PORT` (default 3001).

## Deployment safety

The migration branch is not production-ready until dependency installation, architecture audits, typecheck, tests, the Next.js production build, and browser acceptance tests pass. Authentication, payment, custom-domain, SEO, storefront, dashboard and admin flows must be exercised on staging. Do not change production DNS, webhooks or customer traffic without explicit cutover approval.

See [STANDALONE_MIGRATION.md](STANDALONE_MIGRATION.md), [MIGRATION_STATUS.md](MIGRATION_STATUS.md) and [docs/nextjs-migration.md](docs/nextjs-migration.md) for migration and release gates.

## Product specifications

- [Editable Portfolio / Professional Profile Builder](docs/features/editable-portfolio-builder.md) — requirements for owner-editable portfolio content, sections, projects, services, uploads, themes, SEO, drafts and publishing.
