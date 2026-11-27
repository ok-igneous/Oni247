# Oni247

Oni247 is an independent website and storefront platform.

## Stack

- Next.js App Router and React 19 own the web runtime, routing and production build.
- Fastify is an API-only service; it no longer serves the frontend or a Vite build.
- React Router remains only inside a temporary compatibility layer for pages not yet migrated to App Router.
- PostgreSQL, Kysely and postgres.js for persistence.
- JWT-backed HTTP-only sessions.
- S3-compatible object storage.

Vite is not used to develop, serve or build the application. Vitest remains the current test runner and brings Vite as a transitive development dependency only; it is not part of the production runtime.

## Canonical storefront URLs

- Platform storefronts: `https://oni247.org/{slug}` (for example, `https://oni247.org/nesmage`).
- `/store/{slug}` is not a supported route and returns 404. Unknown root-level slugs return 404 unless they match a known legacy static page.
- Business subdomains are not used.
- Verified custom domains serve the storefront at their own domain root and require an active paid subscription. Trials and expired subscriptions do not qualify.

## Run locally

```bash
cp .env.example .env
npm install
npm run dev
```

Next.js runs on port 3000. Fastify listens privately on 127.0.0.1:3001 and is reached through Next.js API proxy routes. Set a PostgreSQL `DATABASE_URL`, a 32+ character `JWT_SECRET`, and S3-compatible storage credentials in `.env`.

## Build and run

```bash
npm run typecheck
npm test
npm run build
npm start
```

The production start command runs Next.js on the hosting platform's public `PORT` and Fastify on the private `API_PORT` (default 3001). Fastify does not expose a public listener by default.

## Deployment safety

The migration branch is not production-ready until dependencies are installed and typecheck, tests, Next.js production build, authentication, payment, custom-domain, SEO and browser acceptance checks pass. Do not change production DNS, webhooks or customer traffic without explicit cutover approval.

See [STANDALONE_MIGRATION.md](./STANDALONE_MIGRATION.md) and [docs/nextjs-migration.md](./docs/nextjs-migration.md) for the migration and release gates.

## Product specifications

- [Editable Portfolio / Professional Profile Builder](docs/features/editable-portfolio-builder.md) — requirements for an owner-editable portfolio, including profile content, sections, projects, services, image uploads, theme integration, SEO, drafts, and publishing.
