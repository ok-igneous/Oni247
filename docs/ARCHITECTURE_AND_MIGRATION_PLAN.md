# Oni247 Cloudflare + Supabase Migration Blueprint

**Status:** Proposed architecture; documentation-only preparation  
**Branch:** `migration/architecture-blueprint-2026-11-21`  
**Baseline:** `main` at `bae720973fc58c17ecf94280980e03a970ebe67b`  
**Production migration:** Not started

## 1. Executive decision

Migrate the existing Oni247 application. Do not rebuild the storefront builder from scratch and do not create one deployment per merchant.

Target responsibilities:

- **Cloudflare Workers:** request entry point, API runtime, host/domain resolution, security controls and static asset delivery.
- **Cloudflare Static Assets:** compiled React application and static files. The existing Pages project remains an inert staging placeholder until the final build path is proven; do not delete it.
- **Cloudflare Hyperdrive:** pooled connection path from Workers to the Oni247 PostgreSQL database.
- **Supabase:** a new, independent Oni247 PostgreSQL project. Do not reuse the OniVend or Warehouse projects.
- **Cloudflare R2:** product, gallery, logo and other uploaded media; PostgreSQL stores object keys/URLs, not file bytes.
- **Email provider adapter:** replace Floot email with a provider selected and configured later.
- **Payment provider adapter:** preserve the existing Oni247 subscription-payment flow and isolate provider-specific code. Do not confuse Oni247 subscription collection with payments collected by merchants from their customers.

This design supports one shared application and database with tenant-scoped data. Storefront creation, product edits, orders and theme changes are database operations; they must not trigger a new application build.

## 2. Repository audit — observed facts

Repository: `ok-igneous/Oni247`, default branch `main`.

At the audit baseline, the recursive Git tree contained **511 paths / 487 tracked files**:
- 174 component files
- 108 endpoint files
- 91 helper files
- 102 page files
- 8 static files
- 1 GitHub workflow file
- remaining root and directory entries

The repository contains real application code: React/TypeScript pages, storefront and admin components, typed endpoint schemas, authentication handlers, product/category/order/enquiry handlers, subscription handlers, theme and content helpers.

However, the repository is **not yet a verified standalone deployment**:
- No root `package.json`, package lockfile, `tsconfig.json`, Vite config, Wrangler config or Supabase migration directory was present in the audited tree.
- `static/__dev/dependencies.json` lists dependencies, but is not a normal package manifest or lockfile.
- The README is only a migration placeholder.
- `MIGRATION_STATUS.md` explicitly says the original Floot source transfer is pending and warns not to claim the original 484-file project has been transferred.
- The only workflow found is a Floot line-number normalization workflow, not a production build/test/deploy pipeline.

Therefore, the checked-in source is a substantial partial/source snapshot, but parity with the current Floot application must be checked against the full export before production migration.

## 3. Confirmed Floot coupling points

| Area | Current evidence | Migration action |
|---|---|---|
| Database | `helpers/db.tsx` reads `FLOOT_DATABASE_URL`; Kysely + postgres.js | Bind a Supabase PostgreSQL connection through Hyperdrive; replace environment access with typed Worker bindings |
| Session cookie | `helpers/getSetServerSession.tsx` uses cookie name `floot_built_app_session` and `JWT_SECRET` | Rename cookie to a host-only Oni247 cookie; retain a compatibility window only if needed; rotate/reissue sessions deliberately |
| Auth email | `helpers/sendAuthEmail.tsx` imports `@floot/email` | Replace with a provider adapter; keep templates and token handling in application code |
| Media uploads | `endpoints/uploads/presign_POST.ts` imports `@floot/storage` | Replace with R2 signed uploads or an authenticated Worker upload flow |
| Routing/runtime | Files are organized for Floot's generated `pages/`, `endpoints/`, `helpers/` conventions | Add a standalone React build and explicit Worker route adapter; preserve endpoint contracts |
| Public configuration | `helpers/_publicConfigs.tsx` is generated and empty in this snapshot | Recreate only the public configuration actually required by the app; never expose secrets |
| Payments | Current subscription endpoints call Flutterwave directly | Extract a provider interface; retain server-side amount calculation and independent transaction verification |

