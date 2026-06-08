-- ============================================================================
-- FUNDIFLOW - Migration: 00020_billing_portal
-- Self-service billing portal: upgrade/downgrade/cancel/sender-id flows
-- ============================================================================

-- ── New columns on subscriptions ─────────────────────────────────────────────

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS cancel_at_period_end  BOOLEAN   NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pending_plan_slug      plan_slug,
  ADD COLUMN IF NOT EXISTS pending_change_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sms_sender_id_name     TEXT,
  ADD COLUMN IF NOT EXISTS sms_sender_id_status   TEXT      NOT NULL DEFAULT 'none';

-- ── billing_audit_logs ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS billing_audit_logs (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID    NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id           UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  action            TEXT    NOT NULL,
  previous_state    JSONB,
  new_state         JSONB,
  metadata          JSONB   NOT NULL DEFAULT '{}'::jsonb,
  performed_by_role TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_audit_logs_workspace_id
  ON billing_audit_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_billing_audit_logs_created_at
  ON billing_audit_logs(created_at DESC);

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE billing_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_audit_logs_select_workspace_member"
  ON billing_audit_logs FOR SELECT
  USING (
    workspace_id IN (
      SELECT business_id FROM business_members WHERE profile_id = auth.uid()
    )
  );

-- ── Grants ───────────────────────────────────────────────────────────────────

GRANT ALL   ON billing_audit_logs TO service_role;
GRANT SELECT ON billing_audit_logs TO authenticated;
