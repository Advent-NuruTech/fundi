-- =============================================================================
-- 00031_fix_domain_isolation_trigger.sql
-- Fix: "record \"new\" has no field \"profile_id\"" when creating a business.
--
-- The domain-isolation guard from 00026 (reject_platform_admin_as_tenant) is a
-- SINGLE function attached to three tables (profiles, businesses,
-- business_members). It resolved the owner uid with one CASE expression that
-- statically referenced NEW.id, NEW.owner_uid AND NEW.profile_id:
--
--     v_uid := CASE TG_TABLE_NAME
--       WHEN 'profiles'         THEN NEW.id
--       WHEN 'businesses'       THEN NEW.owner_uid
--       WHEN 'business_members' THEN NEW.profile_id
--     END;
--
-- PL/pgSQL plans that whole expression as one statement, so Postgres must
-- resolve every column reference against the actual NEW row type. A `businesses`
-- row has no `profile_id` column, so inserting one raised
-- "record \"new\" has no field \"profile_id\"" — breaking business creation
-- (both first onboarding and "add another business").
--
-- Fix: read the relevant field through to_jsonb(NEW)->>'…' so NO static
-- per-table column reference is compiled. This works for any row type and keeps
-- the exact same guard behaviour.
-- =============================================================================

CREATE OR REPLACE FUNCTION reject_platform_admin_as_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid uuid;
  v_row jsonb := to_jsonb(NEW);
BEGIN
  v_uid := CASE TG_TABLE_NAME
    WHEN 'profiles'         THEN (v_row->>'id')::uuid
    WHEN 'businesses'       THEN (v_row->>'owner_uid')::uuid
    WHEN 'business_members' THEN (v_row->>'profile_id')::uuid
  END;

  IF v_uid IS NOT NULL AND EXISTS (
    SELECT 1 FROM platform_admins
    WHERE user_id = v_uid AND is_active = true
  ) THEN
    RAISE EXCEPTION
      'Domain violation: platform administrator % cannot own tenant data (table %)',
      v_uid, TG_TABLE_NAME
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;
