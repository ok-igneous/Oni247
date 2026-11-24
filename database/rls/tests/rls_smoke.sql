-- Run only against a disposable PostgreSQL database after loading the real schema
-- and applying ../migrations/001_enable_tenant_rls.sql.
-- Substitute IDs that exist in the fixture database.

BEGIN;
SELECT set_config('app.user_id', '1001', true);

-- Positive owner test: replace with a known business owned by user 1001.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE owner_id = 1001) THEN
    RAISE EXCEPTION 'Fixture missing business owned by user 1001';
  END IF;
END $$;

-- Negative read test: user 1001 must not see a business owned only by user 2002.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.businesses WHERE owner_id = 2002) THEN
    RAISE EXCEPTION 'RLS failure: user 1001 can read user 2002 business';
  END IF;
END $$;

-- Anonymous context: published storefront content is readable, while private
-- submissions and payment-gateway configuration remain hidden.
SELECT set_config('app.user_id', '', true);
DO $anon$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE status = 'published') THEN
    RAISE EXCEPTION 'Fixture missing a published business or public read policy denied it';
  END IF;
  IF EXISTS (SELECT 1 FROM public.businesses WHERE status <> 'published') THEN
    RAISE EXCEPTION 'RLS failure: anonymous visitor can read an unpublished business';
  END IF;
  IF EXISTS (SELECT 1 FROM public.form_submissions) THEN
    RAISE EXCEPTION 'RLS failure: anonymous visitor can read form submissions';
  END IF;
  IF EXISTS (SELECT 1 FROM public.payment_gateways) THEN
    RAISE EXCEPTION 'RLS failure: anonymous visitor can read payment gateway rows';
  END IF;
END $anon$;

-- Platform-admin fixture: user 9001 must have users.role = 'admin'.
-- The admin context must see another tenant and may perform platform moderation.
SELECT set_config('app.user_id', '9001', true);
DO $$
DECLARE
  affected integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE owner_id = 2002) THEN
    RAISE EXCEPTION 'RLS failure: platform admin cannot read another tenant';
  END IF;

  UPDATE public.businesses
    SET updated_at = updated_at
    WHERE owner_id = 2002;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected = 0 THEN
    RAISE EXCEPTION 'RLS failure: platform admin cannot perform business moderation write';
  END IF;
END $$;

ROLLBACK;

-- Important: these smoke checks are not a substitute for integration tests that
-- execute as the actual non-owner runtime role with two independent tenants.
