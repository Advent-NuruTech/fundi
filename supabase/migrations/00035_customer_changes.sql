-- ============================================================================
-- FUNDIFLOW - Supabase Migration: 00035_customer_changes
-- Audit log for customer edit history
-- ============================================================================

CREATE TABLE customer_changes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  changed_by_uid  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  changed_by_name TEXT,
  changes         JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_changes_customer ON customer_changes(customer_id);
CREATE INDEX idx_customer_changes_created ON customer_changes(created_at DESC);

ALTER TABLE customer_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY customer_changes_select ON customer_changes
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_members WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY customer_changes_insert ON customer_changes
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_members WHERE profile_id = auth.uid()
    )
  );

ALTER TABLE customer_changes FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON customer_changes TO authenticated;
