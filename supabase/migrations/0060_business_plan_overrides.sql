-- =============================================================================
-- 0060_business_plan_overrides.sql
-- Business-specific capability adjustments anchored to one standard plan.
--
-- No row means the business inherits its live Sindano, Fundi, or Dhahabu plan
-- unchanged. A row stores only fields that differ from that live base plan, so
-- future platform-wide plan edits continue to flow through to every field that
-- was not specifically adjusted for the business.
-- =============================================================================

CREATE TABLE IF NOT EXISTS business_plan_overrides (
  workspace_id   UUID        PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  base_plan_slug TEXT        NOT NULL CHECK (base_plan_slug IN ('sindano', 'fundi', 'dhahabu')),
  custom_name    TEXT,
  limits         JSONB       NOT NULL DEFAULT '{}'::jsonb,
  features       JSONB       NOT NULL DEFAULT '{}'::jsonb,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT business_plan_overrides_custom_name_length
    CHECK (custom_name IS NULL OR char_length(custom_name) BETWEEN 1 AND 80),
  CONSTRAINT business_plan_overrides_limits_object
    CHECK (jsonb_typeof(limits) = 'object'),
  CONSTRAINT business_plan_overrides_features_object
    CHECK (jsonb_typeof(features) = 'object')
);

ALTER TABLE business_plan_overrides ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON business_plan_overrides FROM anon, authenticated;
GRANT ALL ON business_plan_overrides TO service_role;

-- A normal upgrade/downgrade chooses a new standard plan. Do not carry an old
-- business-specific adjustment into that plan or unexpectedly revive it later.
CREATE OR REPLACE FUNCTION clear_stale_business_plan_override()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.plan_slug IS DISTINCT FROM OLD.plan_slug THEN
    DELETE FROM business_plan_overrides
    WHERE workspace_id = NEW.workspace_id
      AND base_plan_slug IS DISTINCT FROM NEW.plan_slug::text;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clear_stale_business_plan_override ON subscriptions;
CREATE TRIGGER trg_clear_stale_business_plan_override
  AFTER UPDATE OF plan_slug ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION clear_stale_business_plan_override();

-- Keep the existing database backstop, but prefer a business-specific branch
-- adjustment over the platform-wide plan value and baked-in fallback.
CREATE OR REPLACE FUNCTION business_branch_limit(biz uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT (bpo.limits ->> 'maxBranches')::integer
      FROM business_plan_overrides bpo
      JOIN subscriptions s
        ON s.workspace_id = bpo.workspace_id
       AND s.plan_slug::text = bpo.base_plan_slug
      WHERE bpo.workspace_id = biz
      LIMIT 1
    ),
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
      WHEN 'custom'  THEN 2147483647
      ELSE 1
    END
  );
$$;
