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
   frontend.
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

- Next.js 16 is declared as a dependency alongside the existing React 19 stack.
- The Next.js App Router now includes the configurable landing page, login,
  registration, forgot-password, email-verification, and dashboard overview routes.
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


## Migrated routes

- `/` now renders the configurable Oni247 landing page in Next.js.
- `/login`, `/register`, `/forgot-password`, and `/verify-email` use Next.js App Router pages.
- `/dashboard` now has a Next.js protected layout and overview page. The existing Fastify endpoints remain authoritative for session lookup, login, registration, email verification, tenant scoping, and dashboard data.
- The Next.js development command starts Next.js on port 3000 and Fastify on port 3001. Next.js rewrites API and SEO requests to Fastify.
- The public storefront homepage has a Next.js server-rendered route for `/{slug}` and for the root of a verified custom domain or business subdomain. Storefront data is loaded through the existing storefront endpoint handler and public database query path. Dynamic title, description, canonical, Open Graph and Twitter metadata are generated on the server.
- Blog article detail routes are implemented in Next.js for `/{slug}/b/{blogSlug}` and `/b/{blogSlug}` on a verified custom domain or business subdomain. They use server-prefetched storefront data, server-generated article metadata, Next.js navigation, the existing engagement API, and the existing theme/header components. The custom-domain rewrite no longer forwards the `/b` section to the legacy app.
- Service detail routes are implemented in Next.js for `/{slug}/s/{serviceId}` and `/s/{serviceId}` on a verified custom domain or business subdomain. They preserve the existing enquiry submission endpoint and service detail form. The custom-domain rewrite no longer forwards the `/s` section to the legacy app.
- Gallery detail routes are implemented in Next.js for `/{slug}/g/{gallerySlug}` and `/g/{gallerySlug}` on a verified custom domain or business subdomain. Gallery content is prefetched through the existing public Fastify endpoint, with server-generated metadata and the existing lightbox/share experience. The custom-domain rewrite no longer forwards the `/g` section to the legacy app.
- Product detail routes are implemented in Next.js for `/{slug}/p/{productSlug}` and `/p/{productSlug}` on a verified custom domain or business subdomain. They preserve variant selection, cart persistence, add-to-cart, buy-now, stock availability, related products, product engagement, sharing, and structured data. The custom-domain rewrite no longer forwards the `/p` section to the legacy app.
- Event detail routes are implemented in Next.js for `/{slug}/e/{eventSlug}` and `/e/{eventSlug}` on a verified custom domain or business subdomain. They use the existing public event and registration endpoints, preserve the dynamic registration form, capacity/closing rules, calendar links, engagement and sharing, and server-generated Event metadata. The custom-domain rewrite no longer forwards the `/e` section to the legacy app.
- Checkout now has Next.js pages for `/{slug}/checkout` and `/checkout` on verified custom domains/business subdomains. The migrated UI retains the existing order-creation and payment-verification endpoints, cart, delivery/pickup selection, bank-transfer details, WhatsApp order sharing, and tracking links. Checkout remains client-fetched from the existing storefront endpoint; this implementation is committed but has not yet passed a production build or payment-return smoke test.
- Service booking request and booking-status routes have Next.js pages for `/{slug}/book/{serviceId}`, `/book/{serviceId}`, `/{slug}/booking/{code}`, and `/booking/{code}`. They call the existing booking create/status/pay endpoints; payment processing remains in Fastify. These routes have been committed but have not yet passed a production build or live route test.
- Order tracking routes have Next.js pages for `/{slug}/track/{code}` and `/track/{code}` on verified custom domains or business subdomains. They use the existing tracking query hook and keep order data behind the existing API. These routes have been committed but have not yet passed a production build or live route test.
- The remaining listing pages are still on the Fastify/Vite compatibility path. The legacy payment-return fallback was corrected to use the storefront path helper rather than `/store/:slug/checkout`. Do not switch the production start command or remove the legacy frontend until the new checkout route and remaining pages pass build and live verification.


## Storefront routing checkpoint

- Platform host `/` serves the configurable Oni247 landing page.
- A published business subdomain or verified custom domain `/` resolves to that business storefront.
- Platform vanity URL `/{slug}` loads the published business storefront.
- Unknown or unverified custom hosts do not receive another business's storefront.
- Migrated routes are served by Next.js; remaining nested storefront routes are forwarded to the existing Fastify-served frontend as a compatibility bridge.
- The Next.js storefront, blog article, service detail, gallery detail, product detail, and event detail routes receive server-prefetched data, so business content and SEO metadata are present in the initial HTML response.
- Blog article details are migrated on both platform vanity URLs (`/{slug}/b/{blogSlug}`) and verified custom-domain/business-subdomain paths (`/b/{blogSlug}`). Service details are migrated on `/{slug}/s/{serviceId}` and `/s/{serviceId}`. Gallery details are migrated on `/{slug}/g/{gallerySlug}` and `/g/{gallerySlug}`. Product details are migrated on `/{slug}/p/{productSlug}` and `/p/{productSlug}`. Event details are migrated on `/{slug}/e/{eventSlug}` and `/e/{eventSlug}`. Checkout, booking, and order-tracking pages now have Next.js route implementations, but still require build and live verification. Listing pages remain legacy.