The Floot-specific dependency surface must be re-scanned across the complete export. The table above records confirmed references, not a claim that these are the only ones.

## 4. Application capabilities and data model found

The generated Kysely schema describes 18 tables:

| Table | Purpose / tenant relationship |
|---|---|
| `users` | Account identity and role |
| `user_passwords` | Password hashes |
| `sessions` | Server-side session records |
| `auth_tokens` | Hashed email-verification/password-reset tokens |
| `login_attempts` | Login rate-limit history |
| `businesses` | Storefront profile, owner, slug, theme, plan and custom-domain fields |
| `categories` | Catalogue categories; tenant key `business_id` |
| `products` | Products/services; tenant key `business_id` |
| `orders` | Orders/direct sales; tenant key `business_id`; line items in JSONB |
| `enquiries` | Customer enquiries; tenant key `business_id` |
| `product_creation_attempts` | Free-plan creation limits; tenant key `business_id` |
| `subscription_payments` | Oni247 plan payments; tenant key `business_id` |
| `blog_posts` | Business blog content |
| `galleries` | Gallery collections |
| `gallery_images` | Gallery media |
| `portfolio_items` | Portfolio content |
| `showcases` | Shareable product showcases |
| `testimonials` | Published testimonials |

Additional schema facts:
- Current user IDs are numeric; business IDs are strings/UUID-like values.
- `businesses.owner_id` points to `users.id`.
- Child content is scoped by `business_id`.
- The current business model has a single `custom_domain` field and status, not a separate multi-domain registry.
- `orders.items` and `showcases.product_ids` are JSONB.
- Money columns use numeric values and should remain exact decimals in the database.
- The current enum `plan_tier` is `free | premium`, while `website_plan` is a string. Reconcile this with the current product pricing/plan definitions before applying migrations.

The older `static/__dev/docs/README.md` is useful architectural documentation but is stale relative to the current schema: it documents only five business tables and does not describe several tables now present. Use the current generated schema and the full Floot export as the migration source of truth.

## 5. Authentication decision

**Initial migration recommendation: preserve the existing application-owned authentication model while replacing its infrastructure.**

Reason: the repository already stores bcrypt password hashes and server-side sessions. A rushed switch to a different identity system could invalidate existing passwords or require an unplanned password-reset campaign.

Keep the existing conceptual boundary:
- `getServerUserSession(request)` resolves the authenticated account.
- `requireOwnedBusiness(request)` resolves the business owned by that account.
- All owner-side endpoints use that boundary; the client does not choose another tenant by sending an arbitrary tenant identifier.

Required hardening during migration:
1. Replace `floot_built_app_session` with a host-only cookie such as `__Host-oni247_session` (`Secure; HttpOnly; SameSite=Lax; Path=/`; no `Domain` attribute).
2. Require a high-entropy signing secret from Worker secrets and fail closed at startup if missing.
3. Keep server-side session expiry/revocation authoritative. Define token expiry and database expiry consistently; test refresh and logout.
4. Add origin/CSRF protection to cookie-authenticated mutations.
5. Add edge rate limits by IP and application limits by normalized email; avoid account-enumeration responses.
6. Keep authorization roles in trusted database state. Never authorize from client-editable profile metadata.
7. Recheck admin endpoints separately; an ordinary authenticated user must never gain admin access by editing a profile.
8. Require email verification for sensitive actions according to an explicit product policy.
9. Add session revocation on password change, email change and account suspension.

A later move to Supabase Auth remains possible behind the same session/user adapter, after password-hash import compatibility and account recovery have been tested. Do not run two competing authentication systems during the initial migration.

