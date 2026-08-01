import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  normalizeLoginIdentifier,
  isLoginLocked,
  recordFailedLogin,
  clearLoginAttempts,
} from "@/lib/login-guard";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  loginId: z.string().min(1).max(320),
  password: z.string().min(1).max(128),
});

const GENERIC_ERROR = "Invalid login credentials.";
const TOO_MANY_ERROR = "Too many failed attempts. Please try again later.";

function getSupabaseUrl() {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/rest\/v1\/?$/, "");
}

/** Service-role client — only ever used for the lockout bookkeeping table. */
function getDb() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
  return createClient(getSupabaseUrl(), key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Login endpoint (staff + customer portal).
 *
 * Security properties:
 *  - Escalating lockout per account: 7 failures -> 15 min -> 1 month -> 1 year.
 *  - Every failure returns the SAME generic message, so the response never
 *    reveals whether an account exists (user enumeration resistance).
 *  - Password verification runs against GoTrue with the anon key (least
 *    privilege) — never the service role.
 */
export async function POST(request: Request) {
  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const { loginId, password } = parsed.data;
  const identifier = normalizeLoginIdentifier(loginId);
  if (!identifier) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const db = getDb();

  // 1. Escalating account lockout.
  const lock = await isLoginLocked(db, identifier).catch(() => ({ locked: false, retryAfterMs: null }));
  if (lock.locked) {
    return NextResponse.json(
      { error: TOO_MANY_ERROR, retryAfterMs: lock.retryAfterMs },
      { status: 429 }
    );
  }

  // 2. Verify credentials against GoTrue with the anon key.
  const url = getSupabaseUrl();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!anonKey) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
  }

  let verifyRes: Response;
  try {
    verifyRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: identifier, password }),
      cache: "no-store",
    });
  } catch {
    // Infra/network failure — do NOT count it as a failed password attempt.
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 503 });
  }

  if (!verifyRes.ok) {
    // GoTrue already rate-limited this IP (not a credential failure).
    if (verifyRes.status === 429) {
      return NextResponse.json({ error: TOO_MANY_ERROR }, { status: 429 });
    }
    // Genuine auth failure (wrong password / unknown account) — identical
    // message either way, so the account's existence can't be probed.
    await recordFailedLogin(db, identifier).catch(() => {});
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const session = (await verifyRes.json().catch(() => null)) as {
    access_token?: string;
    refresh_token?: string;
  } | null;

  if (!session?.access_token || !session?.refresh_token) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
  }

  // 3. Success -> reset the lockout state.
  await clearLoginAttempts(db, identifier).catch(() => {});

  return NextResponse.json({ session });
}
