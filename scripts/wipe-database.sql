-- =============================================================================
-- wipe-database.sql — FULL FACTORY RESET
--
-- ⚠️  DESTRUCTIVE AND IRREVERSIBLE. This deletes EVERY row of data:
--       • all tenant data   (businesses, profiles, orders, customers, payments,
--                            inventory, finance, messages, ecommerce, …)
--       • all platform data (platform admins, sessions, audit logs, invites,
--                            support tickets, system config)
--       • all auth accounts (auth.users — tenants AND platform admins)
--
--     The schema, migrations, RLS policies, triggers and functions are KEPT.
--     After running, the database has ZERO items and the app behaves like a
--     fresh install: visit /ffmanage/register to bootstrap the platform owner,
--     and tenants register through the normal signup flow.
--
-- HOW TO RUN:
--   Supabase Dashboard → SQL Editor → paste this whole file → Run
--   (or: supabase db execute --file scripts/wipe-database.sql)
--
-- Take a backup first if there is any chance you need the data:
--   Supabase Dashboard → Database → Backups
-- =============================================================================

BEGIN;

-- ── 1. Empty every table in the public schema ────────────────────────────────
-- Dynamic so it always covers the full, current schema (no table left behind).
DO $$
DECLARE
  v_tables text;
BEGIN
  SELECT string_agg(format('%I.%I', schemaname, tablename), ', ')
  INTO v_tables
  FROM pg_tables
  WHERE schemaname = 'public';

  IF v_tables IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE ' || v_tables || ' RESTART IDENTITY CASCADE';
  END IF;
END $$;

-- ── 2. Delete every auth account (tenants + platform admins) ─────────────────
-- Cascades to auth.identities, auth.sessions, auth.refresh_tokens, etc.
DELETE FROM auth.users;

-- ── 3. Re-seed platform role definitions ─────────────────────────────────────
-- Pure reference data (no user/tenant content) required by migration 00022
-- so the owner-bootstrap flow at /ffmanage/register works again.
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

COMMIT;

-- ── 4. (Optional) Supabase Storage files ─────────────────────────────────────
-- Product/order images live on Cloudinary (not affected by this script —
-- clean those from the Cloudinary dashboard if needed). If you ever stored
-- files in Supabase Storage, uncomment to clear them too:
-- DELETE FROM storage.objects;

-- ── Verification: every public table should report 0 rows ────────────────────
SELECT relname AS table_name, n_live_tup AS approx_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC, relname;
