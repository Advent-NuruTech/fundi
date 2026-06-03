-- ============================================================================
-- FUNDIFLOW - Supabase Migration: 00010_auth_onboarding_rls
-- Add INSERT policies needed for new user onboarding (email + Google signup)
-- ============================================================================

-- -------------------------------------------------------------------
-- Businesses: allow a user to create a business where owner_uid = their uid
-- -------------------------------------------------------------------
CREATE POLICY businesses_insert ON businesses
  FOR INSERT WITH CHECK (owner_uid = auth.uid());

-- -------------------------------------------------------------------
-- Business Members: allow a user to insert themselves as a member of
-- a business they own (needed during signup before member record exists)
-- -------------------------------------------------------------------
CREATE POLICY business_members_insert_own ON business_members
  FOR INSERT WITH CHECK (
    profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM businesses
      WHERE id = business_id AND owner_uid = auth.uid()
    )
  );

-- -------------------------------------------------------------------
-- Business Members: allow a user to read their own record (for the
-- is_business_member check to work after they join)
-- -------------------------------------------------------------------
CREATE POLICY business_members_select_own ON business_members
  FOR SELECT USING (profile_id = auth.uid());
