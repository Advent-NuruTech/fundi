-- =============================================================================
-- FUNDIFLOW - Supabase Migration: 00043_ai_billing_engine
--
-- The AI Billing Engine separates BILLING (real provider cost) from PRICING
-- (commercial rules). Every commercial parameter lives here so the Super Admin
-- can change providers, model pricing, exchange rates, margins, credit values
-- and credit packs with ZERO code changes.
--
-- Tables:
--   * ai_billing_config_versions → append-only, immutable snapshots of every
--     saved configuration. Nothing is ever mutated or deleted.
--   * ai_billing_config           → the single ACTIVE row (points at a version).
--   * ai_exchange_rates           → append-only exchange-rate history. Every AI
--     request records the exact rate + source + timestamp it billed with.
--   * ai_billing_records          → IMMUTABLE billing records. Created once,
--     never updated or deleted (status/refunds are append-only metadata).
--   * ai_credit_packs             → admin-editable AI credit packs (units ↔ KES).
--
-- RLS: service_role only — mirroring system_config / billing_plan_configs.
-- =============================================================================

-- ── Append-only configuration version history ────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_billing_config_versions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version    INTEGER     NOT NULL,
  config     JSONB       NOT NULL,
  note       TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ai_billing_config_versions_unique UNIQUE (version)
);

