# Oni247 Cloudflare deployment plan

## Current decision: free-first Workers migration

Do not deploy the existing Fastify server as a Cloudflare Container. The connected Cloudflare account does not have Container access; the API explicitly reports that deploying Containers requires Workers Paid. No paid upgrade is approved.

The target to validate is a **Cloudflare Worker with Workers Static Assets**, serving the existing React/Vite build and handling API requests. Use **Hyperdrive** to connect the Worker to the existing PostgreSQL database, and the existing **R2 bucket `oni247-media`** for uploaded media.

This is a backend runtime migration, not a simple hosting switch. The current Fastify server cannot be uploaded unchanged as a Worker. Preserve the current Fastify runtime for local development and regression comparison until the Worker implementation passes acceptance tests.

Cloudflare documentation:
- Workers Static Assets and SPA routing: https://developers.cloudflare.com/workers/static-assets/routing/
- React + Workers example: https://developers.cloudflare.com/workers/framework-guides/web-apps/react/
- Hyperdrive with Postgres.js: https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-drivers-and-libraries/postgres-js/
- Hyperdrive pricing: https://developers.cloudflare.com/hyperdrive/platform/pricing/
- Workers pricing and limits: https://developers.cloudflare.com/workers/platform/pricing/

## Account state verified on 2026-11-25

- Account: `Emmanuelokunyode@gmail.com's Account`.
- Existing Pages project `oni247` at `oni247.pages.dev`; no deployment exists and no build configuration is set. Leave it untouched while the Worker path is developed.
- Existing R2 bucket: `oni247-media`.
- No DNS zones are configured in the connected account. Do not configure custom hostnames, wildcard DNS or production domains until the intended root domain is confirmed and added to Cloudflare.
- No Worker scripts are deployed.
- Container API access is unavailable because the account is not on Workers Paid.
- No production database connection or Hyperdrive configuration has been supplied or verified.

## Target topology

```
Browser
  |
  | HTTPS (initially workers.dev / pages.dev test host)
  v
Cloudflare Worker + Workers Static Assets
  |                         |
  | /_api/*, health, SEO    +--> Vite dist/ (React SPA)
  v
Worker API router
  |
  +--> Hyperdrive --> existing PostgreSQL database
  |
  +--> R2 binding --> oni247-media
  |
  +--> HTTPS email/payment providers and webhooks
```

Workers Static Assets can serve the SPA and route selected paths through the Worker. Keep API routes and crawler-specific storefront rendering on the Worker path; static assets should not invoke backend logic unnecessarily.

## Required application changes

### 1. Replace runtime endpoint discovery

The current `server/index.ts` recursively scans `endpoints/**` with Node filesystem APIs and dynamically imports endpoint files. That runtime discovery is not suitable for a bundled Worker.

Create a deterministic build-time endpoint manifest with explicit static imports. Preserve each endpoint's method/path mapping and return 404 for unknown routes. Add a parity test comparing the generated manifest with the endpoint source tree so a new endpoint cannot silently be omitted.

Keep endpoint handlers based on standard `Request`/`Response` where possible so they can be reused by both the local Fastify adapter and Worker adapter.

### 2. Introduce an explicit runtime environment adapter

The current code reads configuration through `process.env`. Worker secrets and bindings arrive through the Worker's `env` object. Introduce a typed runtime configuration/context adapter and replace direct environment access in shared handlers and helpers. Do not create fake global environment variables or expose secrets to the browser.

Use Worker bindings for Hyperdrive and R2. Keep JWT keys, encryption keys, payment credentials and provider credentials as Worker secrets.

### 3. PostgreSQL through Hyperdrive

The current database layer uses Kysely, `kysely-postgres-js` and `postgres.js`; Cloudflare documents Postgres.js support through Hyperdrive. The current client sets `prepare: false`. Cloudflare's Postgres.js guidance explicitly says not to use `prepare: false` with Hyperdrive because it can cause queries to hang or fail intermittently. Resolve this deliberately and test the exact driver/adapter versions before deployment.

The existing request-scoped RLS design uses `AsyncLocalStorage` and a transaction with `set_config('app.user_id', ..., true)`. Hyperdrive uses transaction pooling. Validate that request context, transactions, savepoints, advisory locks, rollback, and concurrent requests preserve tenant isolation. Never weaken RLS to make the Worker migration easier.

