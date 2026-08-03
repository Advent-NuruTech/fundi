-- =============================================================================
-- FUNDIFLOW - Supabase Migration: 00042_usage_metering
--
-- Per-business usage metering + top-up purchases for all measurable resources:
--   * sms         → 1 unit = 1 SMS sent
--   * ai_credits  → 1 unit = 1 AI Assistant request
--   * storage     → measured in bytes (uploads); plan quota from storageGb
--
-- Plan capacity is refreshed by the app layer (src/lib/billing/usage-metering.ts)
-- from billing_plan_configs / constants. The DB layer guarantees ATOMIC,
-- transparent consumption/crediting via SECURITY DEFINER functions with row
-- locks, and writes an append-only usage_ledger so every unit bought or used is
-- exactly accounted for ("pay for 500 SMS → get exactly 500 SMS, no more, no less").
-- =============================================================================

-- ── Extend billing payment type with one-time capacity top-ups ──────────────
DO $$ BEGIN
  ALTER TYPE billing_payment_type ADD VALUE IF NOT EXISTS 'topup';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Track storage usage: record each image's byte size ──────────────────────
ALTER TABLE images ADD COLUMN IF NOT EXISTS size_bytes BIGINT;

-- ── usage_meters: current balance per (business, resource) ──────────────────
CREATE TABLE IF NOT EXISTS usage_meters (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  resource       TEXT NOT NULL CHECK (resource IN ('sms', 'ai_credits', 'storage')),
  -- Plan allowance for the current billing cycle (bytes for storage).
  -- Large sentinel when the plan is unlimited.
  plan_quota     NUMERIC NOT NULL DEFAULT 0,
  -- Consumed from the plan allowance this cycle (storage = measured bytes used).
  plan_used      NUMERIC NOT NULL DEFAULT 0,
  -- Purchased units that persist (never expire / roll over between cycles).
  top_up_credits NUMERIC NOT NULL DEFAULT 0,
  -- FALSE for cumulative resources (storage) whose usage never resets.
  resets_cycle   BOOLEAN NOT NULL DEFAULT TRUE,
  cycle_start    TIMESTAMPTZ,
  cycle_end      TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT usage_meters_workspace_resource_unique UNIQUE (workspace_id, resource)
);

-- ── usage_topups: record of every purchased top-up (exact units ↔ price) ────
CREATE TABLE IF NOT EXISTS usage_topups (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id            UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id                 UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resource                TEXT NOT NULL CHECK (resource IN ('sms', 'ai_credits', 'storage')),
  units                   NUMERIC NOT NULL,          -- exactly what the customer bought
  amount_kes              INTEGER NOT NULL,          -- exactly what the customer paid
  paystack_fee            INTEGER,
  status                  TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'success', 'failed')),
  paystack_reference      TEXT UNIQUE NOT NULL,
  paystack_transaction_id TEXT,
  metadata                JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at            TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── usage_ledger: append-only, auditable accounting for every unit ──────────
