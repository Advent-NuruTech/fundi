-- ============================================================================
-- FUNDIFLOW - Migration 00036: Customer Portal auto-provisioning
-- ----------------------------------------------------------------------------
-- Every customer automatically gets a portal account the moment they are added
-- to the system:
--
--   Login ID        = email (if present) else normalized phone (254XXXXXXXXX)
--   Default password = normalized phone (254XXXXXXXXX)
--
-- These columns track provisioning state. New customer rows default to
-- `portal_provision_needed = true`; existing rows are switched to false so we
-- never mass-provision historical customers without consent.
-- ============================================================================

-- 1. The portal login id assigned to this customer (email or 254... phone).
ALTER TABLE customers ADD COLUMN IF NOT EXISTS portal_login_id TEXT;

-- 2. Flag customers still waiting for portal account provisioning.
ALTER TABLE customers ADD COLUMN IF NOT EXISTS portal_provision_needed BOOLEAN NOT NULL DEFAULT true;

-- Do NOT auto-provision customers that already exist before this feature.
UPDATE customers SET portal_provision_needed = false;

-- 3. Whether the "How to access your Customer Portal" onboarding block has
--    already been included in a notification to this customer (first
--    notification only — never repeated afterwards).
ALTER TABLE customers ADD COLUMN IF NOT EXISTS portal_onboarding_sent BOOLEAN NOT NULL DEFAULT false;

-- 4. Fast lookup of pending provisioning work per business.
CREATE INDEX IF NOT EXISTS customers_portal_provision_pending_idx
  ON customers(business_id)
  WHERE portal_provision_needed = true AND portal_user_id IS NULL;