-- ── Active configuration (single row, immutable via versioning) ──────────────
CREATE TABLE IF NOT EXISTS ai_billing_config (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version    INTEGER     NOT NULL,
  config     JSONB       NOT NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed the initial (placeholder) configuration. Every value below is editable
-- by the Super Admin; these are launch defaults only and are NEVER treated as
-- permanent pricing.
INSERT INTO ai_billing_config (id, version, config)
SELECT
  '00000000-0000-0000-0000-000000000001',
  1,
  jsonb_build_object(
    'activeProvider', 'openai',
    'providers', jsonb_build_object(
      'openai', jsonb_build_object(
        'id', 'openai',
        'name', 'OpenAI',
        'model', 'GPT-5.6 Luna',
        'enabled', true,
        'capabilities', jsonb_build_object(
          'caching', true,
          'reasoning', false,
          'images', false,
          'audio', false
        ),
        'pricing', jsonb_build_object(
          'input', 0.20,
          'cachedInput', 0.02,
          'output', 1.20,
          'reasoning', 0.00,
          'image', 0.00,
          'audio', 0.00,
          'currency', 'USD',
          'perMillionTokens', true
        )
      )
    ),
    'margin', jsonb_build_object(
      'targetGrossMarginPercent', 100
    ),
    'credit', jsonb_build_object(
      'valueKes', 0.50,
      'roundingMode', 'ceil',
      'minimumCredits', 1
    ),
    'featureCategories', jsonb_build_array(
      jsonb_build_object('id', 'simple',    'name', 'Simple',    'description', 'Short deterministic prompts (classify, extract, short answer).', 'suggestedCredits', 1,   'maxCredits', 10),
      jsonb_build_object('id', 'medium',    'name', 'Medium',    'description', 'Multi-step reasoning over structured business data.',            'suggestedCredits', 5,   'maxCredits', 50),
      jsonb_build_object('id', 'complex',   'name', 'Complex',   'description', 'Long-context generation with tool calls (reports, drafts).',      'suggestedCredits', 20,  'maxCredits', 200),
      jsonb_build_object('id', 'enterprise','name', 'Enterprise','description', 'Long-running / high-token workloads (batch, image, audio).',      'suggestedCredits', 100, 'maxCredits', 1000)
    ),
    'featurePolicies', jsonb_build_object(
      'assistant.chat',        'medium',
      'assistant.smart_text',  'medium',
      'order.autosuggest',     'simple',
      'order.smart_fill',      'medium',
      'inventory.reorder',     'simple',
      'customer.summary',      'medium',
      'report.draft',          'complex',
      'report.batch',          'enterprise'
    ),
    'exchangeRateProvider', jsonb_build_object(
      'active', 'manual'
    )
  )
ON CONFLICT DO NOTHING;

INSERT INTO ai_billing_config_versions (version, config, note)
SELECT 1, config, 'Initial placeholder configuration (launch defaults).'
FROM ai_billing_config
WHERE version = 1
ON CONFLICT (version) DO NOTHING;

-- ── Append-only exchange-rate history ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_exchange_rates (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate       NUMERIC(12,4) NOT NULL CHECK (rate > 0),
  source     TEXT NOT NULL CHECK (source IN ('manual', 'central_bank', 'exchange_rate_api')),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_exchange_rates_created_at
  ON ai_exchange_rates(created_at DESC);

-- Seed the initial manual rate (admin edits it from the AI Billing module —
-- this is a launch placeholder, never permanent pricing).
INSERT INTO ai_exchange_rates (rate, source) VALUES (130.45, 'manual');

-- ── IMMUTABLE AI billing records ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_billing_records (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key     TEXT UNIQUE NOT NULL,
  request_id          TEXT NOT NULL,
  business_id         UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  provider            TEXT NOT NULL,
  model               TEXT NOT NULL,
  feature             TEXT NOT NULL,
  feature_category    TEXT,
  input_tokens        BIGINT NOT NULL DEFAULT 0,
  cached_input_tokens BIGINT NOT NULL DEFAULT 0,
  output_tokens       BIGINT NOT NULL DEFAULT 0,
  reasoning_tokens    BIGINT NOT NULL DEFAULT 0,
  image_tokens        BIGINT NOT NULL DEFAULT 0,
  audio_tokens        BIGINT NOT NULL DEFAULT 0,
  -- Billing Engine output (real provider cost, never commercial).
  provider_cost_usd   NUMERIC(20,8) NOT NULL,
  exchange_rate       NUMERIC(12,4) NOT NULL,
  exchange_source     TEXT NOT NULL,
  cost_kes            NUMERIC(20,4) NOT NULL,
  -- Pricing Engine output (commercial rules, never provider cost).
  revenue_multiplier  NUMERIC(12,4) NOT NULL,
  revenue_kes         NUMERIC(20,4) NOT NULL,
  credit_value_kes    NUMERIC(12,4) NOT NULL,
  rounding_mode       TEXT NOT NULL DEFAULT 'ceil',
  credits_charged     NUMERIC(20,4) NOT NULL,
  minimum_credits     NUMERIC(20,4) NOT NULL DEFAULT 1,
  balance_after       NUMERIC(20,4),
  latency_ms          INTEGER,
  config_version      INTEGER NOT NULL,
  status              TEXT NOT NULL DEFAULT 'charged'
                      CHECK (status IN ('charged', 'failed', 'refunded')),
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_billing_records_business_created
  ON ai_billing_records(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_billing_records_provider
  ON ai_billing_records(provider, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_billing_records_model
  ON ai_billing_records(model, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_billing_records_feature
  ON ai_billing_records(feature, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_billing_records_created
  ON ai_billing_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_billing_records_idempotency
  ON ai_billing_records(idempotency_key);

-- =============================================================================
-- ANALYTICS ENGINE — aggregates billing records IN THE DATABASE so the admin
-- dashboard stays real-time at 1M+ businesses without shipping every record to
-- the app server. Everything below is derived from the immutable records.
-- =============================================================================

CREATE OR REPLACE FUNCTION ai_billing_analytics(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start timestamptz;
  v_result jsonb;
BEGIN
  v_start := NOW() - (p_days || ' days')::interval;

  SELECT jsonb_build_object(
    'summary', jsonb_build_object(
      'requestCount',      COUNT(*),
      'totalProviderCost', COALESCE(SUM(provider_cost_usd), 0),
      'totalCostKes',      COALESCE(SUM(cost_kes), 0),
      'totalRevenue',      COALESCE(SUM(revenue_kes), 0),
      'totalCredits',      COALESCE(SUM(credits_charged), 0),
      'averageCredits',    COALESCE(AVG(credits_charged), 0),
      'averageProviderCost', COALESCE(AVG(provider_cost_usd), 0),
      'averageRevenue',    COALESCE(AVG(revenue_kes), 0)
    ),
    'byFeature', COALESCE((
      SELECT jsonb_agg(bucket ORDER BY (bucket->>'totalCost')::numeric DESC)
      FROM (
        SELECT jsonb_build_object(
          'key', feature, 'count', COUNT(*),
          'totalCost', SUM(provider_cost_usd),
          'totalRevenue', SUM(revenue_kes),
          'totalCredits', SUM(credits_charged)
        ) AS bucket
        FROM ai_billing_records
        WHERE created_at >= v_start
        GROUP BY feature
      ) s
    ), '[]'::jsonb),
    'byProvider', COALESCE((
      SELECT jsonb_agg(bucket ORDER BY (bucket->>'totalCost')::numeric DESC)
      FROM (
        SELECT jsonb_build_object(
          'key', provider, 'count', COUNT(*),
          'totalCost', SUM(provider_cost_usd),
          'totalRevenue', SUM(revenue_kes),
          'totalCredits', SUM(credits_charged)
        ) AS bucket
        FROM ai_billing_records
        WHERE created_at >= v_start
        GROUP BY provider
      ) s
    ), '[]'::jsonb),
    'byModel', COALESCE((
      SELECT jsonb_agg(bucket ORDER BY (bucket->>'totalCost')::numeric DESC)
      FROM (
        SELECT jsonb_build_object(
          'key', model, 'count', COUNT(*),
          'totalCost', SUM(provider_cost_usd),
          'totalRevenue', SUM(revenue_kes),
          'totalCredits', SUM(credits_charged)
        ) AS bucket
        FROM ai_billing_records
        WHERE created_at >= v_start
        GROUP BY model
      ) s
    ), '[]'::jsonb),
    'byCategory', COALESCE((
      SELECT jsonb_agg(bucket ORDER BY (bucket->>'totalCost')::numeric DESC)
      FROM (
        SELECT jsonb_build_object(
          'key', COALESCE(feature_category, 'uncategorized'), 'count', COUNT(*),
          'totalCost', SUM(provider_cost_usd),
          'totalRevenue', SUM(revenue_kes),
          'totalCredits', SUM(credits_charged)
        ) AS bucket
        FROM ai_billing_records
        WHERE created_at >= v_start
        GROUP BY COALESCE(feature_category, 'uncategorized')
      ) s
    ), '[]'::jsonb),
    'daily', COALESCE((
      SELECT jsonb_agg(bucket ORDER BY bucket->>'date')
      FROM (
        SELECT jsonb_build_object(
          'date', to_char(date_trunc('day', created_at), 'YYYY-MM-DD'),
          'cost', SUM(provider_cost_usd),
          'revenue', SUM(revenue_kes),
          'requests', COUNT(*)
        ) AS bucket
        FROM ai_billing_records
        WHERE created_at >= v_start
        GROUP BY date_trunc('day', created_at)
      ) s
    ), '[]'::jsonb),
    'monthly', COALESCE((
      SELECT jsonb_agg(bucket ORDER BY bucket->>'date')
      FROM (
        SELECT jsonb_build_object(
          'date', to_char(date_trunc('month', created_at), 'YYYY-MM'),
          'cost', SUM(provider_cost_usd),
          'revenue', SUM(revenue_kes),
          'requests', COUNT(*)
        ) AS bucket
        FROM ai_billing_records
        WHERE created_at >= v_start
        GROUP BY date_trunc('month', created_at)
      ) s
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION ai_billing_analytics(integer) TO service_role;

-- ── Admin-editable credit packs (units ↔ KES) ────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_credit_packs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label      TEXT NOT NULL,
  credits    NUMERIC NOT NULL CHECK (credits > 0),
  price_kes  INTEGER NOT NULL CHECK (price_kes > 0),
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed placeholder packs (admin edits at any time — nothing is hardcoded).
INSERT INTO ai_credit_packs (label, credits, price_kes, sort_order) VALUES
  ('100 credits',  100,   900,   10),
  ('500 credits',  500,   4000,  20),
  ('1,000 credits', 1000,  7500,  30),
  ('5,000 credits', 5000, 35000,  40)
ON CONFLICT DO NOTHING;

CREATE TRIGGER trg_ai_billing_config_updated_at
  BEFORE UPDATE ON ai_billing_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_ai_credit_packs_updated_at
  BEFORE UPDATE ON ai_credit_packs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── RLS: service_role only (mirrors system_config) ───────────────────────────
ALTER TABLE ai_billing_config_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_billing_config          ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_exchange_rates          ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_billing_records         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_credit_packs            ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON ai_billing_config_versions FROM anon, authenticated;
REVOKE ALL ON ai_billing_config          FROM anon, authenticated;
REVOKE ALL ON ai_exchange_rates          FROM anon, authenticated;
REVOKE ALL ON ai_billing_records         FROM anon, authenticated;
REVOKE ALL ON ai_credit_packs            FROM anon, authenticated;

GRANT ALL ON ai_billing_config_versions TO service_role;
GRANT ALL ON ai_billing_config          TO service_role;
GRANT ALL ON ai_exchange_rates          TO service_role;
GRANT ALL ON ai_billing_records         TO service_role;
GRANT ALL ON ai_credit_packs            TO service_role;
