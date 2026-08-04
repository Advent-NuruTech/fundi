-- ============================================================================
-- FUNDIFLOW - Supabase Migration: 0047_unified_inventory_orders
-- Unified Inventory & Sales Model
--
-- Everything that can be stocked belongs to inventory. Orders simply consume
-- inventory in different ways. This migration adds:
--
--   inventory_materials.item_type   fabric | ready_made | material | accessory
--                                   | consumable | other  (default: material)
--   inventory_materials.sku         auto-generated from the name, editable
--   inventory_materials.size/color/brand
--   inventory_materials.selling_price / wholesale_price / minimum_selling_price
--   orders.order_type               tailoring | ready_made_sale | ...
--   order_items                     unified line items — each item picks its own
--                                   workflow (tailored / ready_made / alteration
--                                   / material / service) while staying part of
--                                   ONE customer order
--   order_item_material_usage       per-item material consumption
-- ============================================================================

-- ── 1. Enums ─────────────────────────────────────────────────────────────────
CREATE TYPE inventory_item_type AS ENUM (
  'fabric',
  'ready_made',
  'material',
  'accessory',
  'consumable',
  'other'
);

CREATE TYPE order_item_type AS ENUM (
  'tailored',
  'ready_made',
  'alteration',
  'material',
  'service'
);

CREATE TYPE order_type AS ENUM (
  'tailoring',
  'ready_made_sale',
  'ready_made_alteration',
  'material_sale',
  'mixed'
);

-- ── 2. inventory_materials: unified item fields ──────────────────────────────
ALTER TABLE inventory_materials ADD COLUMN IF NOT EXISTS item_type             inventory_item_type NOT NULL DEFAULT 'material';
ALTER TABLE inventory_materials ADD COLUMN IF NOT EXISTS sku                   TEXT;
ALTER TABLE inventory_materials ADD COLUMN IF NOT EXISTS size                  TEXT;
ALTER TABLE inventory_materials ADD COLUMN IF NOT EXISTS color                 TEXT;
ALTER TABLE inventory_materials ADD COLUMN IF NOT EXISTS brand                 TEXT;
ALTER TABLE inventory_materials ADD COLUMN IF NOT EXISTS selling_price         NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (selling_price >= 0);
ALTER TABLE inventory_materials ADD COLUMN IF NOT EXISTS wholesale_price       NUMERIC(12,2) CHECK (wholesale_price >= 0);
ALTER TABLE inventory_materials ADD COLUMN IF NOT EXISTS minimum_selling_price NUMERIC(12,2) CHECK (minimum_selling_price >= 0);

CREATE INDEX IF NOT EXISTS idx_inventory_materials_item_type ON inventory_materials(business_id, item_type);
CREATE INDEX IF NOT EXISTS idx_inventory_materials_sku       ON inventory_materials(business_id, sku);

-- ── 3. orders: overall order type ────────────────────────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type order_type NOT NULL DEFAULT 'tailoring';

