# Oni247

Oni247 is an independent website and storefront platform.

## Stack

- Next.js App Router and React 19 for the new web application.
- React Router and Vite remain only as the temporary legacy frontend during migration.
- Node.js 22 and Fastify for the API server.
- PostgreSQL, Kysely and postgres.js for persistence.
- JWT-backed HTTP-only sessions.
- S3-compatible object storage.

## Run locally

```bash
cp .env.example .env
npm install
npm run dev
```

The default development command now starts the Next.js frontend on port 3000 and the existing Fastify API on port 3001. Use `npm run dev:legacy` only when you need to compare the old frontend during migration.

Configure a PostgreSQL database, a 32+ character `JWT_SECRET`, and S3-compatible storage credentials in `.env`. The Vite frontend runs on port 5173; Fastify runs on port 3001. Vite proxies `/_api` requests to Fastify.

For production:

```bash
npm run build
npm start
```

The Fastify server serves the compiled `dist` directory and dispatches the existing endpoint handlers under `/_api`.

## Deployment safety

Development now proceeds from `main`. This does not authorize a production deployment: hosting must not be switched until database migration, media handling, authentication, payments, email, security and end-to-end checks are complete.

See [STANDALONE_MIGRATION.md](./STANDALONE_MIGRATION.md) for the deployment and readiness checklist.

## Product specifications

- [Editable Portfolio / Professional Profile Builder](docs/features/editable-portfolio-builder.md) — requirements for an owner-editable portfolio, including profile content, sections, projects, services, image uploads, theme integration, SEO, drafts, and publishing.

## Next.js migration preview

Next.js App Router is being introduced alongside the existing application. The
legacy Vite/Fastify runtime remains the active deployment until the Next.js
routes and backend integration pass the migration checks.

Run the isolated Next.js app locally:

```bash
npm run dev:next
```

Verify its production compilation:

```bash
npm run build:next
```

The Next.js application uses `src/app` and the `.next.tsx` route suffix so the existing root-level `pages/` files remain isolated while the legacy router is retired. The main `npm run build` now checks both applications; the
production start command remains unchanged for now.

See [docs/nextjs-migration.md](./docs/nextjs-migration.md) for the staged
migration plan and safety gates.
