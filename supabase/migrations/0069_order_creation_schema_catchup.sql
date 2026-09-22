-- ============================================================================
-- FUNDIFLOW - Migration: 0069_order_creation_schema_catchup
--
-- Safety-net migration for "The order was not created. Please try again."
--
-- If any earlier migration in the 0046-0062 range was not applied to the
-- live Supabase database, inserting an order fails (missing column/table/enum)
-- and the app shows a generic error. This migration adds every object that the
-- online createOrder() path in src/lib/supabase.service.ts relies on.
--
-- It is 100% idempotent: every statement is guarded (IF NOT EXISTS),
-- wrapped in DO blocks, or uses DROP ... IF EXISTS + CREATE so it can be
-- re-run safely against a database that already has the objects.
-- ============================================================================

BEGIN;

-- ── 1. Enums used by the order schema ────────────────────────────────────────
DO $$
BEGIN
  CREATE TYPE inventory_item_type AS ENUM ('fabric','ready_made','material','accessory','consumable','other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE order_item_type AS ENUM ('tailored','ready_made','alteration','material','service');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE order_type AS ENUM ('tailoring','ready_made_sale','ready_made_alteration','material_sale','mixed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE stage_milestone AS ENUM ('none','ready_for_pickup','delivered');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 2. delivery_partners (FK target for orders.delivery_partner_id) ──────────
CREATE TABLE IF NOT EXISTS delivery_partners (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id          UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
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

-- branch_id only when the branches feature exists (skips cleanly otherwise).
DO $$
BEGIN
  IF to_regclass('public.branches') IS NOT NULL THEN
    ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_delivery_partners_business ON delivery_partners(business_id, is_active);

-- ── 3. production_stages (custom pipeline + current_stage_id target) ─────────
CREATE TABLE IF NOT EXISTS production_stages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  description      TEXT,
  display_order    INTEGER NOT NULL DEFAULT 0,
  color            TEXT,
  icon             TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  notify_customer  BOOLEAN NOT NULL DEFAULT FALSE,
  milestone        stage_milestone NOT NULL DEFAULT 'none',
  is_seeded        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, name)
);

CREATE INDEX IF NOT EXISTS idx_production_stages_business ON production_stages(business_id, display_order);

