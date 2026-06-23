-- =============================================================================
-- 00026_domain_isolation.sql
-- Hard separation between the PLATFORM domain and the TENANT domain.
--
--   Platform domain → platform_admins, platform_roles, system_config,
--                     admin_sessions, admin_audit_logs, admin_invite_links
--   Tenant domain   → profiles, businesses, business_members + all business data
--
-- Rules enforced here (at the database level, so NO code path can bypass them):
--   1. A platform admin can never receive a tenant profile / business / membership.
--   2. A tenant (anyone with a profile) can never be inserted as a platform admin.
--   3. Platform tables are unreachable by anon / authenticated clients —
--      only the service role (server-side API routes) can touch them.
-- =============================================================================

-- ── 1. Block tenant rows for platform operators ──────────────────────────────

CREATE OR REPLACE FUNCTION reject_platform_admin_as_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid uuid;
BEGIN
  v_uid := CASE TG_TABLE_NAME
    WHEN 'profiles'         THEN NEW.id
    WHEN 'businesses'       THEN NEW.owner_uid
    WHEN 'business_members' THEN NEW.profile_id
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

DROP TRIGGER IF EXISTS trg_no_platform_admin_profiles ON profiles;
CREATE TRIGGER trg_no_platform_admin_profiles
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION reject_platform_admin_as_tenant();

DROP TRIGGER IF EXISTS trg_no_platform_admin_businesses ON businesses;
CREATE TRIGGER trg_no_platform_admin_businesses
  BEFORE INSERT ON businesses
  FOR EACH ROW EXECUTE FUNCTION reject_platform_admin_as_tenant();

DROP TRIGGER IF EXISTS trg_no_platform_admin_members ON business_members;
CREATE TRIGGER trg_no_platform_admin_members
  BEFORE INSERT ON business_members
  FOR EACH ROW EXECUTE FUNCTION reject_platform_admin_as_tenant();

-- ── 2. Block platform admin rows for existing tenants ────────────────────────

CREATE OR REPLACE FUNCTION reject_tenant_as_platform_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM profiles WHERE id = NEW.user_id
  ) THEN
    RAISE EXCEPTION
      'Domain violation: user % is a tenant (has a profile) and cannot become a platform admin',
      NEW.user_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_no_tenant_platform_admins ON platform_admins;
CREATE TRIGGER trg_no_tenant_platform_admins
  BEFORE INSERT ON platform_admins
  FOR EACH ROW EXECUTE FUNCTION reject_tenant_as_platform_admin();

-- ── 3. Lock platform tables away from client roles ───────────────────────────
-- RLS is already enabled with no permissive policies (deny-by-default), but
-- earlier migrations issued broad GRANTs. Revoke direct access so even an RLS
-- misconfiguration can never expose platform data to browser clients.
-- The service role bypasses both, so /api/ffmanage routes are unaffected.

REVOKE ALL ON platform_admins      FROM anon, authenticated;
REVOKE ALL ON platform_roles       FROM anon, authenticated;
REVOKE ALL ON system_config        FROM anon, authenticated;
REVOKE ALL ON admin_sessions       FROM anon, authenticated;
REVOKE ALL ON admin_audit_logs     FROM anon, authenticated;
REVOKE ALL ON admin_invite_links   FROM anon, authenticated;

-- Helper functions stay callable (SECURITY DEFINER) for RLS checks
GRANT EXECUTE ON FUNCTION is_platform_admin(uuid)  TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_role(uuid)  TO authenticated;
