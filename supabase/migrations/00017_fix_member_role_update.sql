-- Allow business managers (team.manage capability) to update role/roles on member profiles.
-- The existing profiles_own policy only allows id = auth.uid() (self-update), which silently
-- blocks owners from updating another employee's role even though the intent is supported.
CREATE POLICY profiles_manager_update ON profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM business_members bm
      WHERE bm.profile_id = profiles.id
        AND has_business_capability(bm.business_id, 'team.manage')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM business_members bm
      WHERE bm.profile_id = profiles.id
        AND has_business_capability(bm.business_id, 'team.manage')
    )
  );
