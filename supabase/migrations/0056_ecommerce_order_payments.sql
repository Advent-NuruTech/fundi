-- ============================================================================
-- FUNDIFLOW - Supabase Migration: 0056_ecommerce_order_payments
-- Global Sell: Let store owners manually record payments for orders
-- ============================================================================

-- Add a timestamp for when an order was fully paid.
ALTER TABLE ecommerce_orders
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- ── ecommerce_order_payments ────────────────────────────────────────────────
-- One row per manually recorded payment on a Global Sell order.

CREATE TABLE IF NOT EXISTS ecommerce_order_payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  order_id          UUID NOT NULL REFERENCES ecommerce_orders(id) ON DELETE CASCADE,
  amount            NUMERIC(12,2) NOT NULL,
  method            ecommerce_payment_method NOT NULL DEFAULT 'manual',
  payment_reference TEXT,               -- e.g. M-Pesa transaction code
  note              TEXT,
  recorded_by_uid   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recorded_by_name  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ecommerce_order_payments_order_id
  ON ecommerce_order_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_ecommerce_order_payments_business_id
  ON ecommerce_order_payments(business_id);
CREATE INDEX IF NOT EXISTS idx_ecommerce_order_payments_created_at
  ON ecommerce_order_payments(created_at DESC);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE ecommerce_order_payments ENABLE ROW LEVEL SECURITY;

-- Seller business members can read payments recorded against their orders
CREATE POLICY "ecommerce_order_payments_seller_read"
  ON ecommerce_order_payments FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM business_members WHERE profile_id = auth.uid()
    )
  );

-- Seller business members can record payments against their own orders
CREATE POLICY "ecommerce_order_payments_seller_insert"
  ON ecommerce_order_payments FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_members WHERE profile_id = auth.uid()
    )
  );

-- ── Grants ────────────────────────────────────────────────────────────────────

GRANT ALL ON ecommerce_order_payments TO service_role;
GRANT SELECT, INSERT ON ecommerce_order_payments TO authenticated;