-- ── 4. order_items: unified line items ───────────────────────────────────────
-- Each row references the SAME inventory record (inventory_item_id) no matter
-- whether it is used in tailoring, sold ready-made, altered, or sold as raw
-- material. Price/cost fields are snapshots taken at sale time so historical
-- profit stays accurate even when the product price changes later.
CREATE TABLE IF NOT EXISTS order_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id              UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_type             order_item_type NOT NULL,
  inventory_item_id     UUID REFERENCES inventory_materials(id) ON DELETE SET NULL,
  inventory_item_name   TEXT,
  sku                   TEXT,
  category_name         TEXT,
  size                  TEXT,
  color                 TEXT,
  brand                 TEXT,
  quantity              NUMERIC(12,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit                  TEXT,
  unit_price            NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  cost_price            NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  discount              NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total_amount          NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  measurements          JSONB,
  style_notes           TEXT,
  assigned_tailor_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_tailor_name  TEXT,
  stage                 production_stage,
  delivery_status       delivery_status NOT NULL DEFAULT 'pending',
  status                TEXT NOT NULL DEFAULT 'active',
  ready_date            TIMESTAMPTZ,
  notes                 TEXT,
  sort_order            INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order      ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_inventory  ON order_items(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_order_items_type       ON order_items(order_id, item_type);

-- ── 5. order_item_material_usage: per-item consumption ───────────────────────
CREATE TABLE IF NOT EXISTS order_item_material_usage (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id     UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  material_id       UUID REFERENCES inventory_materials(id) ON DELETE SET NULL,
  material_name     TEXT NOT NULL,
  quantity_used     NUMERIC(10,2) NOT NULL CHECK (quantity_used > 0),
  unit              TEXT NOT NULL,
  recorded_by_uid   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  recorded_by_name  TEXT,
  recorded_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_item_material_usage_item ON order_item_material_usage(order_item_id);

-- ── 6. Backfill existing tailoring garments into order_items ────────────────
INSERT INTO order_items (
  order_id,
  item_type,
  inventory_item_name,
  quantity,
  unit,
  unit_price,
  total_amount,
  style_notes,
  sort_order
)
SELECT
  og.order_id,
  'tailored'::order_item_type,
  og.name,
  og.quantity,
  'pcs',
  og.agreed_price,
  og.agreed_price * og.quantity,
  og.style_notes,
  og.sort_order
FROM order_garments og
ON CONFLICT DO NOTHING;

-- ── 7. Row Level Security ────────────────────────────────────────────────────
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_material_usage ENABLE ROW LEVEL SECURITY;

-- Child tables carry no business_id; access is derived from the parent order,
-- exactly like order_garments / order_members.
CREATE POLICY order_items_select ON order_items
  FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE is_business_member(business_id))
  );

CREATE POLICY order_items_insert ON order_items
  FOR INSERT WITH CHECK (
    order_id IN (SELECT id FROM orders WHERE has_business_capability(business_id, 'orders.write'))
  );

CREATE POLICY order_items_update ON order_items
  FOR UPDATE USING (
    order_id IN (SELECT id FROM orders WHERE has_business_capability(business_id, 'orders.write'))
  )
  WITH CHECK (
    order_id IN (SELECT id FROM orders WHERE has_business_capability(business_id, 'orders.write'))
  );

CREATE POLICY order_items_delete ON order_items
  FOR DELETE USING (
    order_id IN (SELECT id FROM orders WHERE has_business_capability(business_id, 'orders.write'))
  );

CREATE POLICY order_item_material_usage_select ON order_item_material_usage
  FOR SELECT USING (
    order_item_id IN (
      SELECT id FROM order_items
      WHERE order_id IN (SELECT id FROM orders WHERE is_business_member(business_id))
    )
  );

CREATE POLICY order_item_material_usage_insert ON order_item_material_usage
  FOR INSERT WITH CHECK (
    order_item_id IN (
      SELECT id FROM order_items
      WHERE order_id IN (SELECT id FROM orders WHERE has_business_capability(business_id, 'orders.write'))
    )
  );

CREATE POLICY order_item_material_usage_update ON order_item_material_usage
  FOR UPDATE USING (
    order_item_id IN (
      SELECT id FROM order_items
      WHERE order_id IN (SELECT id FROM orders WHERE has_business_capability(business_id, 'orders.write'))
    )
  )
  WITH CHECK (
    order_item_id IN (
      SELECT id FROM order_items
      WHERE order_id IN (SELECT id FROM orders WHERE has_business_capability(business_id, 'orders.write'))
    )
  );

CREATE POLICY order_item_material_usage_delete ON order_item_material_usage
  FOR DELETE USING (
    order_item_id IN (
      SELECT id FROM order_items
      WHERE order_id IN (SELECT id FROM orders WHERE has_business_capability(business_id, 'orders.write'))
    )
  );

-- ── 8. Triggers ──────────────────────────────────────────────────────────────
CREATE TRIGGER trg_order_items_updated_at
  BEFORE UPDATE ON order_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 9. Grants ────────────────────────────────────────────────────────────────
-- Migration 00012 sets default privileges for future tables, but grants are
-- repeated here for explicitness/robustness.
GRANT ALL ON order_items                TO postgres, anon, authenticated, service_role;
GRANT ALL ON order_item_material_usage  TO postgres, anon, authenticated, service_role;
GRANT USAGE ON TYPE inventory_item_type TO postgres, anon, authenticated, service_role;
GRANT USAGE ON TYPE order_item_type     TO postgres, anon, authenticated, service_role;
GRANT USAGE ON TYPE order_type          TO postgres, anon, authenticated, service_role;
