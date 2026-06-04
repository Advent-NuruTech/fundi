-- ============================================================================
-- FUNDIFLOW – Migration 00014: Finance improvements
--
-- 1. Change expense_category and withdrawal_category columns from enum to TEXT
--    so users can enter any custom category they want.
-- 2. Add investments table for tracking business investments.
-- 3. Add savings_goals table for savings targets.
-- 4. Add savings_deposits table for deposits toward goals.
-- ============================================================================

-- -------------------------------------------------------------------
-- 1. Loosen expense category to free-form text
-- -------------------------------------------------------------------
ALTER TABLE expenses ALTER COLUMN category TYPE text USING category::text;

-- -------------------------------------------------------------------
-- 2. Loosen withdrawal category to free-form text
-- -------------------------------------------------------------------
ALTER TABLE withdrawals ALTER COLUMN category TYPE text USING category::text;

-- -------------------------------------------------------------------
-- 3. investments – Business investment records
-- -------------------------------------------------------------------
CREATE TABLE investments (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type              TEXT        NOT NULL DEFAULT 'general',
  amount            NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  description       TEXT        NOT NULL,
  notes             TEXT        DEFAULT '',
  investment_date   TIMESTAMPTZ NOT NULL DEFAULT now(),
  return_expected   NUMERIC(12,2) DEFAULT 0,
  return_actual     NUMERIC(12,2) DEFAULT 0,
  status            TEXT        NOT NULL DEFAULT 'active',
  created_by_uid    TEXT,
  created_by_name   TEXT        NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY investments_select ON investments
  FOR SELECT USING (has_business_capability(business_id, 'finance.read'));
CREATE POLICY investments_insert ON investments
  FOR INSERT WITH CHECK (has_business_capability(business_id, 'finance.write'));
CREATE POLICY investments_update ON investments
  FOR UPDATE USING  (has_business_capability(business_id, 'finance.write'))
             WITH CHECK (has_business_capability(business_id, 'finance.write'));
CREATE POLICY investments_delete ON investments
  FOR DELETE USING (has_business_capability(business_id, 'finance.write'));

-- -------------------------------------------------------------------
-- 4. savings_goals – Named saving targets
-- -------------------------------------------------------------------
CREATE TABLE savings_goals (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name              TEXT        NOT NULL,
  target_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  current_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  deadline          DATE,
  description       TEXT        DEFAULT '',
  color             TEXT        DEFAULT '#059669',
  status            TEXT        NOT NULL DEFAULT 'active',
  created_by_uid    TEXT,
  created_by_name   TEXT        NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY savings_goals_select ON savings_goals
  FOR SELECT USING (has_business_capability(business_id, 'finance.read'));
CREATE POLICY savings_goals_insert ON savings_goals
  FOR INSERT WITH CHECK (has_business_capability(business_id, 'finance.write'));
CREATE POLICY savings_goals_update ON savings_goals
  FOR UPDATE USING  (has_business_capability(business_id, 'finance.write'))
             WITH CHECK (has_business_capability(business_id, 'finance.write'));
CREATE POLICY savings_goals_delete ON savings_goals
  FOR DELETE USING (has_business_capability(business_id, 'finance.write'));

-- -------------------------------------------------------------------
-- 5. savings_deposits – Deposits credited toward a savings goal
-- -------------------------------------------------------------------
CREATE TABLE savings_deposits (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  goal_id           UUID        REFERENCES savings_goals(id) ON DELETE SET NULL,
  amount            NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  notes             TEXT        DEFAULT '',
  deposit_date      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_uid    TEXT,
  created_by_name   TEXT        NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE savings_deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY savings_deposits_select ON savings_deposits
  FOR SELECT USING (has_business_capability(business_id, 'finance.read'));
CREATE POLICY savings_deposits_insert ON savings_deposits
  FOR INSERT WITH CHECK (has_business_capability(business_id, 'finance.write'));
CREATE POLICY savings_deposits_delete ON savings_deposits
  FOR DELETE USING (has_business_capability(business_id, 'finance.write'));

-- Grant access to new tables (mirrors 00012 pattern)
GRANT ALL ON investments      TO postgres, anon, authenticated, service_role;
GRANT ALL ON savings_goals    TO postgres, anon, authenticated, service_role;
GRANT ALL ON savings_deposits TO postgres, anon, authenticated, service_role;
