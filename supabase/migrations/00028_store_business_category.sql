-- =============================================================================
-- 00028_store_business_category.sql
-- Make Global Sell aware of the seller's industry.
--
-- Each ecommerce store now carries a `store_type` mirroring the owning
-- business's `business_type` (see migration 00027). This lets the marketplace
-- categorise sellers (a duka vs a wholesaler vs a tailor), pick sensible
-- defaults (e.g. wholesalers list on the wholesale channel), and show buyers
-- what kind of shop they are browsing.
--
-- Fully backwards-compatible:
--   * Column is nullable plain text — existing rows keep working untouched.
--   * Existing stores are backfilled from their business's business_type.
--   * New categories are a code-only change (values live in
--     src/lib/business-types.ts).
-- =============================================================================

ALTER TABLE ecommerce_stores
  ADD COLUMN IF NOT EXISTS store_type text;

COMMENT ON COLUMN ecommerce_stores.store_type IS
  'Seller industry category, mirrored from businesses.business_type at store '
  'creation. Drives marketplace categorisation and default sale channel.';

-- Backfill existing stores from their owning business.
UPDATE ecommerce_stores s
SET store_type = b.business_type
FROM businesses b
WHERE s.business_id = b.id
  AND s.store_type IS NULL;

CREATE INDEX IF NOT EXISTS idx_ecommerce_stores_store_type
  ON ecommerce_stores (store_type);
