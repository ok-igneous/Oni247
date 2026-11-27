# Oni247 standalone application

The official development branch remains `main`; the staged framework migration is isolated on `nextjs-migration`. Keep the existing live application unchanged until the replacement has passed acceptance tests and a cutover is explicitly approved.

## Current source baseline (before Next.js migration)

- Frontend: React 19 + Vite + React Router.
- Backend/API: Node.js 22 + Fastify.
- API handlers: `endpoints/**`, discovered by the existing Fastify runtime and exposed under `/_api/**`.
- Database: PostgreSQL through Kysely and postgres.js.
- Object storage: S3-compatible storage behind the existing upload adapter.
- Sessions: signed JWT in an HTTP-only `oni247_session` cookie.
- Reverse-proxy headers are untrusted by default; set `TRUST_PROXY` only to the verified proxy hop count behind a trusted proxy.

## Approved target

Next.js App Router + React + TypeScript for the web application, with the existing Fastify API preserved as a separate Node.js service during the first migration phases. PostgreSQL, Kysely, the session contract and provider-neutral S3-compatible media storage are retained unless a separately reviewed change is approved.

No hosting provider is selected. The deployment must remain portable across standard Node.js hosting environments. Do not add provider-specific deployment code before the provider decision.

See [NEXTJS_MIGRATION.md](./NEXTJS_MIGRATION.md) for the full route migration, API boundary, SEO, media, testing and cutover plan.

## Existing local runtime

Until the Next.js migration is implemented and verified, the current source runs with:

1. Node.js 22 or newer and PostgreSQL.
2. `cp .env.example .env` and configure database, JWT and S3-compatible storage values.
3. `npm install`.
4. Apply schema migrations to a disposable development database.
5. `npm run dev` (current Vite frontend and Fastify API).
6. Run `npm run audit:standalone`, `npm run typecheck`, `npm test` and `npm run build`.

These commands describe the current baseline, not the completed Next.js target. The scripts will be updated as the migration is implemented.

## Database security / RLS

The staged PostgreSQL RLS foundation and rollout requirements are documented in [database/rls/README.md](./database/rls/README.md). Do not apply its migration until request-context behavior, a non-owner runtime role, actual schema compatibility, public/system access paths and tenant-isolation tests are verified.

## Release safety

Do not configure production DNS, move customer traffic, change payment webhooks, or delete the previous application/database/media until the Next.js staging deployment passes end-to-end tests and the owner explicitly approves cutover.
