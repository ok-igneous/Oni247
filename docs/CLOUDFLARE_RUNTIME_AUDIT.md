# Oni247 Cloudflare runtime compatibility audit

**Audit date:** 2026-11-25  
**Branch:** `main`  
**Scope:** API endpoint handlers, backend runtime, shared server helpers, crawler rendering, database, email, storage, payment integrations, and build configuration.  
**Status:** Initial source audit complete for all 118 API endpoint handler files. Shared-helper review has focused on the backend dependency paths identified by those handlers; it is not yet a complete transitive dependency proof or a successful build/test.

## Executive result

Oni247 is not ready to deploy to Cloudflare Workers. The frontend is already a Vite-built React SPA and most API handlers use the platform-neutral `Request`/`Response` interfaces, which is a good migration starting point. The blockers are concentrated in the current Node/Fastify adapter and shared infrastructure helpers.

Do not attempt a production deployment or point a Worker at the live database yet. No application code was changed by this audit.

## Source inventory

- 118 API handler files across 29 endpoint directories were inspected.
- The API handler convention is `endpoints/**/<route>_<METHOD>.ts`.
- The current server discovers those files at runtime using recursive filesystem traversal and dynamic imports.
- Endpoint handlers predominantly export `handle(request: Request): Response | Promise<Response>`, so the handler contract can be retained.
- Direct Node-specific usage found in endpoint handlers:
  - Authentication handlers import the Node `crypto` module for random token generation.
  - `endpoints/storefrontHost_GET.ts` reads `process.env` directly.
  - The remaining handlers in the inspected set do not directly import Node filesystem, socket, child-process, or SMTP modules.
- This does not mean the handlers are already Worker-safe: their transitive imports include database, email, storage, session, payment, and configuration helpers that require adaptation.

## Blockers and required changes

### P0 — Worker entrypoint and endpoint registry

**Current files:** `server/index.ts`, `endpoints/**`

The current Fastify server:
- Uses `node:fs/promises` and `node:fs` to recursively discover endpoint files and check whether `dist/index.html` exists.
- Uses Node `path` and `url` modules to resolve paths.
- Dynamically imports endpoint modules by filesystem path.
- Starts a long-running Fastify listener with `app.listen()`.
- Registers Fastify hooks, parsers, not-found handling, static serving and graceful process signal handlers.

This is a conventional Node server adapter, not a Workers entrypoint.

**Required approach:** retain the Fastify adapter for local development if useful, but add a Worker-native `fetch(request, env, ctx)` entrypoint. Generate a deterministic TypeScript endpoint manifest at build time with explicit static imports for all 118 handlers. Build-time filesystem traversal is acceptable; runtime filesystem discovery in the Worker is not. The generator must fail on duplicate method/path keys and tests must prove that every handler file is represented.

Preserve the current `/_api/<route>` method mapping, 404 behavior, request body handling, response headers, multiple `Set-Cookie` values, and response status codes.

### P0 — Database runtime and tenant isolation

**Current files:** `helpers/db.tsx`, `helpers/getServerUserSession.tsx`, `helpers/getSetServerSession.tsx`, `helpers/requireOwnedBusiness.tsx`, `server/index.ts`

Current database helper:
- Reads `DATABASE_URL` from `process.env` at module initialization and throws if absent.
- Creates a global `postgres.js` client and Kysely instance.
- Uses `kysely-postgres-js`.
- Sets `prepare: false`.
- Uses `AsyncLocalStorage` for request transaction context.
- Uses a transaction plus `set_config('app.user_id', ..., true)` to establish per-request RLS identity.
- Emulates nested transactions using PostgreSQL savepoints.

The Worker must receive Hyperdrive through `env`, not depend on a startup-time `DATABASE_URL` global. The database adapter must be constructed from the request's Worker environment and have a safe lifecycle for the Worker isolate.

Cloudflare's Postgres.js Hyperdrive guidance must be followed for prepared statements and connection settings. The current `prepare: false` option must not be copied blindly into the Hyperdrive configuration.

**Security-critical test requirements:**
- Confirm Hyperdrive transaction behavior with the exact driver versions.
- Prove that `set_config(..., true)` remains transaction-local on the same database connection used by every query in the request.
- Test concurrent requests from different users and tenants to prove no RLS identity leaks across requests.
- Test nested savepoints, advisory locks, rollback, webhook idempotency, and connection reuse.
- Ensure unauthenticated bootstrap routes and verified system/webhook routes have explicit, narrow RLS access paths.
- Never bypass or disable RLS to make the Worker migration pass.

