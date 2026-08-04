-- =============================================================================
-- FUNDIFLOW - Supabase Migration: 00045_ai_cost_efficiency
--
-- Two cost/quality optimisations for the Business AI Assistant (AI 2):
--
--   1. Conversation memory summaries.
--      Long conversations are no longer re-sent in full on every turn. Older
--      turns are collapsed into a compact summary stored on `ai_conversations`
--      and reused, regenerated only every N messages (see
--      src/lib/ai/summarize.ts).
--
--   2. SQL aggregates for the business snapshot.
--      The prompt context builder used to SELECT every payment/expense/customer/
--      inventory row to add them up in JS — shipping entire tables to the app.
--      These SECURITY INVOKER functions do the SUM in Postgres instead, so only
--      the handful of bounded top-N lists ever leave the database. RLS still
--      applies (INVOKER rights), so a tenant can only aggregate its own rows.
-- =============================================================================

-- ── 1. Conversation summary columns ─────────────────────────────────────────

ALTER TABLE ai_conversations
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS summary_message_count INTEGER NOT NULL DEFAULT 0;

-- ── 2. Snapshot aggregate functions ──────────────────────────────────────────

-- Sum of payments recorded at/after `p_since` for one business.
CREATE OR REPLACE FUNCTION ai_payments_sum(p_business_id uuid, p_since timestamptz)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount), 0)::numeric
  FROM payments
  WHERE business_id = p_business_id AND recorded_at >= p_since;
$$;

-- Sum of expenses on/after `p_since` for one business.
CREATE OR REPLACE FUNCTION ai_expenses_sum(p_business_id uuid, p_since timestamptz)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount), 0)::numeric
  FROM expenses
  WHERE business_id = p_business_id AND expense_date >= p_since;
$$;

-- Total outstanding customer debt for one business.
CREATE OR REPLACE FUNCTION ai_customer_balances_sum(p_business_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(outstanding_balance), 0)::numeric
  FROM customers
  WHERE business_id = p_business_id;
$$;

-- Total stock value (quantity × average unit cost) for one business.
CREATE OR REPLACE FUNCTION ai_inventory_value(p_business_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(quantity * average_unit_cost), 0)::numeric
  FROM inventory_materials
  WHERE business_id = p_business_id;
$$;

-- Sum of order subtotals created at/after `p_since` for one business.
CREATE OR REPLACE FUNCTION ai_orders_subtotal_sum(p_business_id uuid, p_since timestamptz)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(subtotal_amount), 0)::numeric
  FROM orders
  WHERE business_id = p_business_id AND created_at >= p_since;
$$;

GRANT EXECUTE ON FUNCTION ai_payments_sum(uuid, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION ai_expenses_sum(uuid, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION ai_customer_balances_sum(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION ai_inventory_value(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION ai_orders_subtotal_sum(uuid, timestamptz) TO authenticated;
