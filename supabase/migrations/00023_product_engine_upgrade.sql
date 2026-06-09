-- =============================================================================
-- 00023_product_engine_upgrade.sql
-- Upgrades ecommerce tables for dual-channel (retail + wholesale) product engine.
-- Adds: sale_channel, wholesale pricing, variant image JSON, and channel index.
-- All columns are additive (nullable / defaulted) — no breaking changes.
-- =============================================================================

-- ── ecommerce_products: dual-channel + wholesale defaults ────────────────────

ALTER TABLE ecommerce_products
  ADD COLUMN IF NOT EXISTS sale_channel   text    DEFAULT 'retail'
    CHECK (sale_channel IN ('retail', 'wholesale', 'both')),
  ADD COLUMN IF NOT EXISTS wholesale_price    numeric(12,2),
  ADD COLUMN IF NOT EXISTS wholesale_min_qty  integer DEFAULT 1;

-- ── ecommerce_product_variants: wholesale + multi-image JSONB ────────────────

ALTER TABLE ecommerce_product_variants
  ADD COLUMN IF NOT EXISTS wholesale_price      numeric(12,2),
  ADD COLUMN IF NOT EXISTS wholesale_min_qty    integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS variant_images       jsonb   DEFAULT '[]'::jsonb;

-- ── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_ecommerce_products_sale_channel
  ON ecommerce_products (sale_channel)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_ecommerce_products_channel_status
  ON ecommerce_products (sale_channel, status);
