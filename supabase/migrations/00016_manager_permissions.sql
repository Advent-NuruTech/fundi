-- ============================================================================
-- FundiFlow Migration 00016: Per-Manager Permissions & Audit Log Enhancement
-- Extends finance_access JSONB to support individual manager permission sets.
-- Adds audit_log columns needed for permission change tracking.
-- ============================================================================

-- 1. Update the default for finance_access to include the new managerPermissions map
ALTER TABLE businesses
  ALTER COLUMN finance_access SET DEFAULT '{
    "coOwnerUids": [],
    "managerCanSeeWeekHistory": false,
    "managerCanSeeMonthHistory": false,
    "managerCanSeeYearHistory": false,
    "managerCanSeeOwnerKpis": false,
    "managerPermissions": {}
  }'::jsonb;

-- 2. Backfill existing rows that don't yet have managerPermissions
UPDATE businesses
SET finance_access = finance_access || '{"managerPermissions": {}}'::jsonb
WHERE finance_access IS NOT NULL
  AND NOT (finance_access ? 'managerPermissions');

UPDATE businesses
SET finance_access = '{
  "coOwnerUids": [],
  "managerCanSeeWeekHistory": false,
  "managerCanSeeMonthHistory": false,
  "managerCanSeeYearHistory": false,
  "managerCanSeeOwnerKpis": false,
  "managerPermissions": {}
}'::jsonb
WHERE finance_access IS NULL;

-- 3. Add columns to audit_logs if they don't exist
--    (actor_name, target_uid, previous_value, new_value may already exist)
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS actor_name text,
  ADD COLUMN IF NOT EXISTS target_uid uuid,
  ADD COLUMN IF NOT EXISTS action text,
  ADD COLUMN IF NOT EXISTS previous_value text,
  ADD COLUMN IF NOT EXISTS new_value text;

-- 4. Index for fast permission audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_permission_changes
  ON audit_logs (business_id, action, created_at DESC)
  WHERE action = 'update_manager_permissions';

COMMENT ON COLUMN businesses.finance_access IS
  'Owner-controlled finance visibility: coOwnerUids, legacy global toggles, and per-manager permissions map keyed by uid';
