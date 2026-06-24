-- ============================================================================
-- FUNDIFLOW - Supabase Migration: 00033_free_trial
-- 14-day free trial: users get full access to a chosen plan, then must pay.
-- ============================================================================

-- ── 1. New subscription status: 'trialing' ──────────────────────────────────
-- Postgres allows ADD VALUE on PG12+; we never USE the new value in this same
-- migration, so it is safe.

DO $$ BEGIN
  ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'trialing';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 2. Trial window columns on subscriptions ────────────────────────────────
-- A subscription that is in trial carries plan_slug = the plan being trialed
-- (so every plan-gated feature behaves exactly as it will once paid — data
-- consistency), status = 'trialing', and a hard trial_ends_at deadline.

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at    TIMESTAMPTZ;

-- Index for any future "expiring trials" sweeps / admin reporting.
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_ends_at
  ON subscriptions(trial_ends_at)
  WHERE trial_ends_at IS NOT NULL;
