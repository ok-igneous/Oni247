# Oni247 PostgreSQL RLS rollout

## Status

This directory contains an RLS policy foundation and an initial request-context integration, not a production-ready activation. The migration has **not** been applied to any database. Tenant policies require a transaction-local `app.user_id`; the API now establishes this for authenticated endpoint execution, but concurrency and integration tests are still outstanding.

## Required rollout sequence

1. Export and inspect the actual target database schema. The generated Kysely schema is a source inventory, not proof of live table names, types, constraints, or existing policies.
2. Provision a dedicated runtime login that is not a superuser, does not have `BYPASSRLS`, and does not own application tables. Keep migration/owner credentials separate.
3. Grant the runtime role only the required schema usage and table/sequence privileges. Do not grant it membership that permits `SET ROLE` to the owner.
4. The standalone API verifies the signed/session-backed user before endpoint execution, then wraps authenticated non-authentication endpoint execution in `withUserDatabaseContext`. Routes under `auth/` remain outside this tenant transaction because they are authentication/bootstrap flows over deliberately excluded tables. Existing nested `db.transaction()` calls in other authenticated endpoints are routed through PostgreSQL savepoints on the same request transaction and connection; this compatibility layer still requires rollback and nesting tests. That helper sets `app.user_id` transaction-locally and uses `AsyncLocalStorage` so existing `db` calls in the endpoint resolve to the same Kysely transaction. This is an implementation milestone, not yet validated by a runtime test.
5. The API now consumes each endpoint response body before leaving the authenticated request transaction, so lazy response streams cannot accidentally perform database reads after tenant context has closed. This still needs a regression test with a lazy DB-backed response. Before activation, test context propagation under concurrent requests, nested transactions, errors/rollback, and connection reuse.
6. Public storefront reads use published-business/content SELECT policies for businesses, categories, products, testimonials, portfolio items, blog posts, events, forms, galleries, gallery images, and showcases. Public form/event submissions use a narrow INSERT policy that checks the published business, active form, and (when supplied) matching open event. Anonymous SELECT on `form_submissions` and `payment_gateways` remains denied. Registration counts, duplicate checks, gateway-enabled status, and showcase view increments use narrow SECURITY DEFINER helpers that return only the minimum result required by the endpoint. Runtime EXECUTE grants are still required.
7. Public form/event submissions are covered by the narrow form INSERT policy and count/duplicate helpers. Public enquiries now use the `submit_public_enquiry(text,text,text,text,text)` SECURITY DEFINER operation, which resolves only published businesses, serializes the per-business rate limit, and inserts the enquiry without exposing enquiry reads. Orders, service bookings, comments/reactions, and media upload signing remain separate rollout blockers; do not enable RLS until each has an explicit narrowly scoped policy or SECURITY DEFINER operation and an integration test. Never expose payment secrets, private customer data, drafts, internal notes, email credentials, or unpublished content.
8. Apply the migration to a disposable clone, run the isolation suite, inspect query plans and logs, and only then plan a controlled staging rollout.



Authentication hardening: `JWT_SECRET` validation is performed outside the invalid-token catch. A missing or undersized secret therefore fails as a server configuration error instead of being downgraded to an unauthenticated request. A focused regression spec covers both invalid configuration and invalid tokens; it has not yet been executed.

## Policy model

- `app_private.can_access_business(text)` authorizes a business when the transaction-local user ID matches its owner, an active team member, or an authenticated platform administrator (`users.role = 'admin'`). Platform-admin status is resolved through `app_private.is_platform_admin()` because the users table is excluded from tenant RLS. Pending invitations do not grant tenant access. Invitation acceptance must use a separate, narrowly scoped operation that verifies the signed-in user's email, activates only that invitation, and then allows normal active-membership policies to apply.
- Tenant-owned tables receive a single all-commands policy using their `business_id`.
- `gallery_images` derives ownership through its parent gallery.
- `businesses` allows owner/team-member/platform-admin reads through the membership helper. Owners may write their own business record; platform administrators have a separate explicit write policy for platform moderation operations. Team members cannot mutate the business record itself.
- Authentication tables (`sessions`, `auth_tokens`, `user_passwords`, and `users`) are deliberately excluded from this first migration. Session lookup must happen before the server knows the user ID; applying a user-ID policy to session lookup would create an authentication bootstrap deadlock. Add dedicated policies only after designing narrow auth access paths.
- `login_attempts` and `platform_settings` are deliberately not covered by these tenant policies; their authentication/platform access patterns need separate review.

## Security boundaries and caveats

A custom PostgreSQL setting is trusted application context, not an unforgeable identity token. A database client able to execute arbitrary SQL as the runtime role can generally set custom GUCs. This design protects against omitted tenant predicates and accidental cross-tenant queries; it does not make SQL injection harmless. Continue using parameterized queries, strict input validation, least-privilege grants, and a non-owner runtime role.

