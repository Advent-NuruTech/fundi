-- =============================================================================
-- FUNDIFLOW - Supabase Migration: 00041_platform_pricing_config
--
-- Lets platform admins edit plan pricing and capacity WITHOUT touching code.
--
--   * billing_plan_configs  → per-plan editable overrides (prices + limits),
--     seeded with NO rows. Absence of a row = "use the defaults baked into
--     src/lib/billing/constants.ts". Rows are created when an admin saves.
--   * system_config key `sms_sender_id_price` → the one-time Custom SMS Sender
--     ID fee, editable platform-wide (seeded with the current default).
--   * business_branch_limit() → the DB backstop now reads `maxBranches` from
--     billing_plan_configs so branch enforcement follows admin edits, falling
--     back to the 2026 defaults (1 / 5 / 15) when no override exists. This also
--     fixes the stale 4 / 9 values left in migration 00040.
--
-- RLS: service_role only, mirroring system_config (migration 00026).
-- =============================================================================

-- ── Per-plan pricing/capacity overrides ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS billing_plan_configs (
  plan_slug   TEXT        PRIMARY KEY
              CHECK (plan_slug IN ('sindano', 'fundi', 'dhahabu')),
  config      JSONB       NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE billing_plan_configs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON billing_plan_configs FROM anon, authenticated;
GRANT  ALL ON billing_plan_configs TO service_role;

-- ── Platform-wide Custom SMS Sender ID fee (KES, one-time) ───────────────────
INSERT INTO system_config (key, value) VALUES ('sms_sender_id_price', '30500')
ON CONFLICT (key) DO NOTHING;

-- ── Branch-limit DB backstop now honours admin overrides ─────────────────────
-- Reads maxBranches from billing_plan_configs when present; otherwise falls
-- back to the default limits for the active plan slug. "custom" stays unlimited.
CREATE OR REPLACE FUNCTION business_branch_limit(biz uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT (bpc.config #>> '{limits,maxBranches}')::integer
      FROM billing_plan_configs bpc
      JOIN subscriptions s
        ON s.plan_slug::text = bpc.plan_slug
      WHERE s.workspace_id = biz
      LIMIT 1
    ),
    CASE (
      SELECT plan_slug::text
      FROM subscriptions
      WHERE workspace_id = biz
      LIMIT 1
    )
      WHEN 'sindano' THEN 1
      WHEN 'fundi'   THEN 5
      WHEN 'dhahabu' THEN 15
      WHEN 'custom'  THEN 2147483647  -- effectively unlimited
      ELSE 1                          -- no / unknown subscription → starter limit
    END
  );
$$;
