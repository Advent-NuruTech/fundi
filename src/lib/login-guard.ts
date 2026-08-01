import type { SupabaseClient } from "@supabase/supabase-js";
import { toAuthEmail } from "@/lib/customer-portal";

/**
 * Login rate limiting / account lockout (server-only).
 *
 * An account identifier (email, or a phone number normalized into the customer
 * portal synthetic email) accumulates failed attempts. Reaching
 * LOGIN_MAX_ATTEMPTS (7) applies an escalating lock:
 *
 *   round 1: 15 minutes
 *   round 2: 1 month
 *   round 3+: 1 year
 *
 * A successful sign-in calls `clearLoginAttempts` which wipes the row, fully
 * resetting the escalation ladder.
 *
 * Enumeration safety: the SAME record + message handling applies to existing
 * and non-existing identifiers, so callers never learn whether an account
 * exists from the lockout behaviour either.
 */

export const LOGIN_MAX_ATTEMPTS = 7;

/** Lock durations for each escalation level (level index = level - 1). */
export const LOCKOUT_DURATIONS = [
  15 * 60 * 1000, // level 1 -> 15 minutes
  30 * 24 * 60 * 60 * 1000, // level 2 -> 30 days
  365 * 24 * 60 * 60 * 1000, // level 3 -> 1 year
];

export interface LockoutState {
  locked: boolean;
  retryAfterMs: number | null;
}

export interface RecordedLockout {
  locked: boolean;
  locked_until: string | null;
  lockout_level: number;
}

/** Convert any user-supplied login id into the canonical auth identifier. */
export function normalizeLoginIdentifier(loginId: string): string {
  return toAuthEmail(loginId.trim()).toLowerCase();
}

/**
 * Whether the identifier is currently locked out. Returns the remaining wait
 * so callers can reflect it without ever revealing account existence.
 */
export async function isLoginLocked(
  db: SupabaseClient,
  identifier: string
): Promise<LockoutState> {
  const { data } = await db
    .from("login_attempts")
    .select("locked_until")
    .eq("identifier", identifier)
    .maybeSingle();

  const lockedUntil = data?.locked_until ? new Date(data.locked_until).getTime() : 0;
  if (lockedUntil > Date.now()) {
    return { locked: true, retryAfterMs: lockedUntil - Date.now() };
  }
  return { locked: false, retryAfterMs: null };
}

/**
 * Record one failed attempt (atomic, via the `record_failed_login` RPC).
 * Returns the resulting lockout state, or null when the account is already
 * locked from an earlier round (caller should reject without counting).
 */
export async function recordFailedLogin(
  db: SupabaseClient,
  identifier: string
): Promise<RecordedLockout | null> {
  const { data } = await db.rpc("record_failed_login", { p_identifier: identifier });
  return (data as RecordedLockout | null) ?? null;
}

/** Wipe lockout state after a successful sign-in. */
export async function clearLoginAttempts(
  db: SupabaseClient,
  identifier: string
): Promise<void> {
  await db.rpc("clear_login_attempts", { p_identifier: identifier });
}