CREATE TABLE IF NOT EXISTS usage_ledger (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  resource      TEXT NOT NULL CHECK (resource IN ('sms', 'ai_credits', 'storage')),
  units         NUMERIC NOT NULL,   -- positive = credit (bought), negative = usage
  source        TEXT NOT NULL DEFAULT 'usage'
                CHECK (source IN ('usage', 'topup', 'adjustment', 'measurement')),
  reference     TEXT,
  balance_after NUMERIC NOT NULL,
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_usage_meters_workspace
  ON usage_meters(workspace_id);
CREATE INDEX IF NOT EXISTS idx_usage_topups_workspace
  ON usage_topups(workspace_id);
CREATE INDEX IF NOT EXISTS idx_usage_topups_status
  ON usage_topups(status);
CREATE INDEX IF NOT EXISTS idx_usage_ledger_workspace
  ON usage_ledger(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_ledger_resource
  ON usage_ledger(workspace_id, resource, created_at DESC);

-- ── Triggers ────────────────────────────────────────────────────────────────
CREATE TRIGGER trg_usage_meters_updated_at
  BEFORE UPDATE ON usage_meters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_usage_topups_updated_at
  BEFORE UPDATE ON usage_topups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ATOMIC operations (SECURITY DEFINER, row-locked)
-- =============================================================================

-- ── consume_usage: atomically deduct units (top-up first, then plan quota) ──
CREATE OR REPLACE FUNCTION consume_usage(
  p_workspace uuid,
  p_resource  text,
  p_units     numeric,
  p_reference text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m            usage_meters%ROWTYPE;
  v_cycle_start timestamptz;
  v_cycle_end   timestamptz;
  v_available   numeric;
  v_from_topup  numeric;
  v_from_plan   numeric;
  v_balance     numeric;
BEGIN
  SELECT * INTO m
  FROM usage_meters
  WHERE workspace_id = p_workspace AND resource = p_resource
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'meter_not_found');
  END IF;

  -- Idempotent: if this exact unit already consumed, do nothing.
  IF p_reference IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM usage_ledger
       WHERE workspace_id = p_workspace
         AND resource = p_resource
         AND reference = p_reference
         AND source = 'usage'
     ) THEN
    RETURN jsonb_build_object(
      'ok', true, 'idempotent', true,
      'available_after', GREATEST(0, COALESCE(m.plan_quota, 0) - m.plan_used) + m.top_up_credits
    );
  END IF;

  -- Lazy cycle reset for cycle-based resources (SMS, AI credits).
  IF m.resets_cycle AND m.cycle_end IS NOT NULL AND m.cycle_end < NOW() THEN
    SELECT s.current_period_start, s.current_period_end
      INTO v_cycle_start, v_cycle_end
      FROM subscriptions s
     WHERE s.workspace_id = p_workspace;
    m.plan_used := 0;
    m.cycle_start := COALESCE(v_cycle_start, m.cycle_start);
    m.cycle_end   := COALESCE(v_cycle_end, m.cycle_end);
  END IF;

  v_available := GREATEST(0, COALESCE(m.plan_quota, 0) - m.plan_used) + m.top_up_credits;

  IF v_available < p_units THEN
    RETURN jsonb_build_object(
      'ok', false, 'error', 'insufficient',
      'resource', p_resource,
      'available', v_available,
      'required', p_units
    );
  END IF;

  v_from_topup := LEAST(m.top_up_credits, p_units);
  m.top_up_credits := m.top_up_credits - v_from_topup;
  v_from_plan := p_units - v_from_topup;
  m.plan_used := m.plan_used + v_from_plan;

  UPDATE usage_meters
     SET plan_used = m.plan_used,
         top_up_credits = m.top_up_credits,
         cycle_start = m.cycle_start,
         cycle_end = m.cycle_end,
         updated_at = NOW()
   WHERE id = m.id;

  v_balance := GREATEST(0, COALESCE(m.plan_quota, 0) - m.plan_used) + m.top_up_credits;

  INSERT INTO usage_ledger (workspace_id, resource, units, source, reference, balance_after, metadata)
  VALUES (p_workspace, p_resource, -p_units, 'usage', p_reference, v_balance,
          jsonb_build_object('from_topup', v_from_topup, 'from_plan', v_from_plan));

  RETURN jsonb_build_object(
    'ok', true, 'idempotent', false,
    'available_after', v_balance,
    'from_topup', v_from_topup,
    'from_plan', v_from_plan
  );
END;
$$;

-- ── credit_usage: atomically credit purchased units (permanent top-ups) ──────
CREATE OR REPLACE FUNCTION credit_usage(
  p_workspace  uuid,
  p_resource   text,
  p_units      numeric,
  p_reference  text DEFAULT NULL,
  p_source     text DEFAULT 'topup',
  p_metadata   jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m         usage_meters%ROWTYPE;
  v_balance numeric;
BEGIN
  SELECT * INTO m
  FROM usage_meters
  WHERE workspace_id = p_workspace AND resource = p_resource
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'meter_not_found');
  END IF;

  m.top_up_credits := m.top_up_credits + p_units;

  UPDATE usage_meters
     SET top_up_credits = m.top_up_credits,
         updated_at = NOW()
   WHERE id = m.id;

  v_balance := GREATEST(0, COALESCE(m.plan_quota, 0) - m.plan_used) + m.top_up_credits;

  INSERT INTO usage_ledger (workspace_id, resource, units, source, reference, balance_after, metadata)
  VALUES (p_workspace, p_resource, p_units, p_source, p_reference, v_balance, p_metadata);

  RETURN jsonb_build_object('ok', true, 'balance_after', v_balance);
END;
$$;

-- ── measure_usage: set measured usage (storage) without touching credits ─────
CREATE OR REPLACE FUNCTION measure_usage(
  p_workspace  uuid,
  p_resource   text,
  p_measured   numeric,
  p_reference  text DEFAULT 'measurement',
  p_metadata   jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m         usage_meters%ROWTYPE;
  v_old     numeric;
  v_balance numeric;
BEGIN
  SELECT * INTO m
  FROM usage_meters
  WHERE workspace_id = p_workspace AND resource = p_resource
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'meter_not_found');
  END IF;

  v_old := m.plan_used;
  m.plan_used := p_measured;

  UPDATE usage_meters
     SET plan_used = m.plan_used,
         updated_at = NOW()
   WHERE id = m.id;

  v_balance := GREATEST(0, COALESCE(m.plan_quota, 0) - m.plan_used) + m.top_up_credits;

  INSERT INTO usage_ledger (workspace_id, resource, units, source, reference, balance_after, metadata)
  VALUES (p_workspace, p_resource, v_old - p_measured, 'measurement', p_reference, v_balance,
          p_metadata || jsonb_build_object('measured', p_measured));

  RETURN jsonb_build_object('ok', true, 'balance_after', v_balance, 'measured', p_measured);
END;
$$;

-- =============================================================================
-- RLS
-- =============================================================================

ALTER TABLE usage_meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_topups ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage_meters_select_workspace_member"
  ON usage_meters FOR SELECT
  USING (
    workspace_id IN (
      SELECT business_id FROM business_members WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "usage_topups_select_workspace_member"
  ON usage_topups FOR SELECT
  USING (
    workspace_id IN (
      SELECT business_id FROM business_members WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "usage_ledger_select_workspace_member"
  ON usage_ledger FOR SELECT
  USING (
    workspace_id IN (
      SELECT business_id FROM business_members WHERE profile_id = auth.uid()
    )
  );

-- ── Grants ───────────────────────────────────────────────────────────────────

GRANT ALL ON usage_meters TO service_role;
GRANT ALL ON usage_topups TO service_role;
GRANT ALL ON usage_ledger TO service_role;

GRANT SELECT ON usage_meters TO authenticated;
GRANT SELECT ON usage_topups TO authenticated;
GRANT SELECT ON usage_ledger TO authenticated;

GRANT EXECUTE ON FUNCTION consume_usage(uuid, text, numeric, text) TO service_role;
GRANT EXECUTE ON FUNCTION credit_usage(uuid, text, numeric, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION measure_usage(uuid, text, numeric, text, jsonb) TO service_role;
