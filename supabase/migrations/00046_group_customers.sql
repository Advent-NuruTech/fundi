-- ============================================================================
-- FUNDIFLOW - Supabase Migration: 00046_group_customers
-- Group / organizational customers: a billing account (company, school, hotel,
-- church, NGO, family…) with many individual members that all inherit billing
-- from the parent account.
--
--   customers.customer_type        'individual' | 'group'
--   customers.parent_customer_id   for members → the group account
--   order_members                  per-person line inside a group order, with
--                                  its own production stage + delivery status
--   order_member_garments          per-person garment line items
-- ============================================================================

-- ── 1. customers: group hierarchy columns ────────────────────────────────────
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_type      TEXT NOT NULL DEFAULT 'individual';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS parent_customer_id UUID REFERENCES customers(id) ON DELETE CASCADE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS organization_name  TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS contact_person     TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS contact_role       TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tax_id             TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS payment_terms      TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS address            TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS department         TEXT;

CREATE INDEX IF NOT EXISTS idx_customers_parent_customer ON customers(parent_customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_business_type ON customers(business_id, customer_type);

-- Group members must be allowed to share a phone number with each other and
-- with standalone customers. Replace the full UNIQUE(business_id, phone) with
-- a partial unique index that only guards billing accounts (standalone
-- individuals and group parents). Members (parent_customer_id IS NOT NULL) are
-- excluded so the same phone can be reused across a household/company.
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_business_id_phone_key;
DROP INDEX IF EXISTS customers_business_id_phone_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_business_phone_standalone
  ON customers(business_id, phone)
  WHERE parent_customer_id IS NULL;

-- ── 2. orders: group-order flag ───────────────────────────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_group_order BOOLEAN NOT NULL DEFAULT false;

-- ── 3. order_members: per-person production tracking inside a group order ────
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
  UNIQUE(order_id, member_customer_id)
);

CREATE INDEX IF NOT EXISTS idx_order_members_order ON order_members(order_id);
CREATE INDEX IF NOT EXISTS idx_order_members_customer ON order_members(member_customer_id);

-- ── 4. order_member_garments: garments belonging to a specific member ────────
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

-- ── 4. Row Level Security ────────────────────────────────────────────────────
-- Both child tables carry no business_id; access is derived from the parent
-- order, exactly like order_garments / customer_measurements.
ALTER TABLE order_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_member_garments ENABLE ROW LEVEL SECURITY;

CREATE POLICY order_members_select ON order_members
  FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE is_business_member(business_id))
  );

CREATE POLICY order_members_insert ON order_members
  FOR INSERT WITH CHECK (
    order_id IN (SELECT id FROM orders WHERE has_business_capability(business_id, 'orders.write'))
  );

CREATE POLICY order_members_update ON order_members
  FOR UPDATE USING (
    order_id IN (SELECT id FROM orders WHERE has_business_capability(business_id, 'orders.write'))
  )
  WITH CHECK (
    order_id IN (SELECT id FROM orders WHERE has_business_capability(business_id, 'orders.write'))
  );

CREATE POLICY order_members_delete ON order_members
  FOR DELETE USING (
    order_id IN (SELECT id FROM orders WHERE has_business_capability(business_id, 'orders.write'))
  );

CREATE POLICY order_member_garments_select ON order_member_garments
  FOR SELECT USING (
    order_member_id IN (
      SELECT id FROM order_members
      WHERE order_id IN (SELECT id FROM orders WHERE is_business_member(business_id))
    )
  );

CREATE POLICY order_member_garments_insert ON order_member_garments
  FOR INSERT WITH CHECK (
    order_member_id IN (
      SELECT id FROM order_members
      WHERE order_id IN (SELECT id FROM orders WHERE has_business_capability(business_id, 'orders.write'))
    )
  );

CREATE POLICY order_member_garments_update ON order_member_garments
  FOR UPDATE USING (
    order_member_id IN (
      SELECT id FROM order_members
      WHERE order_id IN (SELECT id FROM orders WHERE has_business_capability(business_id, 'orders.write'))
    )
  )
  WITH CHECK (
    order_member_id IN (
      SELECT id FROM order_members
      WHERE order_id IN (SELECT id FROM orders WHERE has_business_capability(business_id, 'orders.write'))
    )
  );

CREATE POLICY order_member_garments_delete ON order_member_garments
  FOR DELETE USING (
    order_member_id IN (
      SELECT id FROM order_members
      WHERE order_id IN (SELECT id FROM orders WHERE has_business_capability(business_id, 'orders.write'))
    )
  );

-- ── 5. Grants ────────────────────────────────────────────────────────────────
-- Migration 00012 sets default privileges for future tables, but grants are
-- repeated here for explicitness/robustness.
GRANT ALL ON order_members         TO postgres, anon, authenticated, service_role;
GRANT ALL ON order_member_garments TO postgres, anon, authenticated, service_role;
