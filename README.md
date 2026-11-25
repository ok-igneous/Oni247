# Oni247

Oni247 is an independent website and storefront platform.

## Stack

- React 19, Vite and React Router for the web application.
- Node.js 22 and Fastify for the API server.
- PostgreSQL, Kysely and postgres.js for persistence.
- JWT-backed HTTP-only sessions.
- S3-compatible object storage, including Cloudflare R2.

## Run locally

```bash
cp .env.example .env
npm install
npm run dev
```

Configure a PostgreSQL database, a 32+ character `JWT_SECRET`, and S3-compatible storage credentials in `.env`. The Vite frontend runs on port 5173; Fastify runs on port 3001. Vite proxies `/_api` requests to Fastify.

For production:

```bash
npm run build
npm start
```

The Fastify server serves the compiled `dist` directory and dispatches the existing endpoint handlers under `/_api`.

## Deployment safety

Development and deployment work is isolated on the `standalone-migration` branch. Production deployment must not be switched until database migration, media handling, authentication, payments, email, security and end-to-end checks are complete.

See [STANDALONE_MIGRATION.md](./STANDALONE_MIGRATION.md) for the deployment and readiness checklist.