## 6. Database connectivity and tenant security

Use a **new Supabase project for Oni247**, in a region selected after comparing latency from the expected customer base, available regions, backup requirements and plan costs. The existing Supabase projects named `onivend` and `whearhouse` are not Oni247 databases and were inactive during this audit.

Cloudflare Hyperdrive is the proposed connection path. Cloudflare's current documentation supports Postgres.js with Hyperdrive and requires Node.js compatibility. It specifically warns against `prepare: false` with Postgres.js on Hyperdrive. The current `helpers/db.tsx` uses `prepare: false`; this must be tested and corrected rather than copied blindly.

Database security requirements:
- Use a dedicated application database role that is not the table owner and does not have `BYPASSRLS`.
- Enable RLS on every tenant-owned table before production.
- Public storefront reads must be constrained to published, non-suspended businesses and their published/available content.
- Owner operations must derive ownership from the authenticated server session.
- Do not expose the Supabase service-role/secret key in browser code.
- Do not assume that `TO authenticated` alone provides tenant authorization.
- Do not enable RLS with policies that are ineffective under the actual connection role.

The existing app uses a custom session model rather than Supabase Auth JWTs, so `auth.uid()` is not automatically available as the application identity. The implementation must choose and test one safe context strategy:
- transaction-scoped database context set by trusted server middleware, with tenant policies using a transaction-local setting; or
- a carefully designed database/API access layer that passes a trusted identity context into every tenant query.

Never use a persistent connection-level tenant setting with a shared pool: one request could inherit another tenant's context. The request context must be transaction-scoped and cleared automatically. Build cross-tenant negative tests before enabling production traffic.

## 7. Storage

Current upload behavior:
- Browser requests a presigned upload URL.
- Server authenticates the owner, derives the business namespace, validates content type and size.
- Browser uploads bytes directly.
- Current accepted image types are PNG, JPEG and WebP; maximum size is 3 MB.
- Current storage path is under `businesses/{businessId}/...`.

Replacement:
- Use a private R2 bucket for original uploads and public delivery only through a controlled public asset hostname or Worker route.
- Generate short-lived, single-object upload authorization on the server.
- Derive object keys from the authenticated business context; never accept a caller-supplied business folder.
- Enforce MIME type, byte limit, file signature/content sniffing, random object names and allowed image processing.
- Configure bucket CORS only for the actual Oni247 origins.
- Store object keys and canonical delivery URLs in Postgres.
- Copy existing objects and verify counts/checksums before rewriting any image URL columns.
- Keep SVG, HTML and XML blocked unless a future, separately reviewed use case requires them.

Do not delete or overwrite the existing Floot media while the new bucket is being verified.

## 8. Hostnames, storefront routing and custom domains

Keep path routing as a permanent fallback: `oni247.com/store/{slug}` (or the verified production host). Add platform subdomains such as `{slug}.oni247.com` only after the root domain is active in Cloudflare and wildcard DNS/certificates are confirmed.

Request resolution must:
1. Normalize the request hostname (lowercase, remove a trailing dot, handle IDN consistently).
2. Match the exact platform root and reserved platform subdomains before tenant lookup.
3. Resolve `{slug}.oni247.com` only against a valid, published business slug.
4. Resolve merchant-owned domains only through an explicit verified-domain registry.
5. Reject pending, disabled, duplicate, suspended or unknown hostnames safely.
6. Never trust an arbitrary `X-Forwarded-Host` supplied by the visitor.
7. Keep admin, authentication, API and platform routes reserved so a merchant cannot claim them as a slug.

The current schema supports one custom-domain string per business. If multiple domains per business are required, introduce a dedicated `business_domains` table with unique normalized hostname, verification token, verification state, TLS state, primary flag, timestamps and audit trail.

