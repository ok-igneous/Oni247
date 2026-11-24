## PostgreSQL RLS foundation (staged; not activated)

- Added `database/rls/migrations/001_enable_tenant_rls.sql` with tenant policies for the business-owned tables inventoried in `helpers/schema.tsx`, parent-derived isolation for gallery images, and user scoping for sessions, auth tokens, passwords, and profiles.
- Added `database/rls/README.md` documenting runtime-role requirements, transaction-local identity context, public storefront separation, rollout order, and required isolation tests.
- Added `database/rls/tests/rls_smoke.sql` as a disposable-database smoke-test starting point.
- The SQL migration has **not** been applied to any database. It requires a real-schema comparison, a non-owner/non-BYPASSRLS runtime role, and application request transactions that set `app.user_id` with transaction-local `set_config(..., true)`.
- The current application still issues queries through a shared Kysely instance and has not yet been converted to a request-scoped transaction boundary. Applying RLS now would deny normal application requests. Public storefront, payment, webhook, email, login, and platform-admin flows also require separately designed policies or narrowly scoped service access.
- The smoke SQL is not a complete integration suite and has not been executed. No RLS build, database test, or production deployment is claimed.