The documented Free plan Hyperdrive allowance is 100,000 database statements per day. Treat this as a hard operating limit for the initial free deployment; monitor usage and fail safely rather than assuming unlimited database access.

### 4. R2 media

Use the existing `oni247-media` bucket. Do not store uploads or durable data in Worker memory or local filesystem. Preserve the current object-key ownership model and validate upload size, MIME type, business ownership, CORS, signed upload URLs, and public delivery URLs.

The bucket currently has no verified public custom domain. Keep `PUBLIC_ASSETS_BASE_URL` unset until a controlled asset hostname is configured. Do not enable unrestricted public access as a shortcut. Test whether the existing AWS S3 SDK presigning code works in the Worker runtime; if not, implement a Worker-native R2 upload flow without exposing bucket credentials.

### 5. Email

The existing app has HTTP API integrations for Resend, Brevo, SendGrid and Mailgun, but platform authentication email and the default platform sender still depend on SMTP/Nodemailer. Do not assume raw SMTP sockets are available in Workers.

Move platform authentication and system email to a supported HTTPS email provider integration. Keep business-owned provider credentials encrypted and isolated. Verify email delivery, verification links, password reset, inbound email webhooks and unsubscribe/bounce handling before launch.

### 6. Other Node/runtime compatibility

Audit all runtime dependencies and usages of Node built-ins, filesystem access, dynamic imports, timers, crypto, Buffer, streams and process globals. Enable only the required Node.js compatibility features. Replace unsupported runtime assumptions rather than relying on development-only polyfills.

Keep payment callbacks, signature verification, cookies, multiple Set-Cookie headers, binary uploads, streaming responses and crawler-specific SEO rendering intact.

## Security and data gates

- Use a dedicated Oni247 database and least-privilege database role.
- Do not point staging at the current production database as a shortcut.
- Compare actual schema, constraints, indexes, sequences and row counts before migration.
- Keep RLS enabled only after request-context and all public/system access paths are verified.
- Validate authentication, authorization, tenant isolation, rate limiting, webhook signatures, cookie flags, CORS, upload authorization and custom-domain ownership.
- Never commit credentials or put secret values in frontend build variables.
- Do not configure DNS or move customer traffic before a staging deployment passes end-to-end tests.

## Phased execution

1. Inventory every endpoint and runtime dependency; classify Worker-compatible, needs adaptation, and incompatible.
2. Add the Worker entrypoint, static asset configuration and generated endpoint manifest without changing production hosting.
3. Add typed Worker environment bindings and the Hyperdrive database adapter; prove RLS isolation using a disposable database.
4. Adapt R2 uploads and asset delivery.
5. Replace SMTP-dependent platform mail with HTTPS email delivery.
6. Port crawler storefront rendering, sitemap and robots handling.
7. Run audit, typecheck, unit tests, integration tests and production build; test Worker behavior locally with the Cloudflare-supported development workflow.
8. Deploy to an isolated `workers.dev` test endpoint using test database and test R2 resources.
9. Run end-to-end tests for registration, login, password reset, storefront publishing, products, enquiries, checkout, payments, media, events, SEO and tenant isolation.
10. Configure the final domain only after the intended root domain is confirmed and added as a Cloudflare zone.
11. Complete production database/media migration and a controlled cutover only after explicit approval.

## Cost and operating constraints

- Stay on Workers Free unless the user explicitly approves a paid upgrade.
- Hyperdrive is available on Free with the documented 100,000 database statements/day allowance.
- Verify current Worker request and CPU limits before launch; CPU-heavy work must be measured, not assumed to fit.
- Containers are a future option only if the user approves Workers Paid and the operational tradeoff. They are not the current plan.
- R2 storage and operations have their own pricing/allowances; check current R2 usage and pricing before production media migration.
- Avoid adding paid queues, databases, email or analytics services unless a concrete requirement justifies them.

## Rollback and production safety

Keep the existing Pages project and the previous live application unchanged while the Worker version is built and tested. Do not delete source data, old media, existing DNS records or payment webhooks. Define a rollback trigger and retain database backups before any production cutover.


## Runtime compatibility audit

The initial source-level audit of all 118 API handler files and the main backend dependency paths is documented in [CLOUDFLARE_RUNTIME_AUDIT.md](./CLOUDFLARE_RUNTIME_AUDIT.md). Treat its P0 items as deployment blockers. The audit is not a substitute for typechecking, integration tests or a Worker build; none of those validations has passed yet.
