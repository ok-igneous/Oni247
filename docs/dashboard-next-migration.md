# Dashboard Next.js Migration

## Scope completed in source

The Next.js App Router now has route implementations for the complete shop dashboard route set:

- `/dashboard` — overview
- `/dashboard/business` — business profile and publishing
- `/dashboard/theme` — appearance, theme, header, SEO and sharing
- `/dashboard/presence` — homepage and storefront content
- `/dashboard/products`
- `/dashboard/categories`
- `/dashboard/orders`
- `/dashboard/services`
- `/dashboard/galleries`
- `/dashboard/blog`
- `/dashboard/events`
- `/dashboard/forms`
- `/dashboard/media`
- `/dashboard/checkout`
- `/dashboard/payments`
- `/dashboard/customers`
- `/dashboard/enquiries`
- `/dashboard/comments`
- `/dashboard/email`
- `/dashboard/share`
- `/dashboard/reports`
- `/dashboard/traffic`
- `/dashboard/addons`
- `/dashboard/team`
- `/dashboard/plan`

The migrated client components retain the existing feature hooks, mutations, validation, upload flows, query keys and Fastify endpoint contracts. React Router links were changed to Next.js links, page titles were moved to route metadata, and the existing page CSS modules are reused rather than restyled during the routing migration. The three routes that depended on React Router search-parameter state now use the App Router search-param APIs through `helpers/useNextSearchParams.ts` or Next's `useSearchParams`.

## Authorization and tenant boundaries

- The dashboard App Router layout retains the authenticated-user, verified-email and allowed-role checks.
- The platform admin App Router layout is separate and permits only a verified account with the platform `admin` role.
- Shop data continues to be fetched through the existing tenant-scoped endpoint hooks. This UI migration does not replace the Fastify authorization, session, or database-context layer.
- Hiding a navigation item is not an authorization control. The Fastify endpoint must continue to enforce the relevant owner/team permission for every read and mutation.

## Platform admin

- `/admin` now has a Next.js shell and overview page.
- Businesses, plans, add-ons, landing page, portfolio and platform settings remain on the legacy compatibility route until each page has a dedicated App Router implementation. Do not claim the admin area is fully migrated yet.

## Verification status

These files have been committed to GitHub, but no local typecheck, Next.js production build, browser smoke test, or payment/upload end-to-end test has been run in this migration pass. Do not switch the Render start command, disable the legacy frontend, or treat this as production-ready until those checks pass.

The legacy route tree and Vite/React Router dependencies remain in place as the compatibility baseline. The existing Render AutoDeploy behavior and production cutover restrictions are unchanged.
