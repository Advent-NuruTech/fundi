-- ============================================================================
-- FUNDIFLOW - Migration 00037: Login rate limiting & escalating lockouts
-- ----------------------------------------------------------------------------
-- Protects the login endpoint(s):
--
--   * Every account identifier (email or synthetic customer-phone email) gets
--     a row here tracking failed attempts and the current lockout level.
--   * 7 failed attempts lock the account for 15 minutes. Each further round of
--     7 failures (after a lock expires) escalates: 15 min -> 1 month -> 1 year.
--   * A successful login clears the row (full reset).
--
-- The table is only reachable through the service role (via the RPC functions
-- below). anon/authenticated are fully locked out so attackers can't read or
-- manipulate lockout state, or use the table to enumerate accounts.
-- ============================================================================

CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Canonical auth identifier: lowercased email or `254XXXXXXXXX@customer.fundiflow`.
  identifier TEXT NOT NULL UNIQUE,
  -- Failures accumulated in the CURRENT round (reset to 0 whenever a lock is applied).
  failed_count INTEGER NOT NULL DEFAULT 0,
  -- Escalation stage: 0 = fresh, 1 = 15 min lock, 2 = 1 month lock, 3 = 1 year lock.
  lockout_level INTEGER NOT NULL DEFAULT 0,
  -- When non-null and in the future the identifier is temporarily locked out.
  locked_until TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Private to the service role: neither anon nor authenticated may read or
-- mutate lockout state (service_role bypasses RLS, so it keeps working).
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON login_attempts FROM anon, authenticated;

-- ============================================================================
-- record_failed_login(p_identifier)
--   Atomically records one failed attempt and returns the resulting lockout
--   state. Applies the escalation ladder when a round reaches 7 failures:
--     level 0 -> level 1  (15 minutes)
--     level 1 -> level 2  (1 month)
--     level 2 -> level 3  (1 year, stays here afterwards)
--   Returns NULL when the identifier is still locked from a previous round
--   (attempt is rejected upstream without counting another failure).
-- ============================================================================
CREATE OR REPLACE FUNCTION record_failed_login(p_identifier TEXT)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_row login_attempts%ROWTYPE;
  v_now timestamptz := now();
  v_locked_until timestamptz := NULL;
  v_lockout_level INTEGER := 0;
  v_failed_count INTEGER := 1;
BEGIN
  SELECT * INTO v_row FROM login_attempts WHERE identifier = p_identifier;

  IF v_row.id IS NOT NULL THEN
    v_lockout_level := v_row.lockout_level;

    -- Still locked -> reject; do not count another failure.
    IF v_row.locked_until IS NOT NULL AND v_row.locked_until > v_now THEN
      RETURN jsonb_build_object(
        'locked', true,
        'locked_until', v_row.locked_until,
        'lockout_level', v_lockout_level
      );
    END IF;

    -- Previous lock expired -> start a new round, keep the escalation level.
    IF v_row.locked_until IS NOT NULL AND v_row.locked_until <= v_now THEN
      v_failed_count := 1;
    ELSE
      v_failed_count := v_row.failed_count + 1;
    END IF;
  END IF;

  IF v_failed_count >= 7 THEN
    IF v_lockout_level = 0 THEN
      v_locked_until := v_now + interval '15 minutes';
      v_lockout_level := 1;
    ELSIF v_lockout_level = 1 THEN
      v_locked_until := v_now + interval '1 month';
      v_lockout_level := 2;
    ELSE
      v_locked_until := v_now + interval '1 year';
      v_lockout_level := 3;
    END IF;
    v_failed_count := 0;
  END IF;

  INSERT INTO login_attempts (
    identifier, failed_count, lockout_level, locked_until, last_attempt_at, updated_at
  ) VALUES (
    p_identifier, v_failed_count, v_lockout_level, v_locked_until, v_now, v_now
  )
  ON CONFLICT (identifier) DO UPDATE SET
    failed_count = EXCLUDED.failed_count,
    lockout_level = EXCLUDED.lockout_level,
    locked_until = EXCLUDED.locked_until,
    last_attempt_at = EXCLUDED.last_attempt_at,
    updated_at = EXCLUDED.updated_at;

  RETURN jsonb_build_object(
    'locked', v_locked_until IS NOT NULL AND v_locked_until > v_now,
    'locked_until', v_locked_until,
    'lockout_level', v_lockout_level
  );
END;
$$;

-- ============================================================================
-- clear_login_attempts(p_identifier)
--   Called after a successful sign-in so the lockout state fully resets.
-- ============================================================================
CREATE OR REPLACE FUNCTION clear_login_attempts(p_identifier TEXT)
RETURNS void
LANGUAGE sql
AS $$ DELETE FROM login_attempts WHERE identifier = p_identifier; $$;

-- The RPC functions must not be callable by the public: the table itself is
-- private to the service role, and these functions must stay that way too.
REVOKE ALL ON FUNCTION record_failed_login(TEXT) FROM anon, authenticated;
REVOKE ALL ON FUNCTION clear_login_attempts(TEXT) FROM anon, authenticated;
