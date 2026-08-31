-- =============================================================================
-- FUNDIFLOW - Platform SMS inventory and canonical usage accounting
--
-- The tenant usage_ledger answers "which business used a credit?". This ledger
-- answers the separate provider-stock question: "how many SMS units does the
-- platform own, who used them, and when?". Both ledgers are updated atomically
-- by consume_sms_accounted so a successful reservation can never be attributed
-- to only one side of the books.
-- =============================================================================

CREATE TABLE IF NOT EXISTS platform_sms_inventory (
  id              TEXT PRIMARY KEY DEFAULT 'primary' CHECK (id = 'primary'),
  available_units BIGINT NOT NULL DEFAULT 0 CHECK (available_units >= 0),
  total_added     BIGINT NOT NULL DEFAULT 0 CHECK (total_added >= 0),
  total_used      BIGINT NOT NULL DEFAULT 0 CHECK (total_used >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO platform_sms_inventory (id)
VALUES ('primary')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS platform_sms_ledger (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Deliberately not an FK: platform accounting must retain attribution even
  -- after a tenant is deleted from the operational businesses table.
  business_id   UUID,
  units         BIGINT NOT NULL CHECK (units <> 0),
  entry_type    TEXT NOT NULL CHECK (entry_type IN ('stock_addition', 'usage', 'refund', 'adjustment')),
  reference     TEXT NOT NULL UNIQUE,
  balance_after BIGINT NOT NULL CHECK (balance_after >= 0),
  note          TEXT,
  admin_uid     UUID,
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_sms_ledger_created
  ON platform_sms_ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_sms_ledger_business
  ON platform_sms_ledger(business_id, created_at DESC)
  WHERE business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_platform_sms_ledger_type
  ON platform_sms_ledger(entry_type, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_sms_one_refund_per_usage
  ON platform_sms_ledger ((metadata ->> 'consumed_reference'))
  WHERE entry_type = 'refund';

ALTER TABLE platform_sms_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_sms_ledger ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON platform_sms_inventory FROM anon, authenticated;
REVOKE ALL ON platform_sms_ledger FROM anon, authenticated;
GRANT ALL ON platform_sms_inventory TO service_role;
GRANT ALL ON platform_sms_ledger TO service_role;

-- Add provider stock. References make retries safe and the ledger records the
-- administrator and note supplied by the platform UI.
CREATE OR REPLACE FUNCTION credit_platform_sms(
  p_units      BIGINT,
  p_reference  TEXT,
  p_note       TEXT DEFAULT NULL,
  p_admin_uid  UUID DEFAULT NULL,
  p_metadata   JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inventory platform_sms_inventory%ROWTYPE;
BEGIN
  IF p_units <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_units');
  END IF;

  SELECT * INTO v_inventory
  FROM platform_sms_inventory
  WHERE id = 'primary'
  FOR UPDATE;

  IF EXISTS (SELECT 1 FROM platform_sms_ledger WHERE reference = p_reference) THEN
    RETURN jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'available_after', v_inventory.available_units
    );
  END IF;

  UPDATE platform_sms_inventory
  SET available_units = available_units + p_units,
      total_added = total_added + p_units,
      updated_at = NOW()
  WHERE id = 'primary'
  RETURNING * INTO v_inventory;

  INSERT INTO platform_sms_ledger (
    business_id, units, entry_type, reference, balance_after, note, admin_uid, metadata
  ) VALUES (
    NULL, p_units, 'stock_addition', p_reference, v_inventory.available_units,
    NULLIF(BTRIM(p_note), ''), p_admin_uid, p_metadata
  );

  RETURN jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'available_after', v_inventory.available_units
  );
END;
$$;

-- Reserve one or more SMS units for a business. The existing tenant meter and
-- the platform inventory are written in this one database transaction.
CREATE OR REPLACE FUNCTION consume_sms_accounted(
  p_workspace  UUID,
  p_units      BIGINT,
  p_reference  TEXT,
  p_metadata   JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inventory platform_sms_inventory%ROWTYPE;
  v_tenant_result JSONB;
BEGIN
  IF p_units <= 0 OR p_reference IS NULL OR BTRIM(p_reference) = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_request');
  END IF;

  SELECT * INTO v_inventory
  FROM platform_sms_inventory
  WHERE id = 'primary'
  FOR UPDATE;

  IF EXISTS (
    SELECT 1 FROM platform_sms_ledger
    WHERE reference = p_reference AND entry_type = 'usage'
  ) THEN
    RETURN jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'available_after', v_inventory.available_units
    );
  END IF;

  IF v_inventory.available_units < p_units THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'platform_insufficient',
      'available', v_inventory.available_units,
      'required', p_units
    );
  END IF;

  v_tenant_result := consume_usage(p_workspace, 'sms', p_units, p_reference);
  IF NOT COALESCE((v_tenant_result ->> 'ok')::BOOLEAN, false) THEN
    RETURN v_tenant_result;
  END IF;

  UPDATE platform_sms_inventory
  SET available_units = available_units - p_units,
      total_used = total_used + p_units,
      updated_at = NOW()
  WHERE id = 'primary'
  RETURNING * INTO v_inventory;

  INSERT INTO platform_sms_ledger (
    business_id, units, entry_type, reference, balance_after, metadata
  ) VALUES (
    p_workspace, -p_units, 'usage', p_reference, v_inventory.available_units, p_metadata
  );

  RETURN jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'available_after', v_inventory.available_units,
    'tenant_available_after', v_tenant_result -> 'available_after'
  );
END;
$$;

-- Compensate both ledgers when the provider rejects or never accepts a send.
CREATE OR REPLACE FUNCTION refund_sms_accounted(
  p_workspace          UUID,
  p_units              BIGINT,
  p_reference          TEXT,
  p_consumed_reference TEXT,
  p_metadata           JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inventory platform_sms_inventory%ROWTYPE;
  v_tenant_result JSONB;
BEGIN
  IF p_units <= 0 OR p_reference IS NULL OR p_consumed_reference IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_request');
  END IF;

  SELECT * INTO v_inventory
  FROM platform_sms_inventory
  WHERE id = 'primary'
  FOR UPDATE;

  IF EXISTS (SELECT 1 FROM platform_sms_ledger WHERE reference = p_reference) THEN
    RETURN jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'available_after', v_inventory.available_units
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM platform_sms_ledger
    WHERE reference = p_consumed_reference
      AND entry_type = 'usage'
      AND business_id = p_workspace
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'consumption_not_found');
  END IF;

  v_tenant_result := credit_usage(
    p_workspace,
    'sms',
    p_units,
    p_reference,
    'adjustment',
    p_metadata || jsonb_build_object('refunded_consumption', p_consumed_reference)
  );
  IF NOT COALESCE((v_tenant_result ->> 'ok')::BOOLEAN, false) THEN
    RETURN v_tenant_result;
  END IF;

  UPDATE platform_sms_inventory
  SET available_units = available_units + p_units,
      total_used = GREATEST(0, total_used - p_units),
      updated_at = NOW()
  WHERE id = 'primary'
  RETURNING * INTO v_inventory;

  INSERT INTO platform_sms_ledger (
    business_id, units, entry_type, reference, balance_after, metadata
  ) VALUES (
    p_workspace, p_units, 'refund', p_reference, v_inventory.available_units,
    p_metadata || jsonb_build_object('consumed_reference', p_consumed_reference)
  );

  RETURN jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'available_after', v_inventory.available_units
  );
