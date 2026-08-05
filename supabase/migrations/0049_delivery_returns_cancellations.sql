-- ============================================================================
-- FUNDIFLOW - Supabase Migration: 0049_delivery_returns_cancellations
-- Delivery management, returns & alterations, and order cancellation.
--
-- Every tailoring business fulfils orders differently: some use their own
-- riders, others third-party couriers, and some hand orders to the customer at
-- the shop. This migration adds the storage for a fully configurable delivery
-- process while keeping a complete audit trail:
--
--   delivery_partners        list of riders/couriers a business can assign
--   order_returns            structured returns/alteration cycles (reason,
--                            notes, handler, extra charge, expected date)
--   order_cancellations      structured cancellation records (orders are
--                            never hard-deleted)
--   orders.delivery_*        order-level delivery workflow state + fee
--   orders.is_cancelled      soft-cancel flag so cancelled orders stay in
--                            history/reporting
--   businesses.delivery_config  jsonb policy (default method/fee, ready-made
--                            auto-deliver, per-milestone SMS toggles)
--
-- The delivery fee is stored SEPARATELY from subtotal_amount (which remains the
-- goods total). Balances computed by the app are subtotal + delivery_fee. The
-- receipt only renders a delivery line when the order is a delivery order.
-- ============================================================================

-- ── 1. delivery_partners ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS delivery_partners (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id          UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id            UUID REFERENCES branches(id) ON DELETE SET NULL,
  name                 TEXT NOT NULL,
  phone                TEXT NOT NULL DEFAULT '',
  company              TEXT,
  vehicle_type         TEXT,
  registration_number  TEXT,
  notes                TEXT,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_partners_business ON delivery_partners(business_id, is_active);

-- ── 2. order_returns ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_returns (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id              UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id                UUID REFERENCES branches(id) ON DELETE SET NULL,
  order_id                 UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  reason                   TEXT NOT NULL,
  reason_label             TEXT NOT NULL,
  notes                    TEXT,
  returned_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  handled_by_uid           TEXT,
  handled_by_name          TEXT,
  additional_charge        NUMERIC(14,2) NOT NULL DEFAULT 0,
  expected_completion_date TIMESTAMPTZ,
  image_urls               JSONB NOT NULL DEFAULT '[]'::jsonb,
  status                   TEXT NOT NULL DEFAULT 'returned',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_returns_order ON order_returns(business_id, order_id, status);

-- ── 3. order_cancellations ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_cancellations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id        UUID REFERENCES branches(id) ON DELETE SET NULL,
  order_id         UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  reason           TEXT NOT NULL,
  reason_label     TEXT NOT NULL,
  notes            TEXT,
  cancelled_by     TEXT NOT NULL DEFAULT 'business',
  cancelled_by_uid TEXT,
  cancelled_by_name TEXT,
  cancelled_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  refund_status    TEXT NOT NULL DEFAULT 'none',
  refund_amount    NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_cancellations_order ON order_cancellations(business_id, order_id);

-- ── 4. orders: delivery + cancellation columns ───────────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_method     TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee        NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address    TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_partner_id UUID REFERENCES delivery_partners(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_partner_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_stage      TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_notes      TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_timeline   JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at        TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_cancelled        BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at        TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_notes  TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_by     TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_status       TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS has_active_return   BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_orders_delivery_stage ON orders(business_id, delivery_stage);
CREATE INDEX IF NOT EXISTS idx_orders_is_cancelled ON orders(business_id, is_cancelled);

-- ── 5. businesses: delivery policy ───────────────────────────────────────────
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS delivery_config JSONB;

UPDATE businesses
SET delivery_config = '{"enabled":true,"defaultMethod":"delivery","defaultDeliveryFee":0,"freeDeliveryAbove":null,"autoDeliverReadyMade":true,"sms":{"dispatch":false,"assign":true,"pickup":true,"transit":true,"attempt":true,"delivered":true}}'::jsonb
WHERE delivery_config IS NULL;

-- ── 6. branch default trigger on new tables ──────────────────────────────────
DROP TRIGGER IF EXISTS trg_delivery_partners_branch_default ON delivery_partners;
CREATE TRIGGER trg_delivery_partners_branch_default
  BEFORE INSERT ON delivery_partners
  FOR EACH ROW EXECUTE FUNCTION set_branch_default();
DROP TRIGGER IF EXISTS trg_order_returns_branch_default ON order_returns;
CREATE TRIGGER trg_order_returns_branch_default
  BEFORE INSERT ON order_returns
  FOR EACH ROW EXECUTE FUNCTION set_branch_default();
DROP TRIGGER IF EXISTS trg_order_cancellations_branch_default ON order_cancellations;
CREATE TRIGGER trg_order_cancellations_branch_default
  BEFORE INSERT ON order_cancellations
  FOR EACH ROW EXECUTE FUNCTION set_branch_default();

-- ── 7. Row Level Security ────────────────────────────────────────────────────
ALTER TABLE delivery_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_cancellations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS delivery_partners_select ON delivery_partners;
CREATE POLICY delivery_partners_select ON delivery_partners
  FOR SELECT USING (is_business_member(business_id));
DROP POLICY IF EXISTS delivery_partners_insert ON delivery_partners;
CREATE POLICY delivery_partners_insert ON delivery_partners
  FOR INSERT WITH CHECK (has_business_capability(business_id, 'orders.write'));
DROP POLICY IF EXISTS delivery_partners_update ON delivery_partners;
CREATE POLICY delivery_partners_update ON delivery_partners
  FOR UPDATE USING (has_business_capability(business_id, 'orders.write'))
  WITH CHECK (has_business_capability(business_id, 'orders.write'));
DROP POLICY IF EXISTS delivery_partners_delete ON delivery_partners;
CREATE POLICY delivery_partners_delete ON delivery_partners
  FOR DELETE USING (has_business_capability(business_id, 'orders.write'));

DROP POLICY IF EXISTS order_returns_select ON order_returns;
CREATE POLICY order_returns_select ON order_returns
  FOR SELECT USING (is_business_member(business_id));
DROP POLICY IF EXISTS order_returns_insert ON order_returns;
CREATE POLICY order_returns_insert ON order_returns
  FOR INSERT WITH CHECK (has_business_capability(business_id, 'orders.write'));
DROP POLICY IF EXISTS order_returns_update ON order_returns;
CREATE POLICY order_returns_update ON order_returns
  FOR UPDATE USING (has_business_capability(business_id, 'orders.write'))
  WITH CHECK (has_business_capability(business_id, 'orders.write'));
DROP POLICY IF EXISTS order_returns_delete ON order_returns;
CREATE POLICY order_returns_delete ON order_returns
  FOR DELETE USING (has_business_capability(business_id, 'orders.write'));

DROP POLICY IF EXISTS order_cancellations_select ON order_cancellations;
CREATE POLICY order_cancellations_select ON order_cancellations
  FOR SELECT USING (is_business_member(business_id));
DROP POLICY IF EXISTS order_cancellations_insert ON order_cancellations;
CREATE POLICY order_cancellations_insert ON order_cancellations
  FOR INSERT WITH CHECK (has_business_capability(business_id, 'orders.write'));
DROP POLICY IF EXISTS order_cancellations_update ON order_cancellations;
CREATE POLICY order_cancellations_update ON order_cancellations
  FOR UPDATE USING (has_business_capability(business_id, 'orders.write'))
  WITH CHECK (has_business_capability(business_id, 'orders.write'));
DROP POLICY IF EXISTS order_cancellations_delete ON order_cancellations;
CREATE POLICY order_cancellations_delete ON order_cancellations
  FOR DELETE USING (has_business_capability(business_id, 'orders.write'));

-- ── 8. Triggers ──────────────────────────────────────────────────────────────
CREATE TRIGGER trg_delivery_partners_updated_at
  BEFORE UPDATE ON delivery_partners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_order_returns_updated_at
  BEFORE UPDATE ON order_returns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_order_cancellations_updated_at
  BEFORE UPDATE ON order_cancellations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 9. Grants ────────────────────────────────────────────────────────────────
GRANT ALL ON delivery_partners TO postgres, anon, authenticated, service_role;
GRANT ALL ON order_returns TO postgres, anon, authenticated, service_role;
GRANT ALL ON order_cancellations TO postgres, anon, authenticated, service_role;
