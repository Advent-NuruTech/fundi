-- ============================================================================
-- FUNDIFLOW - Migration 00011: Fix auth policies and business_members integrity
-- Idempotent: uses DROP IF EXISTS + CREATE, and DO blocks for constraints.
-- ============================================================================

-- ── 1. Unique constraints on inventory tables so onboard inserts are
--       truly idempotent (INSERT ... ON CONFLICT DO NOTHING works) ────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'inventory_units_business_name_key'
  ) THEN
    ALTER TABLE inventory_units ADD CONSTRAINT inventory_units_business_name_key
      UNIQUE (business_id, name);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'inventory_categories_business_name_key'
  ) THEN
    ALTER TABLE inventory_categories ADD CONSTRAINT inventory_categories_business_name_key
      UNIQUE (business_id, name);
  END IF;
END $$;

-- ── 2. Re-create onboarding RLS policies idempotently ────────────────────────

-- Business owners can INSERT their own business
DROP POLICY IF EXISTS businesses_insert ON businesses;
CREATE POLICY businesses_insert ON businesses
  FOR INSERT WITH CHECK (owner_uid = auth.uid());

-- A user can INSERT themselves into a business they own (initial owner setup)
DROP POLICY IF EXISTS business_members_insert_own ON business_members;
CREATE POLICY business_members_insert_own ON business_members
  FOR INSERT WITH CHECK (
    profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM businesses
      WHERE id = business_id AND owner_uid = auth.uid()
    )
  );

-- A user can always read their own membership row (needed for is_business_member
-- to work before the generic select policy fires)
DROP POLICY IF EXISTS business_members_select_own ON business_members;
CREATE POLICY business_members_select_own ON business_members
  FOR SELECT USING (profile_id = auth.uid());

-- ── 3. Profiles: allow users to update their own business_id link ─────────────
-- The existing profiles_own (FOR ALL USING id = auth.uid()) already covers
-- INSERT and UPDATE, so no extra policy is needed here.

-- ── 4. Fix onboard API inventory inserts to be idempotent ────────────────────
-- The onboard route now relies on the unique constraints above; no SQL needed.

-- Done.
