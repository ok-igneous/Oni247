# Oni247 Next.js migration

## Objective

Make Next.js App Router the only web runtime while retaining Fastify and existing endpoint handlers as the private API backend. Preserve authentication/session cookies, tenant isolation, storefront URLs, SEO, payments, media uploads and the live production baseline.

## Non-negotiable routing contract

- Platform storefronts use `https://oni247.org/{slug}`, e.g. `https://oni247.org/nesmage`.
- `/store/{slug}` is not a route and returns a real 404. Unknown root-level slugs also return 404.
- Business subdomains under `oni247.org` are not supported.
- A custom domain serves a storefront only when ownership is verified and the business has an active paid subscription. A trial or expired subscription does not qualify.

## Current architecture

- Next.js 16 App Router with React 19 owns all web routing, rendering, metadata and production builds.
- Fastify is API-only and binds to loopback port 3001 by default.
- Next.js proxies `/_api/*`, `/sitemap.xml`, `/robots.txt`, `/healthz` and `/readyz` to the private Fastify process.
- Fastify trusts one proxy hop only because the default deployment runs it behind the local Next.js proxy. Do not expose that API listener publicly with `TRUST_PROXY=1`.
- React Router, BrowserRouter, React Helmet, the old legacy page runtime, the generated route registry, the `legacy-pages/` tree, and the legacy catch-all routes have been removed from the migration branch.
- All route files use standard Next.js `page.tsx`, `layout.tsx`, and `route.ts` conventions. There is no custom page-extension override or compatibility rewrite.
- Vitest remains the test runner. A transitive Vite dependency used by test tooling is not an application runtime.

## Native Next.js routes

The migration branch contains 72 standard App Router route/layout/handler files. The required route audit checks the following route families:

- Platform landing page and business vanity storefront `/{slug}`.
- Login, registration, forgot-password, reset-password, email verification, dashboard and admin.
- Dashboard and admin feature sections.
- Product, service, blog, gallery, event and form routes.
- Booking, booking confirmation/status, order tracking, payment and checkout.
- Health/readiness, sitemap and robots handlers.

Static routes take precedence over the dynamic root-level business slug route. Unknown business slugs return 404; there is no fallback to an older router.

## Runtime and deployment

- `npm run dev` starts Next.js on port 3000 and Fastify on private port 3001.
- `npm run build` runs TypeScript checking and builds Next.js.
- `npm start` starts Next.js on the platform-provided public `PORT` and Fastify on private `API_PORT` (default 3001).
- `ONI247_API_INTERNAL_URL` controls the private API origin; the default is `http://127.0.0.1:3001`.
- Configure `APP_BASE_URL=https://oni247.org` and `PLATFORM_ROOT_DOMAIN=https://oni247.org` in the deployment environment.
- If Fastify is deployed separately, it must be on a private network. Review proxy trust and client-IP handling before exposing it to any public network.

## Security requirements

- Resolve tenant identity on the server. Do not trust client-supplied business identifiers for authorization.
- Unknown hosts must not resolve another tenant's storefront.
- Custom-domain resolution checks published status, verified ownership and active paid subscription.
- Never trust arbitrary client-supplied `X-Forwarded-Host` or `X-Forwarded-Proto` values; the Next.js proxy rebuilds them for the private API hop.
- Blog HTML rendered in server responses must pass through the existing allowlist sanitizer.
- `/store` and `/store/{slug}` must stay real 404s.

## Verification status

Source inventory and architecture checks show that legacy frontend routing and runtime files are absent from the migration branch. However, GitHub Actions has not produced a successful verification run: the latest recorded job failed before recording any execution steps, including after a retry. This is not evidence of a passing build and does not establish a source-code failure. Dependency installation, typecheck, tests, Next.js production build, browser hydration, custom-domain behavior and staging acceptance remain release gates.

Keep the migration branch unmerged and do not change production DNS, payment webhooks or customer traffic until verification passes and cutover is explicitly approved.
