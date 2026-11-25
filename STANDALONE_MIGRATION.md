# Oni247 standalone migration

This branch is the working migration target. The previous production environment is not modified by this branch.

## Runtime

- Frontend: React 19 + Vite + React Router.
- Backend: Node.js 22 + Fastify.
- API: existing endpoint handlers are discovered from `endpoints/**` and exposed under `/_api/**`.
- Database: PostgreSQL through Kysely and postgres.js.
- Object storage: S3-compatible storage (Cloudflare R2 supported).
- Sessions: signed JWT in an HTTP-only `oni247_session` cookie.
- Reverse-proxy headers are untrusted by default; set `TRUST_PROXY` to the verified proxy hop count only when deployed behind a trusted proxy.

## Local setup

1. Install Node.js 22 or newer and PostgreSQL.
2. Copy `.env.example` to `.env` and configure database, JWT, and S3 values.
3. Install dependencies with `npm install`.
4. Apply the database schema/migrations (migration export is a separate required step).
5. Run `npm run dev`; Vite serves the frontend on port 5173 and proxies API requests to Fastify on port 3001.
6. Run `npm run build` before deployment.

## Required migration work still outstanding

- Export and import the production PostgreSQL database and verify schema/version parity using [the database migration procedure](./docs/DATABASE_MIGRATION.md).
- Copy previously hosted uploaded media to the configured object bucket and rewrite legacy media URLs.
- Audit every source file for remaining legacy platform SDK/runtime references.
- Verify every endpoint's method/path mapping and exercise authentication, email, payments, uploads, events, and storefront flows.
- Configure secrets and external provider webhooks on the new host.
- Add automated integration tests and deployment health checks.

Do not cut over production until the above checks pass. Never copy legacy platform secrets into Git.

## Hosting compatibility

The current application remains Node.js 22 + Fastify because its endpoint handlers use Node APIs, PostgreSQL TCP, SMTP/Nodemailer, filesystem-based endpoint discovery and dynamic TypeScript imports. Do not deploy this server directly as a normal Worker or Pages Function.

The selected lowest-risk Cloudflare target is **Cloudflare Containers behind a thin Worker/Durable Object proxy**, with PostgreSQL remaining external and Cloudflare R2 for media. Containers require a Workers Paid plan. The container filesystem is ephemeral; durable application data must stay in PostgreSQL/R2. The Worker adapter, Dockerfile, lockfile and deployment configuration have not yet been implemented or tested.

See [the Cloudflare deployment plan](./docs/CLOUDFLARE_DEPLOYMENT.md) for the target topology, prerequisites, security gates, domain model and cutover sequence.


## Database security / RLS

The staged PostgreSQL RLS foundation and rollout requirements are documented in [database/rls/README.md](./database/rls/README.md). Do not apply its migration until the request-scoped transaction context is implemented, a non-owner runtime role is provisioned, the actual database schema is compared, and the public/system access paths are covered. Applying the migration before those prerequisites will block normal application access. It has not been applied to production or any database.
