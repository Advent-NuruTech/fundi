-- =============================================================================
-- 00032_business_tax_receipt.sql
-- Per-business VAT/tax configuration + receipt branding.
--
-- Every business can now generate a printable, supermarket-style receipt for any
-- order. VAT is OFF by default; when a business switches it on it can choose:
--   * tax_mode = 'inclusive' (default) — the agreed customer price already
--     includes VAT, so turning VAT on never changes what the customer owes; the
--     receipt simply breaks the price into Subtotal (excl.) + VAT.
--   * tax_mode = 'exclusive' — VAT is added on top of the agreed price.
--
-- When tax_enabled = false, the receipt must hide every VAT trace entirely (no
-- subtotal/tax rows, no placeholders) — enforced in the UI (src/lib/receipt.ts).
--
-- Backwards-compatible: all columns are nullable / defaulted, so existing
-- businesses keep working with VAT off and no branding until they opt in.
-- =============================================================================

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS tax_enabled    BOOLEAN       NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tax_rate       NUMERIC(6,2)  NOT NULL DEFAULT 16,
  ADD COLUMN IF NOT EXISTS tax_mode       TEXT          NOT NULL DEFAULT 'inclusive',
  ADD COLUMN IF NOT EXISTS tax_label      TEXT          NOT NULL DEFAULT 'VAT',
  ADD COLUMN IF NOT EXISTS logo_url       TEXT,
  ADD COLUMN IF NOT EXISTS receipt_footer TEXT;

-- Guard the tax_mode domain at the database level.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'businesses_tax_mode_check'
  ) THEN
    ALTER TABLE businesses
      ADD CONSTRAINT businesses_tax_mode_check
      CHECK (tax_mode IN ('inclusive', 'exclusive'));
  END IF;
END$$;
