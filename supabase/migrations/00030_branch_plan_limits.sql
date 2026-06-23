-- =============================================================================
-- 00030_branch_plan_limits.sql
-- Tie the number of branches (outlets) a business may run to its billing plan.
--
--   Sindano  → 1 branch  (the auto-created main branch only — no extra outlets)
--   Fundi    → up to 4 branches
--   Dhahabu  → up to 9 branches
--   custom   → unlimited (enterprise, arranged with sales)
--   no/unknown subscription → Sindano's limit (1), so legacy workspaces are safe
--
-- This is the AUTHORITATIVE backstop: even if the UI gate is bypassed, the
-- database refuses to create a branch beyond the plan's limit. The limits here
-- MUST mirror PLAN_BRANCH_LIMITS in src/lib/billing/constants.ts.
--
-- Backwards-compatible:
--   * Every existing business already has exactly its one default branch
--     (created in 00029), which is <= every plan limit, so nothing is rejected.
--   * The default-branch trigger from 00029 (trg_create_default_branch) runs
--     when a business is created — at that moment there is no subscription
--     (limit 1) and 0 existing branches, so the main branch (0 < 1) is allowed.
--     The owner's NEXT branch on Sindano is then correctly blocked.
-- =============================================================================

-- ── Plan → branch limit ──────────────────────────────────────────────────────
-- SECURITY DEFINER so the lookup against `subscriptions` works regardless of the
-- caller's RLS visibility; STABLE because it only reads.
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

-- ── Enforce the limit on every branch insert ─────────────────────────────────
CREATE OR REPLACE FUNCTION enforce_branch_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_limit integer;
BEGIN
  SELECT count(*) INTO v_count FROM branches WHERE business_id = NEW.business_id;
  v_limit := business_branch_limit(NEW.business_id);

  IF v_count >= v_limit THEN
    RAISE EXCEPTION
      'Branch limit reached: your plan allows up to % branch(es). Upgrade your plan or contact sales to add more outlets.',
      v_limit
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_branch_limit ON branches;
CREATE TRIGGER trg_enforce_branch_limit
  BEFORE INSERT ON branches
  FOR EACH ROW EXECUTE FUNCTION enforce_branch_limit();
