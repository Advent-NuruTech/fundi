-- ============================================================================
-- FUNDIFLOW - Supabase Migration: 00034_customer_gender_unlimited_measurements
-- Adds gender to customers, unlimited custom measurements via JSONB
-- ============================================================================

-- ── 1. Gender column on customers ───────────────────────────────────────────
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gender TEXT;

-- ── 2. JSONB values column on customer_measurements for unlimited k/v pairs ─
ALTER TABLE customer_measurements ADD COLUMN IF NOT EXISTS values JSONB DEFAULT '{}'::jsonb;

-- ── 3. Migrate existing fixed-column data into the JSONB values column ─────
UPDATE customer_measurements
SET values = (
  SELECT jsonb_strip_nulls(jsonb_build_object(
    'bust', bust,
    'waist', waist,
    'hips', hips,
    'height', height,
    'shoulder', shoulder,
    'sleeve', sleeve,
    'inseam', inseam,
    'length', length,
    'neck', neck,
    'thigh', thigh,
    'notes', notes
  ))
)
WHERE values = '{}'::jsonb
  AND (bust IS NOT NULL OR waist IS NOT NULL OR hips IS NOT NULL
    OR height IS NOT NULL OR shoulder IS NOT NULL OR sleeve IS NOT NULL
    OR inseam IS NOT NULL OR length IS NOT NULL OR neck IS NOT NULL
    OR thigh IS NOT NULL OR notes IS NOT NULL);

-- ── 4. Index on the JSONB column for query performance ─────────────────────
CREATE INDEX IF NOT EXISTS idx_customer_measurements_values
  ON customer_measurements USING gin (values);