The current Fastify adapter resolves the signed session before entering the per-user transaction. The Worker adapter must preserve this ordering. Session lookup and session refresh also access auth tables; verify their RLS policies and transaction placement rather than assuming they are outside tenant policy.

### P0 — Worker environment and secrets

**Current files:** `helpers/db.tsx`, `helpers/getSetServerSession.tsx`, `helpers/emailConfig.tsx`, `helpers/flutterwaveEnv.tsx`, `helpers/mailCrypto.tsx`, `helpers/objectStorage.tsx`, `endpoints/storefrontHost_GET.ts`, `server/crawlerRenderer.ts`

Many helpers read `process.env` directly. Worker secrets and resource bindings are supplied through the `env` argument. Add one typed runtime environment/context interface and pass it into shared backend operations. Do not set secret values on `globalThis`, inject them into client-side Vite variables, or rely on mutable global environment state.

Required configuration includes JWT signing key, email-settings encryption key, platform root domain, application base URL, payment provider secrets, and any provider webhook secrets.

### P0 — Email delivery

**Current files:** `helpers/smtpSend.tsx`, `helpers/emailConfig.tsx`, `helpers/sendAuthEmail.tsx`, `helpers/deliverMail.tsx`, `helpers/mailProviders.tsx`, `helpers/handleInboundEmail.tsx`

The app's platform email sender uses Nodemailer and raw SMTP. Authentication flows for account verification and password recovery depend on this path. Workers should not be assumed to support arbitrary SMTP sockets.

The existing business-provider layer already has HTTPS integrations for Resend, Brevo, SendGrid and Mailgun. Reuse this abstraction and add a platform-owned HTTPS sender. Migrate authentication/system messages as well as business messages. Preserve encrypted provider credentials, sender verification, bounce/complaint/unsubscribe handling and inbound webhook verification.

Do not silently make account verification or password recovery optional when the SMTP path is removed.

### P0 — Media and object storage

**Current files:** `helpers/objectStorage.tsx`, `endpoints/uploads/presign_POST.ts`, `endpoints/media/register_POST.ts`, `helpers/uploadImage.tsx`, `helpers/uploadVideo.tsx`

The current backend creates S3-compatible presigned PUT URLs using the AWS SDK and `process.env` credentials. The Cloudflare account has an existing R2 bucket named `oni247-media`.

Prefer a native R2 binding for Worker-side operations where appropriate. If retaining S3-compatible presigning, prove the AWS SDK and signature behavior in the Worker runtime. Preserve the existing browser direct-upload flow, content-type restrictions, 50 MB server-side maximum, business ownership checks, media registration, and public URL mapping. Do not expose R2 credentials to browsers.

The existing bucket does not yet have a verified public asset hostname. Do not invent or hardcode one; configure a controlled custom asset domain or an authenticated delivery path before production.

### P1 — Crawler storefront rendering and SEO

**Current files:** `server/crawlerRenderer.ts`, `server/crawlerRoutes.ts`, `server/crawlerSnapshotLoader.ts`, `server/crawlerDocument.ts`, `server/storefrontPrerender.ts`, `server/storefrontSnapshot.ts`, `server/index.ts`

Crawler rendering is important functionality, not optional static hosting. It:
- Detects crawler user agents.
- Resolves platform subdomains and verified custom domains.
- Loads storefront, gallery and public endpoint data.
- Injects title, description, canonical, Open Graph, Twitter and JSON-LD metadata into the built HTML.
- Returns a crawler-specific HTML document while ordinary visitors receive the SPA.

The current renderer is coupled to Fastify request/reply objects and reads `process.env`. Its built HTML loader reads `dist/index.html` from the Node filesystem.

Refactor the renderer into a framework-neutral function accepting standard `Request`, a typed environment/context, and a built asset response/string supplied by the Worker asset binding. Preserve route matching, canonical URLs, verified custom-domain lookup, crawler-specific content, cache variation by User-Agent, error responses and all metadata. Test platform subdomains and custom domains separately.

### P1 — Node built-ins and crypto

