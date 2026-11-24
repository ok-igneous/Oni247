-- Oni247 PostgreSQL RLS foundation.
-- Apply only after provisioning a non-owner runtime role and deploying request-scoped
-- transaction context (SET LOCAL app.user_id = '<verified users.id>').
-- This migration intentionally does NOT grant public storefront access.
BEGIN;

CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC;

-- SECURITY DEFINER is intentional: this function reads the ownership and team
-- membership tables while policies on those same tables are being evaluated.
-- The function owner must own these tables; the application runtime must NOT.
CREATE OR REPLACE FUNCTION app_private.can_access_business(target_business_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    NULLIF(current_setting('app.user_id', true), '') IS NOT NULL
    AND target_business_id IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM public.businesses b
        WHERE b.id::text = target_business_id
          AND b.owner_id::text = current_setting('app.user_id', true)
      )
      OR EXISTS (
        SELECT 1
        FROM public.team_members tm
        WHERE tm.business_id::text = target_business_id
          AND tm.user_id::text = current_setting('app.user_id', true)
          AND lower(tm.status) = 'active'
      )
    );
$$;

REVOKE ALL ON FUNCTION app_private.can_access_business(text) FROM PUBLIC;

-- Tenant-owned tables verified in the generated Kysely schema.
DO $migration$
DECLARE
  table_name text;
  tenant_tables text[] := ARRAY[
    'addon_purchases',
    'blog_posts',
    'categories',
    'comments',
    'customers',
    'email_automations',
    'email_campaigns',
    'email_contacts',
    'email_drafts',
    'email_inbox',
    'email_settings',
    'email_templates',
    'enquiries',
    'events',
    'forms',
    'form_submissions',
    'galleries',
    'link_payments',
    'media_assets',
    'orders',
    'payment_gateways',
    'payment_links',
    'portfolio_items',
    'product_creation_attempts',
    'products',
    'reactions',
    'service_bookings',
    'showcases',
    'store_events',
    'subscription_payments',
    'team_members',
    'team_roles',
    'testimonials'
  ];
BEGIN
  FOREACH table_name IN ARRAY tenant_tables LOOP
    IF to_regclass(format('public.%I', table_name)) IS NULL THEN
      RAISE EXCEPTION 'RLS migration expected public.% to exist', table_name;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS oni247_tenant_isolation ON public.%I', table_name);
    EXECUTE format(
      'CREATE POLICY oni247_tenant_isolation ON public.%I
       FOR ALL
       USING (app_private.can_access_business(business_id::text))
       WITH CHECK (app_private.can_access_business(business_id::text))',
      table_name
    );
  END LOOP;
END
$migration$;

-- businesses has owner_id rather than business_id.
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS oni247_business_select ON public.businesses;
DROP POLICY IF EXISTS oni247_business_owner_write ON public.businesses;

-- Team members may resolve/read a business they belong to, but the tenant
-- backstop does not let a team member bypass application permissions to mutate
-- the business record itself. Only its owner may write this row.
CREATE POLICY oni247_business_select ON public.businesses
  FOR SELECT
  USING (app_private.can_access_business(id::text));

CREATE POLICY oni247_business_owner_write ON public.businesses
  FOR ALL
  USING (owner_id::text = current_setting('app.user_id', true))
  WITH CHECK (owner_id::text = current_setting('app.user_id', true));

-- Child rows inherit tenant access through their parent gallery.
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS oni247_gallery_image_isolation ON public.gallery_images;
CREATE POLICY oni247_gallery_image_isolation ON public.gallery_images
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.galleries g
      WHERE g.id = gallery_images.gallery_id
        AND app_private.can_access_business(g.business_id::text)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.galleries g
      WHERE g.id = gallery_images.gallery_id
        AND app_private.can_access_business(g.business_id::text)
    )
  );

-- Authentication tables are deliberately excluded from this first RLS migration.
-- Session resolution must read a session cookie before the application knows the
-- authenticated user_id. Applying user_id-based RLS to sessions here would create
-- an authentication bootstrap deadlock. Password resets, token verification,
-- user-profile access, and session cleanup need dedicated narrowly-scoped access
-- paths and policies before those tables can be protected by RLS.

COMMIT;
