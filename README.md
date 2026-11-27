# Oni247

Oni247 is an independent website and storefront platform.

## Approved architecture

- Next.js App Router, React and TypeScript for the web application (migration in progress).
- Node.js 22 + Fastify for the existing API/business services during the staged migration.
- PostgreSQL, Kysely and postgres.js for persistence.
- JWT-backed HTTP-only sessions using the existing `oni247_session` cookie contract.
- Provider-neutral S3-compatible object storage.
- Portable Node.js deployment; no hosting provider is selected yet.

## Development

The current source still contains the legacy Vite frontend while the Next.js migration is being prepared. Do not assume the Next.js runtime is ready until its implementation and checks are complete.

See [NEXTJS_MIGRATION.md](./NEXTJS_MIGRATION.md) for the approved architecture, migration phases and release gates. See [STANDALONE_MIGRATION.md](./STANDALONE_MIGRATION.md) for existing standalone runtime details and data-safety requirements.

## Deployment safety

Keep the existing live application unchanged until the replacement passes typecheck, tests, production build, security review and end-to-end acceptance. Production cutover requires explicit owner approval.
