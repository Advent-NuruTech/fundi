-- =============================================================================
-- 00027_business_categories.sql
-- Multi-industry support: FundiFlow now serves more than tailoring workshops.
--
-- Adds a `business_type` to every business so the app can tailor terminology,
-- navigation, dashboards and the default inventory taxonomy to the industry
-- the SME actually operates in (tailoring, retail, wholesale, hardware, …).
--
-- This is fully backwards-compatible:
--   * The column defaults to 'tailoring', so EVERY existing business keeps its
--     current tailoring experience untouched.
--   * The column is plain text (not an enum) so adding new categories later is
--     a code-only change — no further migration required.
-- =============================================================================

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS business_type text NOT NULL DEFAULT 'tailoring';

COMMENT ON COLUMN businesses.business_type IS
  'Industry category that drives terminology / navigation / dashboard presets. '
  'Known values live in src/lib/business-types.ts (tailoring, retail, wholesale, hardware, general).';

-- Existing rows are already covered by the DEFAULT above; this keeps any NULLs
-- (e.g. from older partial inserts) consistent.
UPDATE businesses SET business_type = 'tailoring' WHERE business_type IS NULL;
