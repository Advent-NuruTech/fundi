-- ============================================================================
-- FUNDIFLOW - Supabase Migration: 00018_billing
-- Enterprise billing & subscription system (Paystack)
-- ============================================================================

-- ── Enums ──────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE plan_slug AS ENUM ('sindano', 'fundi', 'dhahabu', 'custom');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM (
    'pending_payment',
    'active',
    'past_due',
    'cancelled',
    'suspended'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE billing_payment_status AS ENUM (
    'pending',
    'processing',
    'success',
    'failed',
    'abandoned',
    'refunded'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE billing_payment_type AS ENUM (
    'installation_fee',
    'monthly_subscription',
    'sms_sender_id',
    'upgrade'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── subscriptions ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subscriptions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id             UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  plan_slug                plan_slug NOT NULL,
  status                   subscription_status NOT NULL DEFAULT 'pending_payment',
  next_billing_date        TIMESTAMPTZ,
  current_period_start     TIMESTAMPTZ,
  current_period_end       TIMESTAMPTZ,
  installation_fee_paid    BOOLEAN NOT NULL DEFAULT false,
  sms_sender_id_enabled    BOOLEAN NOT NULL DEFAULT false,
  sms_sender_id_paid       BOOLEAN NOT NULL DEFAULT false,
  sms_sender_id_paid_at    TIMESTAMPTZ,
  paystack_customer_code   TEXT,
  paystack_subscription_code TEXT,
  cancelled_at             TIMESTAMPTZ,
  cancel_reason            TEXT,
  metadata                 JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT subscriptions_workspace_unique UNIQUE (workspace_id)
);

-- ── billing_payments ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS billing_payments (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  workspace_id            UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  subscription_id         UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  paystack_reference      TEXT UNIQUE NOT NULL,
  paystack_transaction_id TEXT,
  amount                  INTEGER NOT NULL,        -- total charged, in KES
  currency                TEXT NOT NULL DEFAULT 'KES',
  payment_status          billing_payment_status NOT NULL DEFAULT 'pending',
  payment_type            billing_payment_type NOT NULL,
  includes_sms_sender_id  BOOLEAN NOT NULL DEFAULT false,
  sms_sender_id_amount    INTEGER,                -- KES, if included
  paystack_fee            INTEGER,                -- KES fee charged by Paystack
  metadata                JSONB NOT NULL DEFAULT '{}'::jsonb,
  failure_reason          TEXT,
  paid_at                 TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── payment_attempts ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payment_attempts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference       TEXT UNIQUE NOT NULL,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  workspace_id    UUID REFERENCES businesses(id) ON DELETE SET NULL,
  amount          INTEGER NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  failure_reason  TEXT,
  paystack_data   JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── billing_webhook_events ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS billing_webhook_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event             TEXT NOT NULL,
  paystack_reference TEXT,
  payload           JSONB NOT NULL,
  processed         BOOLEAN NOT NULL DEFAULT false,
  processing_error  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace_id
  ON subscriptions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id
  ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status
  ON subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_billing_payments_workspace_id
  ON billing_payments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_billing_payments_reference
  ON billing_payments(paystack_reference);
CREATE INDEX IF NOT EXISTS idx_billing_payments_status
  ON billing_payments(payment_status);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_reference
  ON payment_attempts(reference);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_user_id
  ON payment_attempts(user_id);

CREATE INDEX IF NOT EXISTS idx_billing_webhook_events_reference
  ON billing_webhook_events(paystack_reference);
CREATE INDEX IF NOT EXISTS idx_billing_webhook_events_processed
  ON billing_webhook_events(processed);

-- ── Triggers ────────────────────────────────────────────────────────────────

CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_billing_payments_updated_at
  BEFORE UPDATE ON billing_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_payment_attempts_updated_at
  BEFORE UPDATE ON payment_attempts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_webhook_events ENABLE ROW LEVEL SECURITY;

-- subscriptions: members of a workspace can read their own subscription
CREATE POLICY "subscriptions_select_workspace_member"
  ON subscriptions FOR SELECT
  USING (
    workspace_id IN (
      SELECT business_id FROM business_members WHERE profile_id = auth.uid()
    )
  );

-- billing_payments: workspace members can read billing history
CREATE POLICY "billing_payments_select_workspace_member"
  ON billing_payments FOR SELECT
  USING (
    workspace_id IN (
      SELECT business_id FROM business_members WHERE profile_id = auth.uid()
    )
  );

-- payment_attempts: user can read their own attempts
CREATE POLICY "payment_attempts_select_own"
  ON payment_attempts FOR SELECT
  USING (user_id = auth.uid());

-- billing_webhook_events: no direct user access (service role only)
-- No policies = deny all for non-service roles

-- ── Service role grants ──────────────────────────────────────────────────────

GRANT ALL ON subscriptions TO service_role;
GRANT ALL ON billing_payments TO service_role;
GRANT ALL ON payment_attempts TO service_role;
GRANT ALL ON billing_webhook_events TO service_role;

GRANT SELECT ON subscriptions TO authenticated;
GRANT SELECT ON billing_payments TO authenticated;
GRANT SELECT ON payment_attempts TO authenticated;

-- ── Legacy grace: activate all existing workspaces on Fundi plan ─────────────
-- Ensures users registered before billing system aren't locked out.
-- New workspaces must pay to activate.

INSERT INTO subscriptions (
  user_id,
  workspace_id,
  plan_slug,
  status,
  installation_fee_paid,
  current_period_start,
  metadata
)
SELECT
  b.owner_uid,
  b.id,
  'fundi'::plan_slug,
  'active'::subscription_status,
  true,
  NOW(),
  '{"legacy": true, "note": "Pre-billing system account"}'::jsonb
FROM businesses b
WHERE NOT EXISTS (
  SELECT 1 FROM subscriptions s WHERE s.workspace_id = b.id
)
ON CONFLICT (workspace_id) DO NOTHING;