The SECURITY DEFINER helpers must be owned by a controlled migration/table-owner role. Their fixed search paths and revoked PUBLIC execute privileges are deliberate. The runtime role needs `USAGE` on `app_private` and explicit `EXECUTE` grants on `is_platform_admin()`, `can_access_business(text)`, `activate_invited_team_member(text)`, `is_public_business(text)`, `has_public_payment_gateway(text)`, `public_event_registration_count(text)`, `public_event_has_duplicate(text,text,text,text)`, `can_submit_public_form(text,text,text)`, and `increment_public_showcase_view(text)`, and `submit_public_enquiry(text,text,text,text,text)` after role provisioning. Do not grant either privilege to `PUBLIC`. Enable `RLS_ENABLED=true` in the API only after the migration and grants are present; the invitation helper is called only in that mode. It requires a verified account email and activates exactly one matching invitation (or the explicitly requested business); if an unscoped user has multiple pending invitations, it refuses to choose. Do not use FORCE ROW LEVEL SECURITY on the referenced tables without redesigning and testing the helper: its owner needs controlled visibility of ownership and membership rows to avoid recursive policy evaluation.

## Required automated tests

For two users and two businesses, verify:
- owner A can read/write A and cannot read/write B;
- a platform administrator can read tenant records and perform explicitly authorized platform moderation writes across businesses, while an ordinary user cannot;
- active team member A can access A but not B;
- disabled, invited, and unlinked members cannot access tenant rows; invitation acceptance is tested only through its dedicated activation path;
- inserts with another business ID fail;
- updates cannot move rows to another business;
- gallery images cannot be read or inserted through another business's gallery;
- authentication/session/token/password/profile operations are tested against their separately designed access controls before any auth-table RLS is enabled;
- missing or empty `app.user_id` returns no tenant rows and rejects writes;
- connection reuse after a transaction does not retain the previous user's context;
- public routes expose only explicitly approved published data.

Do not run this migration against the previous production database or any production database during development.

## Public checkout: blocked pending a narrow database operation

The existing public checkout handlers are not compatible with the staged tenant RLS policies yet. This is intentional: do not add broad anonymous policies to `orders`, `customers`, or `payment_gateways` to make checkout appear to work.

The current `endpoints/storefront/order_POST.ts` flow:

- Reads product rows including `costPrice`, `stockQuantity`, and `variants`. The public product SELECT policy is row-level only; it does not hide columns. An RLS policy cannot make those private columns invisible to the same database role while still allowing the endpoint to select them.
- Reserves inventory with row locks, upserts a customer by business/phone, and inserts the order in one transaction. Current tenant policies correctly deny anonymous customer/order writes.
- Checks gateway availability and later calls `startOrderPayment`, which reads the gateway's encrypted secret. Anonymous access to that table must remain denied.

The public `orderPay_POST.ts` handler also reads the order and joined customer email, verifies/retries payment, and may initiate a hosted checkout. It must not be enabled for the anonymous database role by granting broad order/customer/gateway reads. The payment helper must continue to obtain amount/currency from the persisted order and credentials only on the server.

### Required implementation before RLS activation

1. Move public order creation into a narrowly scoped SECURITY DEFINER database operation (or a rigorously isolated privileged service boundary). It must resolve a published business, independently validate every product belongs to that business and is available, validate variant selections/prices against stored variant data, recompute totals, enforce quantity and delivery/payment constraints, reserve tracked stock with row locks, upsert only the intended customer fields, and insert the order atomically. Never accept client-supplied prices, costs, totals, business IDs, payment status, or stock values.
2. Do not expose product `costPrice` or stock counts through public SQL reads. The endpoint's existing server-side projection is not sufficient protection because PostgreSQL RLS is row-level, not column-level. Use a public-safe projection/helper for storefront reads and keep inventory/cost reads inside the trusted order operation.
3. Provide a narrow order-payment lookup/claim operation keyed by published business slug plus tracking code. Return only the minimum order fields needed by the payment service; retrieve customer email and gateway secrets only inside the trusted server boundary. Do not create a public SELECT policy on `orders`, `customers`, or `payment_gateways`.
4. Make first-time checkout initiation concurrency-safe. The existing retry check prevents a second checkout only after a gateway reference is persisted; simultaneous requests can both observe no reference. Add an atomic payment-attempt claim/idempotency state before calling the provider, with a recovery policy for abandoned claims. Do not hold a database transaction open across a slow provider network call unless the design explicitly accounts for timeouts and lock contention.
5. Test stock contention (two buyers, one remaining unit), duplicate product lines, invalid/cross-business product IDs, tampered variant prices, customer upsert isolation, tracking-code collisions, provider timeouts, simultaneous payment-start requests, retry after confirmed failure, and no leakage of customer email, cost, stock, or gateway secrets.

Until these requirements are implemented and tested against a disposable clone of the real schema, public checkout remains a rollout blocker and `RLS_ENABLED=true` must remain off.
