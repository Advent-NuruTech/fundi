-- ============================================================================
-- FUNDIFLOW - Supabase Migration: 0048_custom_production_stages
-- Customizable production workflows
--
-- Every tailoring business follows a different production pipeline. Instead of
-- a fixed enum, each business now defines its own ordered list of stages in
-- `production_stages`. Orders point at the stage they currently sit on and keep
-- a snapshot of completed stage ids. The legacy `production_stage` enum column
-- on `orders` is kept and maintained as a compatibility value so existing
-- filters (delivered / ready for pickup), delivery_status derivation, reports
-- and the customer portal keep working untouched.
--
-- Adds:
--   production_stages              business-configured pipeline
--   orders.current_stage_id        current custom stage
--   orders.current_stage_name      denormalized label (safe for public portal)
--   orders.completed_stage_ids     jsonb array of completed stage ids (prefix)
--   sms_type + 'stage_notification' generic per-stage customer SMS
-- ============================================================================

-- ── 1. Enums ─────────────────────────────────────────────────────────────────
DO $$
BEGIN
  CREATE TYPE stage_milestone AS ENUM ('none', 'ready_for_pickup', 'delivered');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE sms_type ADD VALUE IF NOT EXISTS 'stage_notification';

-- ── 2. production_stages table ───────────────────────────────────────────────
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

-- ── 3. orders: custom stage pointers ──────────────────────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS current_stage_id   UUID REFERENCES production_stages(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS current_stage_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_stage_ids JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_orders_current_stage ON orders(current_stage_id);

-- ── 4. Seed default pipeline for every existing business ─────────────────────
-- The six default stages mirror the legacy production_stage enum 1:1 so that
-- existing orders map cleanly onto the new config.
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
ON CONFLICT (business_id, name) DO NOTHING;

-- ── 5. Backfill existing orders onto their seeded stage ─────────────────────
-- completed_stage_ids = every stage up to AND including the current one (the
-- prefix), which is how the stepper + completion % are computed.
WITH resolved AS (
  SELECT o.id AS order_id, ps.id AS stage_id, ps.display_order
  FROM orders o
  JOIN production_stages ps ON ps.business_id = o.business_id
  WHERE (o.stage = 'cutting'          AND LOWER(ps.name) = 'cutting')
     OR (o.stage = 'stitching'        AND LOWER(ps.name) = 'stitching')
     OR (o.stage = 'fitting'          AND LOWER(ps.name) = 'fitting')
     OR (o.stage = 'finishing'        AND LOWER(ps.name) = 'finishing')
     OR (o.stage = 'ready_for_pickup' AND ps.milestone = 'ready_for_pickup')
     OR (o.stage = 'delivered'        AND ps.milestone = 'delivered')
)
UPDATE orders o
SET current_stage_id = r.stage_id,
    current_stage_name = (SELECT name FROM production_stages WHERE id = r.stage_id),
    completed_stage_ids = (
      SELECT COALESCE(jsonb_agg(ps2.id ORDER BY ps2.display_order), '[]'::jsonb)
      FROM production_stages ps2
      WHERE ps2.business_id = o.business_id
        AND ps2.display_order <= r.display_order
    )
FROM resolved r
WHERE o.id = r.order_id;

-- ── 6. Row Level Security ────────────────────────────────────────────────────
ALTER TABLE production_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY production_stages_select ON production_stages
  FOR SELECT USING (is_business_member(business_id));

CREATE POLICY production_stages_insert ON production_stages
  FOR INSERT WITH CHECK (has_business_capability(business_id, 'orders.write'));

CREATE POLICY production_stages_update ON production_stages
  FOR UPDATE USING (has_business_capability(business_id, 'orders.write'))
  WITH CHECK (has_business_capability(business_id, 'orders.write'));

CREATE POLICY production_stages_delete ON production_stages
  FOR DELETE USING (has_business_capability(business_id, 'orders.write'));

-- ── 7. Triggers ──────────────────────────────────────────────────────────────
CREATE TRIGGER trg_production_stages_updated_at
  BEFORE UPDATE ON production_stages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 8. Grants ────────────────────────────────────────────────────────────────
GRANT ALL ON production_stages TO postgres, anon, authenticated, service_role;
GRANT USAGE ON TYPE stage_milestone TO postgres, anon, authenticated, service_role;
