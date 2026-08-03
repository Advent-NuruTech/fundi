-- =============================================================================
-- 00040_plan_limit_updates.sql
-- Grow the per-plan branch limits to match the new 2026 capacity structure:
--
--   Sindano  → 1 branch   (unchanged — main outlet only)
--   Fundi    → up to 5 branches  (was 4)
--   Dhahabu  → up to 15 branches (was 9)
--   custom   → unlimited (unchanged)
--   no/unknown subscription → Sindano's limit (1), so legacy workspaces are safe
--
-- This is the AUTHORITATIVE backstop and MUST mirror PLAN_BRANCH_LIMITS in
-- src/lib/billing/constants.ts (branch limits were raised in step with the
-- customer / order / user / SMS capacity increases).
--
-- Backwards-compatible: existing businesses have at most 9 branches, which is
-- <= the new limits, so no existing branch is affected.
-- =============================================================================

CREATE OR REPLACE FUNCTION business_branch_limit(biz uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE (
    SELECT plan_slug::text
    FROM subscriptions
    WHERE workspace_id = biz
    LIMIT 1
  )
    WHEN 'sindano' THEN 1
    WHEN 'fundi'   THEN 4
    WHEN 'dhahabu' THEN 9
    WHEN 'custom'  THEN 2147483647  -- effectively unlimited
    ELSE 1                          -- no / unknown subscription → starter limit
  END;
$$;
