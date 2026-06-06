-- Add finance_access jsonb column to businesses table
-- Stores owner-controlled visibility settings for manager finance access

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS finance_access jsonb DEFAULT '{"coOwnerUids":[],"managerCanSeeWeekHistory":false,"managerCanSeeMonthHistory":false,"managerCanSeeYearHistory":false,"managerCanSeeOwnerKpis":false}'::jsonb;

COMMENT ON COLUMN businesses.finance_access IS 'Owner-controlled finance visibility settings for manager roles';
