-- =============================================================================
-- 00022_platform_separation.sql
-- Enforces strict domain separation between platform operators and tenants.
--
-- Platform domain  → platform_admins, platform_roles
-- Tenant domain    → businesses, profiles, business_members  (unchanged)
--
-- Platform admins are auth.users who exist ONLY in platform_admins.
-- They are NOT tenants and must NEVER appear in tenant queries or dashboards.
-- =============================================================================

-- ── Platform roles ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS platform_roles (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text        UNIQUE NOT NULL,
  permissions jsonb       DEFAULT '[]',
  description text,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE platform_roles ENABLE ROW LEVEL SECURITY;

INSERT INTO platform_roles (name, description, permissions) VALUES
  ('owner',
   'System owner — unrestricted access to all platform operations',
   '["*"]'),
  ('super_admin',
   'Super administrator — full access except owner-only operations',
   '["businesses.*","billing.*","support.*","sms.*","analytics.*","system.*","invites.*"]'),
  ('support_admin',
   'Support administrator — support tickets and tenant assistance',
   '["support.*","businesses.view"]'),
  ('billing_admin',
   'Billing administrator — billing and subscription management',
   '["billing.*","businesses.view"]'),
  ('operations_admin',
   'Operations administrator — system health and monitoring',
   '["system.*","analytics.*"]')
ON CONFLICT (name) DO NOTHING;

-- ── Platform admins ───────────────────────────────────────────────────────────
-- Explicit identity table for platform operators.
-- These users are NOT tenants. They manage the SaaS itself.

CREATE TABLE IF NOT EXISTS platform_admins (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text        NOT NULL DEFAULT 'super_admin'
                          REFERENCES platform_roles(name)
                          ON UPDATE CASCADE,
  email       text        NOT NULL,
  full_name   text,
  is_active   boolean     DEFAULT true,
  created_by  uuid        REFERENCES platform_admins(id) ON DELETE SET NULL,
  notes       text,
  last_login_at timestamptz,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

-- ── Helper functions ─────────────────────────────────────────────────────────

-- Returns TRUE if the uid belongs to an active platform admin
CREATE OR REPLACE FUNCTION is_platform_admin(check_uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM platform_admins
    WHERE user_id = check_uid AND is_active = true
  );
$$;

-- Returns the platform role for a uid, or NULL if not a platform admin
CREATE OR REPLACE FUNCTION get_platform_role(check_uid uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM platform_admins
  WHERE user_id = check_uid AND is_active = true
  LIMIT 1;
$$;

-- Returns all active platform admin user_ids (used to exclude from tenant queries)
CREATE OR REPLACE FUNCTION platform_admin_uids()
RETURNS uuid[]
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(array_agg(user_id), '{}')
  FROM platform_admins
  WHERE is_active = true;
$$;

-- ── Backfill existing system owner ───────────────────────────────────────────
-- If system_config already has a system_owner_uid (previous installation),
-- create the platform_admins entry automatically so the owner can still sign in.

DO $$
DECLARE
  v_raw     text;
  v_uid     uuid;
  v_email   text;
BEGIN
  SELECT value::text INTO v_raw
  FROM system_config
  WHERE key = 'system_owner_uid';

  -- Strip JSON quotes if stored as '"uuid-value"'
  v_raw := btrim(v_raw, '"');

  IF v_raw IS NOT NULL AND v_raw NOT IN ('', 'null') THEN
    BEGIN
      v_uid := v_raw::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_uid := NULL;
    END;

    IF v_uid IS NOT NULL THEN
      SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

      IF v_email IS NOT NULL THEN
        INSERT INTO platform_admins (user_id, role, email, is_active)
        VALUES (v_uid, 'owner', v_email, true)
        ON CONFLICT (user_id) DO NOTHING;
      END IF;
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL; -- system_config may not exist yet on fresh installs
END $$;
