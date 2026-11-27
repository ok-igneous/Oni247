# Oni247

Oni247 is an independent website and storefront platform. Public business storefronts use the canonical vanity URL pattern `https://oni247.org/{slug}`; `/store/{slug}` is not a supported route.

## Approved architecture

- Next.js 16 App Router, React and TypeScript for the web application.
- Node.js 22 + Fastify for the existing API/business services.
- PostgreSQL, Kysely and postgres.js for persistence.
- JWT-backed HTTP-only sessions using the existing `oni247_session` cookie contract.
- Provider-neutral S3-compatible object storage.
- Portable Node.js deployment; no hosting provider is selected.
- No Cloudflare deployment target.

## Development on `nextjs-migration`

1. Use Node.js 22 or newer and PostgreSQL.
2. Copy `.env.example` to `.env`; configure the database, JWT and S3-compatible storage.
3. Keep the Fastify API bound to the private/local API port (`API_PORT=3001` by default). When deploying the API as a separate hosted service, leave `API_PORT` unset so the host-provided `PORT` is used.
4. Set `API_ORIGIN` to the private API service origin. The API must not be publicly reachable when `TRUST_PROXY=1`.
5. Install dependencies with `npm install`.
6. Apply schema migrations to a disposable development database.
7. Run `npm run dev` to start Next.js and Fastify together.

The current Next.js branch uses a compatibility bridge for the existing page modules. It is not yet the final native App Router implementation and is not approved for production deployment.

See [NEXTJS_MIGRATION.md](./NEXTJS_MIGRATION.md) for the migration plan and outstanding release gates. See [STANDALONE_MIGRATION.md](./STANDALONE_MIGRATION.md) for the previous standalone baseline and data-safety history.

## Deployment safety

Keep the existing live application unchanged until the replacement passes typecheck, tests, production build, security review and end-to-end acceptance. Production cutover requires explicit owner approval.