- Authentication endpoint files import `crypto` for random token generation. Either use Web Crypto or the explicit Worker-supported Node compatibility implementation; do not rely on ambiguous bare built-in resolution.
- `helpers/db.tsx` imports `node:async_hooks` for AsyncLocalStorage. Validate availability with the required Workers Node compatibility settings and prove request isolation.
- `helpers/mailCrypto.tsx` uses `Buffer` for Base64 encoding/decoding. Prefer Web APIs (`btoa`/`atob`) or validate the compatibility implementation.
- `bcryptjs` is JavaScript-based but password hashing is CPU intensive. Measure it against the Worker CPU budget and use a supported execution strategy if necessary.
- Browser helpers such as `processImage`, `uploadImage` and `uploadVideo` use browser APIs and must remain client-side; they are not backend Worker blockers.

### P1 — Payment and outbound HTTPS

The payment provider integrations in `helpers/gatewayApi.tsx` use standard `fetch`, `RequestInit`, `AbortSignal.timeout` and Web APIs. These are promising Worker-compatible paths. Verify timeout behavior, webhook signature verification, response handling and secret isolation. Do not rewrite payment business logic merely to change the hosting platform.

### P1 — Static assets and SPA fallback

The Vite build writes `dist/`. The current Fastify server checks for `dist/index.html`, serves static assets and falls back to the SPA shell. Workers Static Assets should take over static delivery, with explicit Worker routing for API endpoints, health/readiness, sitemap, robots, custom-domain resolution and crawler HTML. Confirm asset paths and SPA fallback behavior on nested storefront routes.

### P2 — Build and dependency configuration

Current package scripts include `build`, `typecheck`, `test` and `audit:standalone`; there is no Wrangler configuration or Worker-specific build/deploy script yet.

The production dependency list includes Fastify, `@fastify/static`, Nodemailer, AWS S3 SDK packages, `postgres`, Kysely and other shared libraries. Worker bundling must not accidentally pull the Fastify server, Nodemailer or other Node-only code into the Worker bundle. Separate the Node adapter from shared handler code and keep dependency graphs explicit.

There is no package lockfile at the time of this audit. Before deploying, create and commit a reproducible lockfile, then validate with `npm ci` in an available environment. Do not treat an unlocked install as a reproducible production build.

## Endpoint handler audit notes

All 118 files matching the endpoint handler convention were fetched and inspected for direct Node runtime references and imports. The direct findings were limited compared with the server adapter:
- Five authentication handler files import Node `crypto`.
- `endpoints/storefrontHost_GET.ts` directly reads `process.env`.
- The remaining handlers primarily import shared application helpers and use the standard Request/Response API.

The endpoint registry must be generated from the repository tree and its completeness test must compare against the exact source file list at build/test time. Do not maintain a hand-written list of 118 imports.

## Recommended implementation sequence

1. Complete transitive helper/dependency inventory and capture the exact current route manifest.
2. Add the build-time static endpoint manifest generator and completeness/duplicate tests.
3. Define the typed Worker environment and request context.
4. Refactor database creation to accept Hyperdrive and prove RLS transaction isolation on a disposable database.
5. Add Worker API dispatch while retaining the current Fastify adapter for local regression.
6. Port health/readiness and crawler rendering to standard Request/Response plus Workers Static Assets.
7. Add native R2 media integration and verify browser upload behavior.
8. Replace SMTP/Nodemailer platform delivery with HTTPS email for all auth and system flows.
9. Verify payment/webhook behavior, cookies, CORS, security headers, rate limits and error paths.
10. Build and test locally, then deploy only to an isolated test Worker using disposable data/resources.
11. Run end-to-end acceptance tests before considering production database/media migration or domain cutover.

## Validation status

- Endpoint source inventory: inspected, 118 handler files / 29 directories.
- Direct endpoint Node-specific usage: initial scan complete.
- Backend shared-helper dependency audit: in progress; critical helpers reviewed.
- Full transitive dependency audit: not yet complete.
- Typecheck: not run.
- Unit tests: not run.
- Production build: not run.
- Worker build: not implemented or run.
- Hyperdrive connection: not configured or tested.
- R2 Worker binding: not configured or tested.
- Email provider: not configured or tested.
- Cloudflare deployment: none.
- Production cutover: not approved.

**No production service, DNS record, database, or live customer traffic was changed during this audit.**
