# Oni247 PostgreSQL RLS rollout

## Status

This directory contains an RLS policy foundation and an initial request-context integration, not a production-ready activation. The migration has **not** been applied to any database. Tenant policies require a transaction-local `app.user_id`; the API now establishes this for authenticated endpoint execution, but concurrency and integration tests are still outstanding.

## Required rollout sequence

1. Export and inspect the actual target database schema. The generated Kysely schema is a source inventory, not proof of live table names, types, constraints, or existing policies.
2. Provision a dedicated runtime login that is not a superuser, does not have `BYPASSRLS`, and does not own application tables. Keep migration/owner credentials separate.
3. Grant the runtime role only the required schema usage and table/sequence privileges. Do not grant it membership that permits `SET ROLE` to the owner.
4. The standalone API verifies the signed/session-backed user before endpoint execution, then wraps authenticated non-authentication endpoint execution in `withUserDatabaseContext`. Routes under `auth/` remain outside this tenant transaction because they are authentication/bootstrap flows over deliberately excluded tables. Existing nested `db.transaction()` calls in other authenticated endpoints are routed through PostgreSQL savepoints on the same request transaction and connection; this compatibility layer still requires rollback and nesting tests. That helper sets `app.user_id` transaction-locally and uses `AsyncLocalStorage` so existing `db` calls in the endpoint resolve to the same Kysely transaction. This is an implementation milestone, not yet validated by a runtime test.
5. The API now consumes each endpoint response body before leaving the authenticated request transaction, so lazy response streams cannot accidentally perform database reads after tenant context has closed. This still needs a regression test with a lazy DB-backed response. Before activation, test context propagation under concurrent requests, nested transactions, errors/rollback, and connection reuse.
6. Cover non-dashboard flows explicitly: public storefront reads, order/enquiry/form submissions, media upload signing, payment callbacks, email webhooks, scheduled jobs, login/session/token flows, and platform administration. Do not grant blanket public access to tenant tables.
7. Add explicit public-read policies or narrow database functions only for published storefront fields and records. Never expose payment secrets, private customer data, drafts, internal notes, email credentials, or unpublished content.
8. Apply the migration to a disposable clone, run the isolation suite, inspect query plans and logs, and only then plan a controlled staging rollout.



Authentication hardening: `JWT_SECRET` validation is performed outside the invalid-token catch. A missing or undersized secret therefore fails as a server configuration error instead of being downgraded to an unauthenticated request. A focused regression spec covers both invalid configuration and invalid tokens; it has not yet been executed.

## Policy model

- `app_private.can_access_business(text)` authorizes a business only when the transaction-local user ID matches its owner or an active team member's `user_id`. Pending invitations do not grant tenant access. Invitation acceptance must use a separate, narrowly scoped operation that verifies the signed-in user's email, activates only that invitation, and then allows normal active-membership policies to apply.
- Tenant-owned tables receive a single all-commands policy using their `business_id`.
- `gallery_images` derives ownership through its parent gallery.
- `businesses` allows owner/team-member reads through the membership helper, but only the owner may insert, update, or delete the business record.
- Authentication tables (`sessions`, `auth_tokens`, `user_passwords`, and `users`) are deliberately excluded from this first migration. Session lookup must happen before the server knows the user ID; applying a user-ID policy to session lookup would create an authentication bootstrap deadlock. Add dedicated policies only after designing narrow auth access paths.
- `login_attempts` and `platform_settings` are deliberately not covered by these tenant policies; their authentication/platform access patterns need separate review.

## Security boundaries and caveats

A custom PostgreSQL setting is trusted application context, not an unforgeable identity token. A database client able to execute arbitrary SQL as the runtime role can generally set custom GUCs. This design protects against omitted tenant predicates and accidental cross-tenant queries; it does not make SQL injection harmless. Continue using parameterized queries, strict input validation, least-privilege grants, and a non-owner runtime role.

The SECURITY DEFINER helpers must be owned by a controlled migration/table-owner role. Their fixed search paths and revoked PUBLIC execute privileges are deliberate. The runtime role needs `USAGE` on `app_private` and explicit `EXECUTE` grants on `can_access_business(text)` and `activate_invited_team_member(text)` after role provisioning. Do not grant either privilege to `PUBLIC`. Enable `RLS_ENABLED=true` in the API only after the migration and grants are present; the invitation helper is called only in that mode. It requires a verified account email and activates exactly one matching invitation (or the explicitly requested business); if an unscoped user has multiple pending invitations, it refuses to choose. Do not use FORCE ROW LEVEL SECURITY on the referenced tables without redesigning and testing the helper: its owner needs controlled visibility of ownership and membership rows to avoid recursive policy evaluation.

## Required automated tests

For two users and two businesses, verify:
- owner A can read/write A and cannot read/write B;
- active team member A can access A but not B;
- disabled, invited, and unlinked members cannot access tenant rows; invitation acceptance is tested only through its dedicated activation path;
- inserts with another business ID fail;
- updates cannot move rows to another business;
- gallery images cannot be read or inserted through another business's gallery;
- authentication/session/token/password/profile operations are tested against their separately designed access controls before any auth-table RLS is enabled;
- missing or empty `app.user_id` returns no tenant rows and rejects writes;
- connection reuse after a transaction does not retain the previous user's context;
- public routes expose only explicitly approved published data.

Do not run this migration against the Floot production database or any production database during development.
