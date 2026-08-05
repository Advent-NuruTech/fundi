-- ─────────────────────────────────────────────────────────────────────────────
-- SMS packs — admin-editable, DB-backed, live everywhere
--
-- Mirrors ai_credit_packs (migration 00043): the Super Admin edits labels,
-- prices, units and active state at any time from /ffmanage/sms. Customers only
-- see ACTIVE packs, and every purchase is priced server-side from this table —
-- nothing is hardcoded. Top-up history stays immutable (price is snapshotted on
-- the usage_topups row at purchase time).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sms_packs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label      TEXT NOT NULL,
  units      NUMERIC NOT NULL CHECK (units > 0),
  price_kes  INTEGER NOT NULL CHECK (price_kes > 0),
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed with the current in-app packs (admin edits at any time — nothing is hardcoded).
INSERT INTO sms_packs (label, units, price_kes, sort_order) VALUES
  ('100 SMS',   100,   300,   10),
  ('500 SMS',   500,   1400,  20),
  ('1,000 SMS', 1000,  2500,  30),
  ('5,000 SMS', 5000, 11250,  40)
ON CONFLICT DO NOTHING;

CREATE TRIGGER trg_sms_packs_updated_at
  BEFORE UPDATE ON sms_packs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── RLS: service_role only (mirrors ai_credit_packs) ─────────────────────────
ALTER TABLE sms_packs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON sms_packs FROM anon, authenticated;

GRANT ALL ON sms_packs TO service_role;
