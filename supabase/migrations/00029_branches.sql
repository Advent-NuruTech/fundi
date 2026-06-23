-- =============================================================================
-- 00029_branches.sql
-- Multi-branch: a single business can run several branches (outlets / shops),
-- each with FULLY ISOLATED transactional data — its own customers, orders,
-- stock, payments and finance. The owner switches between branches the same
-- way they switch between businesses.
--
-- Design:
--   * A `branches` table; every business has exactly one default branch.
--   * Branch-scoped (transactional) tables get a nullable `branch_id`.
--   * Existing rows are backfilled to their business's default branch, and a
--     BEFORE INSERT trigger stamps the default branch whenever a row arrives
--     without one. That makes the whole change backwards-compatible: the app
--     keeps working before it ever sends a branch_id, and no row is ever
--     orphaned.
--   * Business-level isolation stays enforced by the existing RLS policies;
--     branch isolation is an additional scope applied by the app, since the
--     active branch is a per-user UI choice within a business they already
--     fully control.
--
--   Config/communication tables (inventory_units, inventory_categories,
--   business_members, profiles, notifications, conversations, messages) are
--   intentionally SHARED across a business's branches.
-- =============================================================================

-- ── branches ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branches (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name        text NOT NULL DEFAULT 'Main Branch',
  location    text,
  is_default  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_branches_business ON branches(business_id);
-- At most one default branch per business.
CREATE UNIQUE INDEX IF NOT EXISTS uq_branches_one_default
  ON branches(business_id) WHERE is_default;

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS branches_select ON branches;
CREATE POLICY branches_select ON branches
  FOR SELECT USING (is_business_member(business_id));
DROP POLICY IF EXISTS branches_insert ON branches;
CREATE POLICY branches_insert ON branches
  FOR INSERT WITH CHECK (has_business_capability(business_id, 'workshop.manage'));
DROP POLICY IF EXISTS branches_update ON branches;
CREATE POLICY branches_update ON branches
  FOR UPDATE USING (has_business_capability(business_id, 'workshop.manage'))
  WITH CHECK (has_business_capability(business_id, 'workshop.manage'));
DROP POLICY IF EXISTS branches_delete ON branches;
CREATE POLICY branches_delete ON branches
  FOR DELETE USING (has_business_capability(business_id, 'workshop.manage'));

-- One default branch for every existing business.
INSERT INTO branches (business_id, name, location, is_default)
SELECT b.id, 'Main Branch', b.location, true
FROM businesses b
WHERE NOT EXISTS (SELECT 1 FROM branches br WHERE br.business_id = b.id);

-- ── helpers / triggers ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION default_branch_id(biz uuid)
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT id FROM branches WHERE business_id = biz AND is_default = true LIMIT 1;
$$;

-- Auto-create a default branch whenever a new business is created.
CREATE OR REPLACE FUNCTION create_default_branch()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO branches (business_id, name, location, is_default)
  VALUES (NEW.id, 'Main Branch', NEW.location, true);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_create_default_branch ON businesses;
CREATE TRIGGER trg_create_default_branch
  AFTER INSERT ON businesses
  FOR EACH ROW EXECUTE FUNCTION create_default_branch();

-- Stamp branch_id = business default when a branch-scoped row is inserted
-- without one. Guarantees integrity and backwards-compatibility.
CREATE OR REPLACE FUNCTION set_branch_default()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.branch_id IS NULL THEN
    NEW.branch_id := default_branch_id(NEW.business_id);
  END IF;
  RETURN NEW;
END;
$$;

-- ── add branch_id to every branch-scoped (transactional) table ───────────────
DO $$
DECLARE
  t text;
  scoped text[] := ARRAY[
    'customers','orders','payments','inventory_materials','stock_movements',
    'purchase_orders','suppliers','expenses','withdrawals','investments',
    'savings_goals','savings_deposits','transactions','consumption_reports',
    'sms_logs','images'
  ];
BEGIN
  FOREACH t IN ARRAY scoped LOOP
    IF to_regclass(format('public.%I', t)) IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format(
      'ALTER TABLE %I ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches(id) ON DELETE SET NULL', t);
    EXECUTE format(
      'UPDATE %I s SET branch_id = default_branch_id(s.business_id) WHERE s.branch_id IS NULL', t);
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS idx_%s_branch ON %I(business_id, branch_id)', t, t);
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_branch_default ON %I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%s_branch_default BEFORE INSERT ON %I '
      'FOR EACH ROW EXECUTE FUNCTION set_branch_default()', t, t);
  END LOOP;
END $$;
