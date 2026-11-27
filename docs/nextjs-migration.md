# Oni247 Next.js Migration

## Objective

Move the Oni247 web application from Vite + React Router to Next.js App Router without
breaking the existing Fastify API, authentication/session cookies, tenant isolation,
storefront URLs, SEO rendering, payments, media uploads, or the current production
baseline.

## Current architecture (verified from the repository)

- React 19 frontend compiled by Vite.
- File-based route discovery implemented in `src/App.tsx` with
  `import.meta.glob`; route components and optional `*.pageLayout.tsx` wrappers
  live in the root `pages/` directory.
- Fastify 5 API server in `server/index.ts`, dynamically discovering
  `endpoints/**/*_{GET,POST,PUT,PATCH,DELETE}.ts`.
- Authentication is resolved from HTTP-only session cookies by the existing
  server helpers. Authenticated API calls enter the tenant-aware database context.
- Public storefront routing supports business slugs and verified custom domains.
  Crawler requests are rendered by the existing crawler renderer.
- Render currently builds with `npm run build` and starts with `npm start`.

## Migration decisions

1. Next.js App Router is the target frontend. Do not introduce Vite into the new
   frontend or use Cloudflare.
2. Keep Fastify and the existing endpoint handlers as the API backend during the
   initial frontend migration. Do not rewrite authentication or database access
   as part of a UI framework migration.
3. Preserve the current production build and start scripts until the Next.js
   application passes the migration gates below.
4. The legacy root `pages/` directory is still used by the Vite route generator.
   The Next.js foundation therefore uses the custom `.next.tsx` route suffix
   configured in `next.config.ts`. This prevents legacy route files from being
   mistaken for Next.js Pages Router routes while both applications coexist.
5. Keep the existing Render service and live deployment unchanged until explicit
   approval for a tested cutover.

## Stages

### Stage 0 — Parallel foundation

- Add Next.js without replacing Vite.
- Add an App Router root layout and a client-provider bridge for the existing
  React Query, auth, theme, tooltip, notification, and upload providers.
- Prove Next.js can build while the legacy root `pages/` directory exists.
- Keep a separate Next development/build command.

### Stage 1 — Runtime and integration design

- Decide and test how Next.js and Fastify share the Render process and HTTP port.
- Preserve Fastify's `/_api/*` dispatch, cookie forwarding, trusted proxy
  configuration, request body limits, and graceful shutdown.
- Keep Next.js page rendering separate from API endpoint execution.
- Verify health/readiness checks and crawler response handling before cutover.

### Stage 2 — Shared application shell

- Move global providers and shared layout components.
- Resolve browser-only APIs and client components explicitly with
  `"use client"`; do not blanket-convert every page to a client component.
- Replace React Router navigation and route hooks with Next.js navigation APIs
  in migrated components.

### Stage 3 — Authentication and dashboard

- Migrate login, registration, email verification, password reset, and protected
  dashboard routes.
- Preserve the existing session cookie contract and server-side authorization.
- Verify team permission checks and tenant boundaries on the server, not only
  by hiding navigation items.

### Stage 4 — Public storefront and SEO

- Migrate `/{slug}`, nested storefront pages, event routes, and custom-domain
  root resolution.
- Preserve metadata, canonical URLs, sitemap, robots rules, Open Graph data,
  crawler rendering, and published/draft access rules.
- Verify that one tenant cannot resolve or read another tenant's storefront.

### Stage 5 — Feature migration and cutover

- Migrate editor, media, gallery, blog, events, forms, commerce, orders,
  subscriptions, and admin pages in tested groups.
- Run typecheck, unit tests, production build, auth tests, API tests, and
  end-to-end smoke tests.
- Only after all gates pass, prepare a separate deployment/cutover plan.
  Production remains unchanged until explicitly approved.

## Current checkpoint

- Next.js 16 is installed alongside React 19.
- A Next.js App Router root layout and a minimal migration-check page exist under
  `src/app`.
- The Next.js provider bridge creates a per-render QueryClient and deliberately
  does not import the legacy provider tree, because that tree contains React
  Router hooks.
- The shared theme provider now initializes with a server-safe value and reads
  the browser theme after mount.
- The legacy Vite/Fastify runtime and production start command remain active.
- `npm run build` now runs the existing typecheck and Vite build, followed by
  `next build`, so a future staging build must pass both before deployment.
- The Render service has not yet reported a deployment for the Next.js
  verification commit. No successful Next.js production build is claimed yet.

The isolated Next.js foundation is not yet the production frontend. Do not
remove Vite, React Router, or the legacy route tree until the replacement routes
and backend integration have been built and tested.