END;
$$;

-- Aggregated views keep platform analytics correct beyond PostgREST's normal
-- row limit. Refunds subtract from usage on the original business/day.
CREATE OR REPLACE VIEW platform_sms_business_usage AS
SELECT
  usage.business_id,
  COUNT(*)::BIGINT AS sent
FROM platform_sms_ledger usage
WHERE usage.entry_type = 'usage'
  AND usage.business_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM platform_sms_ledger refund
    WHERE refund.entry_type = 'refund'
      AND refund.metadata ->> 'consumed_reference' = usage.reference
  )
GROUP BY usage.business_id;

CREATE OR REPLACE VIEW platform_sms_daily_usage AS
SELECT
  (usage.created_at AT TIME ZONE 'Africa/Nairobi')::DATE AS usage_date,
  COUNT(*)::BIGINT AS sent
FROM platform_sms_ledger usage
WHERE usage.entry_type = 'usage'
  AND usage.business_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM platform_sms_ledger refund
    WHERE refund.entry_type = 'refund'
      AND refund.metadata ->> 'consumed_reference' = usage.reference
  )
GROUP BY (usage.created_at AT TIME ZONE 'Africa/Nairobi')::DATE;

REVOKE ALL ON platform_sms_business_usage FROM anon, authenticated;
REVOKE ALL ON platform_sms_daily_usage FROM anon, authenticated;
GRANT SELECT ON platform_sms_business_usage TO service_role;
GRANT SELECT ON platform_sms_daily_usage TO service_role;

REVOKE ALL ON FUNCTION credit_platform_sms(BIGINT, TEXT, TEXT, UUID, JSONB)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION consume_sms_accounted(UUID, BIGINT, TEXT, JSONB)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION refund_sms_accounted(UUID, BIGINT, TEXT, TEXT, JSONB)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION credit_platform_sms(BIGINT, TEXT, TEXT, UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION consume_sms_accounted(UUID, BIGINT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION refund_sms_accounted(UUID, BIGINT, TEXT, TEXT, JSONB) TO service_role;