For merchant-owned domains outside the Oni247 Cloudflare zone, evaluate Cloudflare for SaaS / Custom Hostnames at implementation time. It has separate setup, certificate, fallback-origin and pricing considerations; do not promise unlimited custom domains on the Pages custom-domain allowance. Start with Oni247-owned subdomains and path URLs; add external custom domains only after the SaaS hostname flow and cost are verified.

## 9. Payments and billing

The current code implements **Oni247 subscription checkout via Flutterwave**. It calculates the payable amount on the server, creates a pending payment, verifies the transaction against Flutterwave, and has a signed webhook path.

Preserve these security properties:
- Browser-submitted amount, currency, plan and success query parameters are never authoritative.
- Every transaction reference belongs to the authenticated business.
- Verify provider transaction ID, reference, amount and currency before activation.
- Webhook processing is idempotent and safe under retries.
- Subscription activation and payment status update happen atomically.
- Store provider event/transaction identifiers and audit transitions.

Create a provider interface so Oni247 subscription billing can later support Paystack, Flutterwave or Monnify without duplicating subscription logic. Provider credentials remain server-side Worker secrets. Merchant checkout/payment collection is a separate feature and must not be represented as implemented merely because Oni247 subscription billing exists.

## 10. Deployment and release model

Recommended target: one Cloudflare Worker with Static Assets and explicit API routing, using the React build output as static assets. This is a better fit for a single multi-tenant entry point and host-based routing than creating Pages projects per business.

The already-created `oni247.pages.dev` Pages project is retained as an unused placeholder until the complete source and build configuration are available. It currently has no deployment, no connected Git source, no custom domain and no environment variables. Do not connect it to a build that cannot succeed.

Required standalone project files, to be created only after the complete export is recovered and audited:
- `package.json` with pinned direct dependencies
- lockfile
- `tsconfig.json`
- Vite/build configuration
- Worker entry point and Wrangler configuration
- explicit endpoint route adapter
- environment/binding types
- database migration directory
- test and CI configuration

CI gates:
1. dependency installation from the committed lockfile
2. formatting/lint
3. TypeScript typecheck
4. unit tests
5. API/security integration tests
6. production build
7. preview deployment
8. manual/approved production promotion

Production deploys must be triggered by code changes, not merchant content edits. Keep production secrets out of GitHub files and frontend build-time variables. Use separate preview and production database credentials and storage buckets.

## 11. Operational requirements

Before public launch:
- automated database backups and a tested restore
- migration rollback/forward-repair procedure
- error monitoring with secrets and customer data redacted
- structured audit events for login, domain changes, subscription changes and admin actions
- abuse controls for signup, login, enquiry, order and upload endpoints
- privacy/data-retention and account deletion procedures
- domain ownership and certificate-expiry monitoring
- provider webhook retry and reconciliation process
- documented support access with least privilege
- production smoke tests for signup, verification, login, logout, storefront publish, product CRUD, order, enquiry, upload, plan checkout and domain resolution

## 12. Explicit non-goals for this migration

- No separate application deployment per merchant.
- No reuse of OniVend Core or OniVend's Supabase database.
- No rebuild of working storefront features simply to change hosting.
- No live DNS cutover before parity and rollback are proven.
- No automatic deletion of old Floot data, media or deployment.
- No assumption that a feature is present just because it appears in an older product brief; verify it against the current live Floot application and full source export.

## 13. Current blockers

1. Complete Floot source export is still pending; `MIGRATION_STATUS.md` records a daily Floot build-action limit.
2. The current GitHub snapshot is not independently buildable because root package/build/runtime configuration is absent.
3. The live Floot database dump and media export have not been received or verified.
4. A dedicated Oni247 Supabase project has not been created.
5. R2 bucket, Hyperdrive binding, email provider and production payment secrets have not been configured.
6. The production domain and DNS ownership must be confirmed before hostname setup.
7. Cloudflare project has no successful deployment.

**No production data or DNS has been changed by this blueprint.**
