-- ============================================================================
-- FUNDIFLOW - Migration: 00021_superadmin
-- Super-admin management infrastructure: system config, admin sessions,
-- audit logs, invite links, support tickets, receipts, system metrics.
-- All admin tables are service_role-only unless explicitly granted.
-- ============================================================================

-- ── system_config ────────────────────────────────────────────────────────────
-- Platform-wide key/value configuration store.
-- Keys: system_owner_uid, system_initialized, public_signup_enabled, etc.

CREATE TABLE IF NOT EXISTS system_config (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT        NOT NULL UNIQUE,
  value       JSONB       NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Seed defaults (idempotent)
INSERT INTO system_config (key, value) VALUES
  ('system_initialized',    'false'),
  ('public_signup_enabled', 'true'),
  ('system_owner_uid',      'null'),
  ('platform_version',      '"1.0.0"')
ON CONFLICT (key) DO NOTHING;

-- ── admin_sessions ────────────────────────────────────────────────────────────
-- Tracks every /ffmanage login session with device/IP for audit.

CREATE TABLE IF NOT EXISTS admin_sessions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash      TEXT        NOT NULL UNIQUE,
  ip_address      TEXT,
  user_agent      TEXT,
  device_info     JSONB       NOT NULL DEFAULT '{}',
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  last_active_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_user_id
  ON admin_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token_hash
  ON admin_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at
  ON admin_sessions(expires_at);

-- ── admin_audit_logs ─────────────────────────────────────────────────────────
-- Immutable append-only log of every admin action. Never UPDATE/DELETE.

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_uid       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_email     TEXT,
  action          TEXT        NOT NULL,
  resource_type   TEXT,
  resource_id     UUID,
  resource_name   TEXT,
  previous_state  JSONB,
  new_state       JSONB,
  metadata        JSONB       NOT NULL DEFAULT '{}',
  ip_address      TEXT,
  user_agent      TEXT,
  severity        TEXT        NOT NULL DEFAULT 'info',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_uid
  ON admin_audit_logs(admin_uid);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action
  ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_resource_id
  ON admin_audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at
  ON admin_audit_logs(created_at DESC);

-- ── admin_invite_links ───────────────────────────────────────────────────────
-- Admin-generated invite links for controlled user onboarding.

CREATE TABLE IF NOT EXISTS admin_invite_links (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  token           TEXT        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_by      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label           TEXT,
  email           TEXT,
  role_to_assign  TEXT        NOT NULL DEFAULT 'owner',
  max_uses        INTEGER,
  use_count       INTEGER     NOT NULL DEFAULT 0,
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  revoked         BOOLEAN     NOT NULL DEFAULT false,
  revoked_at      TIMESTAMPTZ,
  revoked_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata        JSONB       NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_invite_links_token
  ON admin_invite_links(token);
CREATE INDEX IF NOT EXISTS idx_admin_invite_links_created_by
  ON admin_invite_links(created_by);
CREATE INDEX IF NOT EXISTS idx_admin_invite_links_expires_at
  ON admin_invite_links(expires_at);

-- ── support_tickets ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS support_tickets (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number   TEXT        NOT NULL UNIQUE,
  business_id     UUID        REFERENCES businesses(id) ON DELETE SET NULL,
  user_id         UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email      TEXT,
  subject         TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'open',
  priority        TEXT        NOT NULL DEFAULT 'medium',
  category        TEXT        NOT NULL DEFAULT 'general',
  assigned_to     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at     TIMESTAMPTZ,
  closed_at       TIMESTAMPTZ,
  metadata        JSONB       NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_business_id
  ON support_tickets(business_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status
  ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at
  ON support_tickets(created_at DESC);

CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id       UUID        NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_uid      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name     TEXT        NOT NULL,
  sender_role     TEXT        NOT NULL DEFAULT 'customer',
  content         TEXT        NOT NULL,
  attachments     JSONB       NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket_id
  ON support_ticket_messages(ticket_id);

-- ── receipts ─────────────────────────────────────────────────────────────────
-- Auto-generated payment receipts (PDF metadata + download tracking).

CREATE TABLE IF NOT EXISTS receipts (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number      TEXT        NOT NULL UNIQUE,
  workspace_id        UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  billing_payment_id  UUID        REFERENCES billing_payments(id) ON DELETE SET NULL,
  business_name       TEXT        NOT NULL,
  plan_name           TEXT        NOT NULL,
  amount_paid         INTEGER     NOT NULL,
  paystack_fee        INTEGER     NOT NULL DEFAULT 0,
  tax_amount          INTEGER     NOT NULL DEFAULT 0,
  net_amount          INTEGER     NOT NULL,
  transaction_id      TEXT,
  payment_reference   TEXT,
  subscription_period TEXT,
  paid_at             TIMESTAMPTZ NOT NULL,
  pdf_url             TEXT,
  pdf_public_id       TEXT,
  metadata            JSONB       NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipts_workspace_id
  ON receipts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_receipts_billing_payment_id
  ON receipts(billing_payment_id);
CREATE INDEX IF NOT EXISTS idx_receipts_paid_at
  ON receipts(paid_at DESC);

-- ── system_metrics ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS system_metrics (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type     TEXT        NOT NULL,
  numeric_value   NUMERIC,
  json_value      JSONB,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_metrics_type_recorded
  ON system_metrics(metric_type, recorded_at DESC);

-- ── Triggers ─────────────────────────────────────────────────────────────────

CREATE TRIGGER trg_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── RLS: all admin tables are service_role only ──────────────────────────────

ALTER TABLE system_config          ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_invite_links     ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics         ENABLE ROW LEVEL SECURITY;

-- No policies = deny all for authenticated/anon roles.
-- Service role bypasses RLS — all admin operations use service role client.

-- ── Grants ───────────────────────────────────────────────────────────────────

GRANT ALL ON system_config           TO service_role;
GRANT ALL ON admin_sessions          TO service_role;
GRANT ALL ON admin_audit_logs        TO service_role;
GRANT ALL ON admin_invite_links      TO service_role;
GRANT ALL ON support_tickets         TO service_role;
GRANT ALL ON support_ticket_messages TO service_role;
GRANT ALL ON receipts                TO service_role;
GRANT ALL ON system_metrics          TO service_role;

-- Allow authenticated users to read their own receipts
CREATE POLICY "receipts_select_own_workspace"
  ON receipts FOR SELECT
  USING (
    workspace_id IN (
      SELECT business_id FROM business_members WHERE profile_id = auth.uid()
    )
  );
GRANT SELECT ON receipts TO authenticated;

-- Allow authenticated users to read invite links they received
CREATE POLICY "invite_links_select_valid"
  ON admin_invite_links FOR SELECT
  USING (
    revoked = false
    AND expires_at > NOW()
  );
GRANT SELECT ON admin_invite_links TO authenticated;

-- ── Helper function: get system owner ────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_system_owner_uid()
RETURNS UUID AS $$
DECLARE
  owner_uid UUID;
BEGIN
  SELECT (value #>> '{}')::UUID INTO owner_uid
  FROM system_config
  WHERE key = 'system_owner_uid'
    AND value != 'null'::jsonb;
  RETURN owner_uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ── Helper function: is system owner ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION is_system_owner(check_uid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN check_uid = get_system_owner_uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ── Helper function: initialize system owner (idempotent) ────────────────────

CREATE OR REPLACE FUNCTION initialize_system_owner_from_first_profile()
RETURNS void AS $$
DECLARE
  first_uid UUID;
BEGIN
  SELECT (value #>> '{}')::UUID INTO first_uid
  FROM system_config WHERE key = 'system_owner_uid' AND value != 'null'::jsonb;

  IF first_uid IS NOT NULL THEN RETURN; END IF;

  SELECT p.id INTO first_uid
  FROM profiles p
  ORDER BY p.created_at ASC
  LIMIT 1;

  IF first_uid IS NOT NULL THEN
    UPDATE system_config SET value = to_jsonb(first_uid::text), updated_at = NOW()
      WHERE key = 'system_owner_uid';
    UPDATE system_config SET value = 'true', updated_at = NOW()
      WHERE key = 'system_initialized';
    UPDATE system_config SET value = 'false', updated_at = NOW()
      WHERE key = 'public_signup_enabled';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run once on migration — sets owner if any profiles already exist
SELECT initialize_system_owner_from_first_profile();

-- ── Helper function: generate sequential ticket numbers ──────────────────────

CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_num FROM support_tickets;
  RETURN 'TKT' || LPAD(next_num::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Helper function: generate receipt numbers ─────────────────────────────────

CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(receipt_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_num FROM receipts;
  RETURN 'RCP-' || LPAD(next_num::TEXT, 7, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
