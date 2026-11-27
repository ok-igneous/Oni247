# Oni247 Next.js migration plan

## Architecture decision

Effective 2026-11-27, Oni247 is migrating from React/Vite to **Next.js with TypeScript**. No Cloudflare services or deployment targets are part of the approved architecture.

### Target topology

- Web application: Next.js App Router, React and TypeScript. Vite's web entry point, Vite config and Vite production scripts are removed from the migration branch.
- Temporary route-compatibility bridge: a generated static import registry loads the existing 69 page modules and 70 layout modules; The old `pages/` directory was moved to `legacy-pages/` so Next.js does not mistake legacy component files for Pages Router routes. React Router remains inside the Next.js client boundary until each route group is converted to native App Router segments. This bridge is not a Vite runtime.
- API/business services: preserve the existing Node.js 22 + Fastify endpoint handlers initially as a separate API service. Do not rewrite 118+ endpoint handlers as part of the frontend migration.
- Database: PostgreSQL, Kysely and postgres.js remain the persistence layer until a separately justified change is approved.
- Authentication: preserve the existing HTTP-only `oni247_session` session contract and validate cookie/session behavior across the Next.js/API boundary.
- Media: provider-neutral S3-compatible object storage. Do not introduce provider-specific SDK assumptions or migrate object keys without an explicit media migration plan.
- Deployment: portable Node.js deployment, preferably containerized, with a reverse proxy routing web requests to Next.js and `/_api/*` to Fastify. No hosting provider is selected by this decision.
- Observability: structured logs, health/readiness endpoints, error reporting, metrics and backup/restore procedures.

## Why this is a staged migration

The existing application has a substantial React component and route surface, a separate Fastify server, 118+ endpoint handlers, PostgreSQL persistence, crawler-specific storefront rendering and payment/authentication flows. A one-shot rewrite would create unnecessary regression risk.

Next.js will own page routing, layouts, server rendering and public storefront rendering. Fastify remains the API boundary during the first migration phases. This separation avoids coupling the migration to a full API rewrite and allows the web and API services to scale independently.

## Required migration phases

1. **Baseline and inventory**
   - Record the current `main` baseline and preserve the source snapshot.
   - Inventory React Router routes, lazy-loaded pages, layouts, shared components, CSS, browser-only APIs and all API calls.
   - Inventory crawler rendering, metadata, sitemap, robots, custom domains and slug routing.
   - Inventory authentication, email, payment callbacks, uploads and all environment variables.
2. **Next.js foundation**
   - Pin Next.js 16.4.6 (stable, not canary) and use the existing Node.js 22 runtime.
   - Add the Next.js App Router in the migration branch.
   - Configure strict TypeScript, linting, tests, environment validation and production build scripts.
   - Next.js is the web development server, build system and production web runtime on this branch. Vite's app entry point, config, scripts and direct dependencies have been removed. Vitest remains only as the existing test runner while its tests are migrated; it is not used to serve or build the application.
3. **Route and component migration**
   - Migrate shared layouts and public routes in small, testable groups.
   - Migrate dashboard/admin routes without changing business behavior.
   - Keep interactive editor components client-side only where browser state or browser APIs require it.
   - Preserve URL compatibility and add redirects only where explicitly required.
4. **SEO and storefront rendering**
   - Implement server-rendered public storefront pages and metadata.
   - Preserve business slug and verified custom-domain resolution.
   - Verify canonical URLs, Open Graph metadata, structured data, sitemap and robots behavior.
5. **API and security boundary**
   - Keep Fastify handlers intact initially behind same-origin `/_api/*` routing. The Next.js Node route handler forwards the original host/protocol and all Set-Cookie headers; the API must be private behind exactly one trusted Next.js proxy hop.
   - Validate cookie forwarding, CSRF protections, CORS policy, rate limits, tenant isolation and authorization.
   - Do not weaken or activate staged PostgreSQL RLS without its documented prerequisites and tests.
6. **Media and provider portability**
   - Keep S3-compatible storage behind a small storage adapter.
   - Confirm current bucket/provider, object keys, upload signing and public URLs before changing anything.
   - Do not delete old media or change existing asset URLs until migration and rollback are tested.
7. **Verification**
   - Run typecheck, lint, unit, integration and production build checks.
   - Add route-parity tests and end-to-end coverage for registration, verification, login, password reset, business setup, editor, publishing, products, enquiries, orders, events, subscriptions, payments, uploads and custom domains.
   - Test concurrent requests, tenant isolation, webhook idempotency, database backup/restore and load behavior.
8. **Staging and release**
   - Deploy only to an isolated staging environment with a separate database and test credentials.
   - Run smoke, regression, security and load tests.
   - Keep the current live application unchanged until acceptance passes.
   - Production cutover, DNS changes, webhook changes and deletion of old infrastructure require explicit owner approval.

## Non-negotiable constraints

- No Cloudflare services, configuration, deployment targets or provider-specific dependencies.
- No Vite runtime, Vite scripts, Vite plugins or Vite build dependency in the completed Next.js branch.
- No blind rewrite and no deletion of existing features to make the migration easier.
- No production data migration without verified backups, schema comparison, row counts and rollback.
- No production cutover before end-to-end acceptance and explicit approval.
- Keep files reasonably modular; avoid oversized files and hidden cross-layer coupling.
- Validate every change before spending CI minutes or deploying.

## Current status

- Migration decision approved on 2026-11-27.
- Migration branch: `nextjs-migration`.
- Next.js owns the web route entry point and dynamic metadata for public storefront URLs.
- Added request-host resolution for platform vanity slugs, business subdomains, and verified custom domains. Custom-domain ownership is checked against published businesses with `customDomainStatus = verified`.
- Public storefront, product, blog, event, page and gallery routes now load their public data on the server and return crawlable HTML, canonical URLs, Open Graph/Twitter metadata and JSON-LD where the existing snapshot renderer supports it.
- Server rendering reuses the existing public Fastify endpoint handlers and crawler snapshot builder; it does not duplicate or weaken the public data access rules.
- A hydration bridge temporarily hands the page to the existing interactive React Router storefront after initial hydration. This is a deliberate compatibility stage: the first response is server-rendered, but the full storefront interaction layer is not yet a completely native App Router implementation.
- Private storefront flows such as checkout, order tracking, service booking and forms remain on the compatibility bridge.
- **Not yet verified:** dependencies have not been installed; TypeScript, unit tests, production build, live database host resolution, custom-domain requests, browser hydration, metadata output and route parity have not been run. No staging deployment or production cutover has occurred.
- Hosting provider and S3-compatible media provider remain intentionally undecided.