-- ── 4. orders: every column createOrder() may insert ─────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_token TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_group_order BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type order_type NOT NULL DEFAULT 'tailoring';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS current_stage_id UUID REFERENCES production_stages(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS current_stage_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_stage_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_method TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_partner_id UUID REFERENCES delivery_partners(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_partner_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_stage TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_timeline JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS representative_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS representative_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS representative_phone TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS representative_email TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payer_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payer_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payer_phone TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delay_reason TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_by TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_status TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS has_active_return BOOLEAN NOT NULL DEFAULT FALSE;

-- Branch scoping column (nullable, no FK so it cannot fail when branches don't exist).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS branch_id UUID;

CREATE INDEX IF NOT EXISTS idx_orders_delivery_stage ON orders(business_id, delivery_stage);
CREATE INDEX IF NOT EXISTS idx_orders_is_cancelled ON orders(business_id, is_cancelled);
CREATE INDEX IF NOT EXISTS idx_orders_current_stage ON orders(current_stage_id);

-- Ensure the default-delivery policy exists for every business.
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS delivery_config JSONB;
UPDATE businesses
SET delivery_config = '{"enabled":true,"defaultMethod":"delivery","defaultDeliveryFee":0,"freeDeliveryAbove":null,"autoDeliverReadyMade":true,"sms":{"dispatch":false,"assign":true,"pickup":true,"transit":true,"attempt":true,"delivered":true}}'::jsonb
WHERE delivery_config IS NULL;

-- ── 5. order_items: unified line items ───────────────────────────────────────
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
  member_customer_id    UUID REFERENCES customers(id) ON DELETE SET NULL,
  member_name           TEXT,
  reference_image_url   TEXT,
  quantity              NUMERIC(12,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit                  TEXT,
  unit_price            NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  cost_price            NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  discount              NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total_amount          NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  included_parts        JSONB NOT NULL DEFAULT '[]'::jsonb,
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

-- Repair a partially-applied order_items table column by column.
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS inventory_item_name TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS category_name TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS size TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS member_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS member_name TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS reference_image_url TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS included_parts JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS measurements JSONB;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS style_notes TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS assigned_tailor_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS assigned_tailor_name TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS ready_date TIMESTAMPTZ;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_included_parts_is_array;
ALTER TABLE order_items ADD CONSTRAINT order_items_included_parts_is_array
  CHECK (jsonb_typeof(included_parts) = 'array');

CREATE INDEX IF NOT EXISTS idx_order_items_order     ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_inventory ON order_items(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_order_items_type      ON order_items(order_id, item_type);
CREATE INDEX IF NOT EXISTS idx_order_items_member    ON order_items(order_id, member_customer_id);

-- ── 6. order_members + order_member_garments (group orders) ──────────────────
CREATE TABLE IF NOT EXISTS order_members (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id              UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  member_customer_id    UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  member_name           TEXT NOT NULL,
  gender                TEXT,
  department            TEXT,
  measurements_snapshot JSONB,
  stage                 production_stage NOT NULL DEFAULT 'cutting',
  delivery_status       delivery_status NOT NULL DEFAULT 'pending',
  notes                 TEXT,
  sort_order            INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (order_id, member_customer_id)
);

ALTER TABLE order_members ADD COLUMN IF NOT EXISTS member_customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT;
ALTER TABLE order_members ADD COLUMN IF NOT EXISTS member_name TEXT;
ALTER TABLE order_members ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE order_members ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE order_members ADD COLUMN IF NOT EXISTS measurements_snapshot JSONB;
ALTER TABLE order_members ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE order_members ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_order_members_order    ON order_members(order_id);
CREATE INDEX IF NOT EXISTS idx_order_members_customer ON order_members(member_customer_id);

CREATE TABLE IF NOT EXISTS order_member_garments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_member_id  UUID NOT NULL REFERENCES order_members(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  quantity         INTEGER NOT NULL CHECK (quantity > 0),
  agreed_price     NUMERIC(12,2) NOT NULL DEFAULT 0,
  style_notes      TEXT,
  fabric_used      NUMERIC(8,2),
  notes            TEXT,
  sort_order       INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_order_member_garments_member ON order_member_garments(order_member_id);

-- ── 7. Row Level Security (drop + recreate to stay idempotent) ───────────────
ALTER TABLE delivery_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_stages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_member_garments ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS production_stages_select ON production_stages;
CREATE POLICY production_stages_select ON production_stages
  FOR SELECT USING (is_business_member(business_id));
DROP POLICY IF EXISTS production_stages_insert ON production_stages;
CREATE POLICY production_stages_insert ON production_stages
  FOR INSERT WITH CHECK (has_business_capability(business_id, 'orders.write'));
DROP POLICY IF EXISTS production_stages_update ON production_stages;
CREATE POLICY production_stages_update ON production_stages
  FOR UPDATE USING (has_business_capability(business_id, 'orders.write'))
  WITH CHECK (has_business_capability(business_id, 'orders.write'));
DROP POLICY IF EXISTS production_stages_delete ON production_stages;
CREATE POLICY production_stages_delete ON production_stages
  FOR DELETE USING (has_business_capability(business_id, 'orders.write'));

DROP POLICY IF EXISTS order_items_select ON order_items;
CREATE POLICY order_items_select ON order_items
  FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE is_business_member(business_id))
  );
DROP POLICY IF EXISTS order_items_insert ON order_items;
CREATE POLICY order_items_insert ON order_items
  FOR INSERT WITH CHECK (
    order_id IN (SELECT id FROM orders WHERE has_business_capability(business_id, 'orders.write'))
  );
DROP POLICY IF EXISTS order_items_update ON order_items;
CREATE POLICY order_items_update ON order_items
  FOR UPDATE USING (
    order_id IN (SELECT id FROM orders WHERE has_business_capability(business_id, 'orders.write'))
  )
  WITH CHECK (
    order_id IN (SELECT id FROM orders WHERE has_business_capability(business_id, 'orders.write'))
  );
DROP POLICY IF EXISTS order_items_delete ON order_items;
CREATE POLICY order_items_delete ON order_items
  FOR DELETE USING (
    order_id IN (SELECT id FROM orders WHERE has_business_capability(business_id, 'orders.write'))
  );

DROP POLICY IF EXISTS order_members_select ON order_members;
CREATE POLICY order_members_select ON order_members
  FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE is_business_member(business_id))
  );
DROP POLICY IF EXISTS order_members_insert ON order_members;
CREATE POLICY order_members_insert ON order_members
  FOR INSERT WITH CHECK (
    order_id IN (SELECT id FROM orders WHERE has_business_capability(business_id, 'orders.write'))
  );
DROP POLICY IF EXISTS order_members_update ON order_members;
CREATE POLICY order_members_update ON order_members
  FOR UPDATE USING (
    order_id IN (SELECT id FROM orders WHERE has_business_capability(business_id, 'orders.write'))
  )
  WITH CHECK (
    order_id IN (SELECT id FROM orders WHERE has_business_capability(business_id, 'orders.write'))
  );
DROP POLICY IF EXISTS order_members_delete ON order_members;
CREATE POLICY order_members_delete ON order_members
  FOR DELETE USING (
    order_id IN (SELECT id FROM orders WHERE has_business_capability(business_id, 'orders.write'))
  );

DROP POLICY IF EXISTS order_member_garments_select ON order_member_garments;
CREATE POLICY order_member_garments_select ON order_member_garments
  FOR SELECT USING (
    order_member_id IN (SELECT id FROM order_members)
  );
DROP POLICY IF EXISTS order_member_garments_insert ON order_member_garments;
CREATE POLICY order_member_garments_insert ON order_member_garments
  FOR INSERT WITH CHECK (
    order_member_id IN (SELECT id FROM order_members)
  );
DROP POLICY IF EXISTS order_member_garments_update ON order_member_garments;
CREATE POLICY order_member_garments_update ON order_member_garments
  FOR UPDATE USING (
    order_member_id IN (SELECT id FROM order_members)
  )
  WITH CHECK (
    order_member_id IN (SELECT id FROM order_members)
  );
DROP POLICY IF EXISTS order_member_garments_delete ON order_member_garments;
CREATE POLICY order_member_garments_delete ON order_member_garments
  FOR DELETE USING (
    order_member_id IN (SELECT id FROM order_members)
  );

-- ── 8. Triggers (updated_at) ─────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_delivery_partners_updated_at ON delivery_partners;
CREATE TRIGGER trg_delivery_partners_updated_at
  BEFORE UPDATE ON delivery_partners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_production_stages_updated_at ON production_stages;
CREATE TRIGGER trg_production_stages_updated_at
  BEFORE UPDATE ON production_stages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_order_items_updated_at ON order_items;
CREATE TRIGGER trg_order_items_updated_at
  BEFORE UPDATE ON order_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_order_members_updated_at ON order_members;
CREATE TRIGGER trg_order_members_updated_at
  BEFORE UPDATE ON order_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 9. Grants ────────────────────────────────────────────────────────────────
GRANT ALL ON delivery_partners       TO postgres, anon, authenticated, service_role;
GRANT ALL ON production_stages       TO postgres, anon, authenticated, service_role;
GRANT ALL ON order_items             TO postgres, anon, authenticated, service_role;
GRANT ALL ON order_members           TO postgres, anon, authenticated, service_role;
GRANT ALL ON order_member_garments   TO postgres, anon, authenticated, service_role;

GRANT USAGE ON TYPE inventory_item_type TO postgres, anon, authenticated, service_role;
GRANT USAGE ON TYPE order_item_type     TO postgres, anon, authenticated, service_role;
GRANT USAGE ON TYPE order_type          TO postgres, anon, authenticated, service_role;
GRANT USAGE ON TYPE stage_milestone     TO postgres, anon, authenticated, service_role;

-- ── 10. Order-number RPC (restore if 00005 was ever missed/overwritten) ─────
CREATE OR REPLACE FUNCTION get_next_counter(
  biz_id UUID,
  counter_field TEXT,
  prefix TEXT,
  pad_length INTEGER DEFAULT 3
)
RETURNS TEXT
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  current_val INTEGER;
  result TEXT;
BEGIN
  IF counter_field NOT IN ('orderCounter', 'employeeCounter') THEN
    RAISE EXCEPTION 'Invalid counter field: %', counter_field
      USING ERRCODE = '22023';
  END IF;

  IF NOT is_business_member(biz_id) THEN
    RAISE EXCEPTION 'Not authorized for business %', biz_id
      USING ERRCODE = '42501';
  END IF;

  UPDATE businesses
  SET
    order_counter = CASE WHEN counter_field = 'orderCounter' THEN order_counter + 1 ELSE order_counter END,
    employee_counter = CASE WHEN counter_field = 'employeeCounter' THEN employee_counter + 1 ELSE employee_counter END
  WHERE id = biz_id
  RETURNING
    CASE WHEN counter_field = 'orderCounter' THEN order_counter ELSE employee_counter END
  INTO current_val;

  result := prefix || LPAD(COALESCE(current_val, 0)::TEXT, pad_length, '0');
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION get_next_order_number(biz_id UUID)
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT get_next_counter(biz_id, 'orderCounter', 'ON', 3);
$$;

-- ── 11. Seed the default pipeline for businesses with none ───────────────────
INSERT INTO production_stages (business_id, name, description, display_order, color, is_active, notify_customer, milestone, is_seeded)
SELECT b.id, ds.name, ds.description, ds.display_order, ds.color, ds.is_active, ds.notify_customer, ds.milestone::stage_milestone, TRUE
FROM businesses b
CROSS JOIN (VALUES
  ('Cutting',          'Garment has been cut from fabric',        1, 'bg-sky-500',    TRUE, FALSE, 'none'::stage_milestone),
  ('Stitching',        'Garment is being stitched or sewn',       2, 'bg-blue-500',   TRUE, FALSE, 'none'),
  ('Fitting',          'Garment is being fitted on the customer', 3, 'bg-indigo-500', TRUE, FALSE, 'none'),
  ('Finishing',        'Final touches and finishing work',        4, 'bg-violet-500', TRUE, FALSE, 'none'),
  ('Ready for Pickup', 'Order is complete and awaiting collection', 5, 'bg-emerald-500', TRUE, TRUE, 'ready_for_pickup'),
  ('Delivered',        'Order has been delivered to the customer', 6, 'bg-green-600',  TRUE, TRUE, 'delivered')
) AS ds(name, description, display_order, color, is_active, notify_customer, milestone)
WHERE NOT EXISTS (
  SELECT 1 FROM production_stages ps WHERE ps.business_id = b.id
)
ON CONFLICT (business_id, name) DO NOTHING;

-- ── 12. Verification query (run after applying to confirm readiness) ─────────
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name IN
--   ('orders','order_items','order_members','order_member_garments','production_stages','delivery_partners');

COMMIT;