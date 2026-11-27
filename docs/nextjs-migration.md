# Oni247 Next.js migration

## Objective

Make Next.js App Router the only web runtime while retaining Fastify and the existing endpoint handlers as the API backend. Preserve authentication/session cookies, tenant isolation, storefront URLs, SEO, payments, media uploads and the live production baseline.

## Non-negotiable routing contract

- Platform storefronts use `https://oni247.org/{slug}`, e.g. `https://oni247.org/nesmage`.
- `/store/{slug}` is not a route and returns a real 404.
- Business subdomains under `oni247.org` are not supported.
- A custom domain serves a storefront at its own root only when its ownership is verified and the business has an active paid subscription. A trial or expired subscription does not qualify.

## Current architecture

- Next.js 16 App Router with React 19 owns web development, rendering and production builds.
- Fastify is API-only and binds to loopback port 3001 by default.
- Next.js proxies `/_api/*`, `/sitemap.xml`, `/robots.txt`, `/healthz` and `/readyz` to the private Fastify process.
- Fastify trusts one proxy hop only because the default deployment runs it behind the local Next.js proxy. Do not expose that API listener publicly with `TRUST_PROXY=1`.
- The root `pages/` directory contains legacy React Router components. Next.js uses the custom `.next.tsx` route suffix so those source files are not interpreted as Pages Router routes.
- A generated static import registry replaces Vite's `import.meta.glob()`. The old `store.$slug.*` route modules have been removed. The shared storefront component is `pages/StorefrontPage.tsx`, imported by `pages/$slug.tsx`.
- Routes not yet migrated use a client-only React Router compatibility boundary behind a Next.js internal fallback rewrite.
- Vite config, Vite web scripts, the Vite HTML entrypoint, Vite client types, and direct Vite / React Vite plugin dependencies have been removed. Vitest remains the test runner and currently brings Vite transitively as a development-only dependency; Vite is not used to serve or build the app.

## Native Next.js routes

The current tree contains native App Router pages for:

- Platform landing page and business vanity storefront `/{slug}`.
- Login, registration, forgot-password, email verification and dashboard overview.
- Blog article details at `/{slug}/b/{blogSlug}` and `/b/{blogSlug}` on a verified custom domain.
- Product details at `/{slug}/p/{productSlug}` and `/p/{productSlug}` on a verified custom domain.
- Service details at `/{slug}/s/{serviceId}` and `/s/{serviceId}` on a verified custom domain.
- Gallery details at `/{slug}/g/{gallerySlug}` and `/g/{gallerySlug}` on a verified custom domain.
- Event details at `/{slug}/e/{eventSlug}` and `/e/{eventSlug}` on a verified custom domain.

The remaining dashboard/editor pages and storefront listing, checkout, booking and tracking flows still use the compatibility layer where no native route has been completed. Do not remove React Router or legacy components until route parity and acceptance tests pass.

## Runtime and deployment

- `npm run dev` starts Next.js on port 3000 and Fastify on private port 3001.
- `npm run build` generates the legacy route registry, runs TypeScript checking and builds Next.js.
- `npm start` starts Next.js on the platform-provided public `PORT` and Fastify on private `API_PORT` (default 3001).
- `ONI247_API_INTERNAL_URL` controls the private API origin; the default is `http://127.0.0.1:3001`.
- Configure `APP_BASE_URL=https://oni247.org` and `PLATFORM_ROOT_DOMAIN=https://oni247.org` in the production environment.
- If Fastify is deployed separately, it must be on a private network and `HOST=0.0.0.0` must be used only for that private service. Review proxy trust and client-IP handling before exposing it to any public network.

## Security requirements

- Resolve tenant identity on the server. Do not trust client-supplied business identifiers for authorization.
- Unknown hosts must not resolve another tenant's storefront.
- Custom-domain resolution checks published status, verified ownership and active paid subscription.
- Never trust arbitrary client-supplied `X-Forwarded-Host` or `X-Forwarded-Proto` values; the Next.js proxy rebuilds them for the private API hop.
- Blog HTML rendered in server responses must pass through the existing allowlist sanitizer.
- `/store` and `/store/{slug}` must stay real 404s.

## Verification status

This branch has not yet completed a full dependency installation, typecheck, Vitest run, Next.js production build, browser hydration test, custom-domain test or staging acceptance. Static repository edits and regression tests are not proof that the app builds or runs. Keep this migration branch unmerged and do not change production DNS, payment webhooks or customer traffic until the verification gates pass.
