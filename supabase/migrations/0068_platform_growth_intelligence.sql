-- FundiFlow Growth Intelligence
-- Stores only daily product counters for the platform owner. No customer,
-- order, finance, message content, or other tenant payload is copied here.

ALTER TABLE ai_messages
  ADD COLUMN IF NOT EXISTS feedback_score SMALLINT
    CHECK (feedback_score IN (-1, 1)),
  ADD COLUMN IF NOT EXISTS feedback_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS platform_feature_business_daily (
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  feature_key TEXT NOT NULL,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  event_count BIGINT NOT NULL DEFAULT 1 CHECK (event_count > 0),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_date, feature_key, business_id)
);

CREATE TABLE IF NOT EXISTS platform_feature_daily (
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  feature_key TEXT NOT NULL,
  event_count BIGINT NOT NULL DEFAULT 0 CHECK (event_count >= 0),
  business_count BIGINT NOT NULL DEFAULT 0 CHECK (business_count >= 0),
  PRIMARY KEY (event_date, feature_key)
);

CREATE TABLE IF NOT EXISTS platform_ai_feedback_daily (
  event_date DATE PRIMARY KEY DEFAULT CURRENT_DATE,
  positive_count BIGINT NOT NULL DEFAULT 0 CHECK (positive_count >= 0),
  negative_count BIGINT NOT NULL DEFAULT 0 CHECK (negative_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_platform_feature_business_lookup
  ON platform_feature_business_daily (business_id, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_platform_feature_daily_feature
  ON platform_feature_daily (feature_key, event_date DESC);

CREATE OR REPLACE FUNCTION record_platform_feature_event(
  p_business_id UUID,
  p_feature_key TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_rows INTEGER;
BEGIN
  IF p_business_id IS NULL OR p_feature_key !~ '^[a-z0-9_]{2,64}$' THEN
    RAISE EXCEPTION 'Invalid product event';
  END IF;

  INSERT INTO platform_feature_business_daily (
    event_date, feature_key, business_id, event_count, last_seen_at
  ) VALUES (
    CURRENT_DATE, p_feature_key, p_business_id, 1, NOW()
  )
  ON CONFLICT (event_date, feature_key, business_id) DO NOTHING;

  GET DIAGNOSTICS inserted_rows = ROW_COUNT;

  IF inserted_rows > 0 THEN
    INSERT INTO platform_feature_daily (event_date, feature_key, event_count, business_count)
    VALUES (CURRENT_DATE, p_feature_key, 1, 1)
    ON CONFLICT (event_date, feature_key) DO UPDATE
      SET event_count = platform_feature_daily.event_count + 1,
          business_count = platform_feature_daily.business_count + 1;
  ELSE
    UPDATE platform_feature_business_daily
      SET event_count = event_count + 1, last_seen_at = NOW()
      WHERE event_date = CURRENT_DATE
        AND feature_key = p_feature_key
        AND business_id = p_business_id;

    UPDATE platform_feature_daily
      SET event_count = event_count + 1
      WHERE event_date = CURRENT_DATE AND feature_key = p_feature_key;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION update_platform_ai_feedback_daily()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.feedback_score IS NOT NULL THEN
    INSERT INTO platform_ai_feedback_daily (event_date, positive_count, negative_count)
    VALUES (
      COALESCE(OLD.feedback_at::date, CURRENT_DATE),
      0,
      0
    )
    ON CONFLICT (event_date) DO UPDATE SET
      positive_count = GREATEST(0, platform_ai_feedback_daily.positive_count - CASE WHEN OLD.feedback_score = 1 THEN 1 ELSE 0 END),
      negative_count = GREATEST(0, platform_ai_feedback_daily.negative_count - CASE WHEN OLD.feedback_score = -1 THEN 1 ELSE 0 END);
  END IF;

  IF NEW.feedback_score IS NOT NULL THEN
    INSERT INTO platform_ai_feedback_daily (event_date, positive_count, negative_count)
    VALUES (
      COALESCE(NEW.feedback_at::date, CURRENT_DATE),
      CASE WHEN NEW.feedback_score = 1 THEN 1 ELSE 0 END,
      CASE WHEN NEW.feedback_score = -1 THEN 1 ELSE 0 END
    )
    ON CONFLICT (event_date) DO UPDATE SET
      positive_count = platform_ai_feedback_daily.positive_count + CASE WHEN NEW.feedback_score = 1 THEN 1 ELSE 0 END,
      negative_count = platform_ai_feedback_daily.negative_count + CASE WHEN NEW.feedback_score = -1 THEN 1 ELSE 0 END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ai_message_feedback_rollup ON ai_messages;
CREATE TRIGGER trg_ai_message_feedback_rollup
  AFTER UPDATE OF feedback_score ON ai_messages
  FOR EACH ROW
  WHEN (OLD.feedback_score IS DISTINCT FROM NEW.feedback_score)
  EXECUTE FUNCTION update_platform_ai_feedback_daily();

ALTER TABLE platform_feature_business_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_feature_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_ai_feedback_daily ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON platform_feature_business_daily FROM anon, authenticated;
REVOKE ALL ON platform_feature_daily FROM anon, authenticated;
REVOKE ALL ON platform_ai_feedback_daily FROM anon, authenticated;
GRANT ALL ON platform_feature_business_daily TO service_role;
GRANT ALL ON platform_feature_daily TO service_role;
GRANT ALL ON platform_ai_feedback_daily TO service_role;
REVOKE ALL ON FUNCTION record_platform_feature_event(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION record_platform_feature_event(UUID, TEXT) TO service_role;

-- The business-level rows exist only to deduplicate the current day. The
-- platform dashboard reads the tiny global rollup table, so its request cost
-- stays bounded as tenant count grows. Run this daily from Supabase Cron.
CREATE OR REPLACE FUNCTION prune_platform_feature_dedup(
  p_before DATE DEFAULT CURRENT_DATE
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_rows BIGINT;
BEGIN
  DELETE FROM platform_feature_business_daily WHERE event_date < p_before;
  GET DIAGNOSTICS deleted_rows = ROW_COUNT;
  RETURN deleted_rows;
END;
$$;

REVOKE ALL ON FUNCTION prune_platform_feature_dedup(DATE) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION prune_platform_feature_dedup(DATE) TO service_role;

-- A 150% provider-cost markup means billed revenue targets 2.5x provider cost.
-- This is a commercial target, not a guarantee of business profit.
UPDATE ai_billing_config
SET config = jsonb_set(config, '{margin,targetGrossMarginPercent}', '150'::jsonb, true),
    version = version + 1,
    updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000001'
  AND COALESCE((config #>> '{margin,targetGrossMarginPercent}')::numeric, 0) < 150;

INSERT INTO ai_billing_config_versions (version, config, note)
SELECT version, config, 'Raised the AI provider-cost markup target to 150%.'
FROM ai_billing_config
WHERE id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (version) DO NOTHING;
