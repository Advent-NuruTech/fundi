-- =============================================================================
-- FUNDIFLOW - Supabase Migration: 0051_usage_credit_idempotency
--
-- credit_usage had NO reference-based idempotency (consume_usage has one).
-- When the Paystack webhook and the post-payment verify poll credit the same
-- top-up (they overlap in normal operation), or when a retry re-runs
-- creditTopup after a partial failure, units were credited REPEATEDLY — the
-- customer saw their balance "top up in a loop" from a single payment.
--
-- This makes credit_usage idempotent on (workspace, resource, reference) using
-- the same ledger check consume_usage relies on. The existing FOR UPDATE row
-- lock on usage_meters serializes concurrent crediters, so the second caller
-- sees the first's ledger row and returns early instead of double-crediting.
-- =============================================================================

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

  -- Idempotent: if these exact units were already credited for this reference,
  -- do nothing (the meter row lock above serializes concurrent crediters).
  IF p_reference IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM usage_ledger
       WHERE workspace_id = p_workspace
         AND resource = p_resource
         AND reference = p_reference
         AND source = p_source
     ) THEN
    RETURN jsonb_build_object(
      'ok', true, 'idempotent', true,
      'balance_after', GREATEST(0, COALESCE(m.plan_quota, 0) - m.plan_used) + m.top_up_credits
    );
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
