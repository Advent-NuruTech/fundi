-- =============================================================================
-- reset-platform-owners.sql
--
-- Resets the platform owner table so the /ffmanage/register page accepts
-- new system owner registrations again (using SYSTEM_OWNER_PASSCODE).
--
-- Run this in: Supabase Dashboard → SQL Editor
--
-- After running, visit /ffmanage/register and enter the SYSTEM_OWNER_PASSCODE
-- from your .env.local to create a new owner account.
-- Multiple owners can be created — each must supply the same passcode.
-- =============================================================================

-- 1. Revoke active admin sessions for ALL current owners
DELETE FROM admin_sessions
WHERE user_id IN (
  SELECT user_id FROM platform_admins WHERE role = 'owner'
);

-- 2. Remove platform owner records
--    (does NOT delete the auth.users rows — those are kept for audit history)
DELETE FROM platform_admins WHERE role = 'owner';

-- 3. Reset system_config ownership keys
DELETE FROM system_config
WHERE key IN ('system_owner_uid', 'system_initialized');

-- Keep public_signup_enabled = true so tenants can still register.
-- Update it explicitly to be safe:
INSERT INTO system_config (key, value)
VALUES ('public_signup_enabled', 'true')
ON CONFLICT (key) DO UPDATE SET value = 'true';

-- Done.
-- Now go to /ffmanage/register, enter your SYSTEM_OWNER_PASSCODE, and create
-- the new owner account. You can repeat this for as many owners as you want.
