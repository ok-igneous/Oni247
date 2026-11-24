# Oni247 standalone migration

This branch is the working migration target. The Floot-hosted production app is not modified by this branch.

## Runtime

- Frontend: React 19 + Vite + React Router.
- Backend: Node.js 22 + Fastify.
- API: existing endpoint handlers are discovered from `endpoints/**` and exposed under `/_api/**`.
- Database: PostgreSQL through Kysely and postgres.js.
- Object storage: S3-compatible storage (Cloudflare R2 supported).
- Sessions: signed JWT in an HTTP-only `oni247_session` cookie.

## Local setup

1. Install Node.js 22 or newer and PostgreSQL.
2. Copy `.env.example` to `.env` and configure database, JWT, and S3 values.
3. Install dependencies with `npm install`.
4. Apply the database schema/migrations (migration export is a separate required step).
5. Run `npm run dev`; Vite serves the frontend on port 5173 and proxies API requests to Fastify on port 3001.
6. Run `npm run build` before deployment.

## Required migration work still outstanding

- Export and import the production PostgreSQL database and verify schema/version parity using [the database migration procedure](./docs/DATABASE_MIGRATION.md).
- Copy Floot-hosted uploaded media to the configured object bucket and rewrite legacy media URLs.
- Audit every source file for remaining Floot SDK/runtime references.
- Verify every endpoint's method/path mapping and exercise authentication, email, payments, uploads, events, and storefront flows.
- Configure secrets and external provider webhooks on the new host.
- Add automated integration tests and deployment health checks.

Do not cut over production until the above checks pass. Never copy Floot secrets into Git.

## Hosting compatibility

The current extraction targets a conventional Node.js host because the existing endpoint handlers use Node-compatible PostgreSQL, crypto, SMTP and filesystem-based module discovery. Cloudflare R2 is supported for object storage, but this Fastify server is **not** a Cloudflare Workers/Pages deployment yet. A Cloudflare deployment must use a supported container runtime for this Node server, or a separately engineered Worker-native API adapter. Do not attempt a direct Workers upload until that runtime decision is made and tested.
