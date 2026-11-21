# Oni247 Feature Parity Audit

**Baseline:** GitHub `main` at `bae720973fc58c17ecf94280980e03a970ebe67b`  
**Purpose:** Compare the checked-in source snapshot with the live Floot application before migration.  
**Rule:** "Found in source" does not mean "verified working in production".

## 1. Capabilities represented in the repository

| Capability | Evidence in source tree | Status |
|---|---|---|
| React storefront and route pages | `pages/` contains 102 files | Present in snapshot; runtime/build not verified |
| Admin/dashboard UI | Admin components and dashboard pages | Present in snapshot |
| Authentication | Register, login, logout, session, forgot/reset password, email verification endpoints | Present; Floot cookie/email dependencies remain |
| Business profile | Business read/save endpoints and business schema | Present |
| Product/service catalogue | Product and category endpoints, product pages and schemas | Present |
| Orders | Direct order create, storefront order, list/update/delete and tracking endpoints | Present |
| Enquiries | Storefront enquiry and enquiry management endpoints | Present |
| Subscription billing | Checkout, verify, status and webhook endpoints | Present; Flutterwave-specific |
| Blog content | Blog endpoints and schema | Present |
| Galleries | Gallery and gallery-image schema/endpoints | Present |
| Portfolio/showcase | Portfolio items and showcase endpoints | Present |
| Testimonials | Schema and related UI may exist; verify route behavior in live app | Needs live parity check |
| Theme system | Theme helpers and storefront content settings | Present; test saved/published behavior |
| Image uploads | Presign endpoint and client upload helper | Present but Floot storage-bound |
| SEO/robots/sitemap | robots.txt, sitemap and sitemap endpoint | Present; verify canonical host behavior |

## 2. Features that require live-app verification

These are not certified by the repository tree alone:
- registration and login edge cases, password reset and email deliverability
- email verification redirects and production URL
- published/unpublished state for every content type
- product variants, image uploads, gallery ordering and storefront rendering
- mobile navigation and responsive dashboard behavior
- custom-domain ownership verification and certificate status
- plan/trial enforcement, one-time registration promo and plan renewal rules
- checkout redirects, webhook retries, duplicate events and failed payment recovery
- event engine, registration forms and any other premium features added in Floot after this source snapshot
- analytics, traffic reporting and order tracking across path/subdomain/custom-domain hostnames
- any feature added after the last repository commit

## 3. Potential parity gaps / source risks

- The repo's `MIGRATION_STATUS.md` says the complete original Floot source transfer is pending.
- No root build manifest or lockfile is present.
- `static/__dev/docs/README.md` is an older technical note and documents fewer tables/features than the current generated schema.
- The current schema has 18 tables; use it, live Floot behavior and the final database dump together when constructing migrations.
- Current business schema has one custom-domain field; multiple domains per business would need a new registry table.
- Current `plan_tier` enum and free/premium naming need reconciliation with the live plan catalog before migration.
- The current source contains a direct Flutterwave subscription implementation; provider abstraction is not yet evidenced.
- The current upload endpoint imports `@floot/storage`; it cannot work after migration until replaced.
- The current auth email helper imports `@floot/email`; it cannot work after migration until replaced.
- Session cookie name still contains the Floot prefix.

## 4. Live parity test matrix

Mark each item only after testing the current Floot production app and then the migrated preview.

| Test | Floot result | Migrated preview result | Evidence / notes |
|---|---|---|---|
| Register new account | Pending | Pending | |
| Verify email | Pending | Pending | |
| Login / logout | Pending | Pending | |
| Forgot / reset password | Pending | Pending | |
| Create business profile | Pending | Pending | |
| Publish / unpublish storefront | Pending | Pending | |
| Add/edit/delete product and service | Pending | Pending | |
| Categories and product variants | Pending | Pending | |
| Upload logo/product/gallery image | Pending | Pending | |
| Create/update order | Pending | Pending | |
| Public storefront order | Pending | Pending | |
| Enquiry submit/manage | Pending | Pending | |
| Tracking link lookup | Pending | Pending | |
| Blog/gallery/portfolio/testimonials | Pending | Pending | |
| Theme editing and publish | Pending | Pending | |
| Trial and subscription status | Pending | Pending | |
| Checkout and provider verification | Pending | Pending | |
| Webhook duplicate/retry handling | Pending | Pending | |
| Admin authorization and moderation | Pending | Pending | |
| Custom-domain verification | Pending | Pending | |
| Mobile storefront and admin navigation | Pending | Pending | |
| Event registration / Form Engineer, if enabled in current Floot | Pending | Pending | |

## 5. Acceptance rule

A feature is migration-ready only when:
1. it exists in the complete source export or is explicitly approved as a new feature;
2. its data model and API behavior are documented;
3. it passes the Floot baseline test;
4. it passes the migrated preview test;
5. tenant-isolation and unauthorized-access tests pass;
6. rollback does not lose data or prevent access to the old Floot app.

Do not use a partial source snapshot as proof of full feature parity.
