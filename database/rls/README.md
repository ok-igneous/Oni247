# Oni247 PostgreSQL RLS rollout

## Status

This directory contains an RLS policy foundation, not a production-ready activation. The migration has **not** been applied to any database. It is intentionally fail-closed: tenant and user policies require a transaction-local `app.user_id` value. Until the application sets that value inside the same transaction as every protected query, normal application operations will be denied.

## Required rollout sequence

1. Export and inspect the actual target database schema. The generated Kysely schema is a source inventory, not proof of live table names, types, constraints, or existing policies.
2. Provision a dedicated runtime login that is not a superuser, does not have `BYPASSRLS`, and does not own application tables. Keep migration/owner credentials separate.
3. Grant the runtime role only the required schema usage and table/sequence privileges. Do not grant it membership that permits `SET ROLE` to the owner.
4. Implement a request-scoped database transaction. Verify the signed session first, derive the numeric user ID from the server-side session, then execute `set_config('app.user_id', user_id, true)` inside that transaction. The third argument `true` makes the setting transaction-local.
5. Ensure every SQL statement for that request uses that same transaction connection. A context set on one pooled connection cannot authorize queries executed on another.
6. Cover non-dashboard flows explicitly: public storefront reads, order/enquiry/form submissions, media upload signing, payment callbacks, email webhooks, scheduled jobs, login/session/token flows, and platform administration. Do not grant blanket public access to tenant tables.
7. Add explicit public-read policies or narrow database functions only for published storefront fields and records. Never expose payment secrets, private customer data, drafts, internal notes, email credentials, or unpublished content.
8. Apply the migration to a disposable clone, run the isolation suite, inspect query plans and logs, and only then plan a controlled staging rollout.

## Policy model

- `app_private.can_access_business(text)` authorizes a business only when the transaction-local user ID matches its owner or an active team member's `user_id`.
- Tenant-owned tables receive a single all-commands policy using their `business_id`.
- `gallery_images` derives ownership through its parent gallery.
- `businesses` derives ownership from its ID and `owner_id`.
- User-owned auth tables are scoped to the matching `users.id`.
- `login_attempts` and `platform_settings` are deliberately not covered by these tenant policies; their authentication/platform access patterns need separate review.

## Security boundaries and caveats

A custom PostgreSQL setting is trusted application context, not an unforgeable identity token. A database client able to execute arbitrary SQL as the runtime role can generally set custom GUCs. This design protects against omitted tenant predicates and accidental cross-tenant queries; it does not make SQL injection harmless. Continue using parameterized queries, strict input validation, least-privilege grants, and a non-owner runtime role.

The SECURITY DEFINER helper must be owned by a controlled migration/table-owner role. Its fixed search path and revoked PUBLIC execute privilege are deliberate. Grant execute only to the runtime role after role provisioning. Do not use FORCE ROW LEVEL SECURITY on the referenced tables without redesigning and testing the helper: its owner needs controlled visibility of ownership and membership rows to avoid recursive policy evaluation.

## Required automated tests

For two users and two businesses, verify:
- owner A can read/write A and cannot read/write B;
- active team member A can access A but not B;
- disabled, invited, and unlinked members cannot access tenant rows;
- inserts with another business ID fail;
- updates cannot move rows to another business;
- gallery images cannot be read or inserted through another business's gallery;
- user A cannot read or mutate user B's sessions, tokens, passwords, or profile;
- missing or empty `app.user_id` returns no tenant rows and rejects writes;
- connection reuse after a transaction does not retain the previous user's context;
- public routes expose only explicitly approved published data.

Do not run this migration against the Floot production database or any production database during development.
