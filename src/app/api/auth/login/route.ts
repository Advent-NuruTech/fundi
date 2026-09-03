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

type InvitationActivationResult =
  | { accepted: true }
  | { accepted: false; error?: string };

async function activatePendingEmployeeInvitation(
  db: ReturnType<typeof getDb>,
  accessToken: string
): Promise<InvitationActivationResult> {
  const {
    data: { user },
    error: userError,
  } = await db.auth.getUser(accessToken);
  if (userError || !user) {
    throw new Error(userError?.message ?? "Could not verify the signed-in employee.");
  }

  const { data: invitation, error: invitationError } = await db
    .from("employee_invitations")
    .select("id, business_id, expires_at")
    .eq("invited_uid", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (invitationError) throw invitationError;

  if (!invitation) {
    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select("active")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) throw profileError;

    return profile?.active === false
      ? {
          accepted: false,
          error: "This employee account is inactive. Ask the business owner to send a new invitation.",
        }
      : { accepted: false };
  }

  if (new Date(invitation.expires_at).getTime() <= Date.now()) {
    return {
      accepted: false,
      error: "This invitation has expired. Ask the business owner to send a new invitation.",
    };
  }

  const [profileResult, memberResult] = await Promise.all([
    db.from("profiles").select("active").eq("id", user.id).maybeSingle(),
    db
      .from("business_members")
      .select("id, active")
      .eq("profile_id", user.id)
      .eq("business_id", invitation.business_id)
      .maybeSingle(),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (memberResult.error) throw memberResult.error;
  if (!profileResult.data || !memberResult.data) {
    throw new Error("The employee invitation is missing its profile or business membership.");
  }

  const previousProfileActive = profileResult.data.active;
  const previousMemberActive = memberResult.data.active;
  const acceptedAt = new Date().toISOString();

  const { error: memberActivationError } = await db
    .from("business_members")
    .update({ active: true })
    .eq("id", memberResult.data.id);
  if (memberActivationError) throw memberActivationError;

  const { error: profileActivationError } = await db
    .from("profiles")
    .update({ active: true })
    .eq("id", user.id);
  if (profileActivationError) {
    await db
      .from("business_members")
      .update({ active: previousMemberActive })
      .eq("id", memberResult.data.id);
    throw profileActivationError;
  }

  const { data: acceptedInvitation, error: acceptanceError } = await db
    .from("employee_invitations")
    .update({
      status: "accepted",
      accepted_at: acceptedAt,
      temporary_password: `USED-${crypto.randomUUID()}`,
    })
    .eq("id", invitation.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (acceptanceError || !acceptedInvitation) {
    await Promise.all([
      db.from("profiles").update({ active: previousProfileActive }).eq("id", user.id),
      db
        .from("business_members")
        .update({ active: previousMemberActive })
        .eq("id", memberResult.data.id),
    ]);
    throw acceptanceError ?? new Error("The invitation could not be accepted.");
  }

  return { accepted: true };
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

  // 3. Correct credentials -> reset lockout state, then activate a matching
  // pending employee invitation before the browser receives the session. This
  // prevents the inactive-profile guard from immediately signing the user out.
  await clearLoginAttempts(db, identifier).catch(() => {});

  let invitationResult: InvitationActivationResult;
  try {
    invitationResult = await activatePendingEmployeeInvitation(db, session.access_token);
  } catch (error) {
    console.error("[login] Could not activate employee invitation", error);
    return NextResponse.json(
      { error: "Your credentials are correct, but FundiFlow could not activate your invitation. Please try again." },
      { status: 500 }
    );
  }

  if (!invitationResult.accepted && invitationResult.error) {
    return NextResponse.json({ error: invitationResult.error }, { status: 403 });
  }

  return NextResponse.json({ session, invitationAccepted: invitationResult.accepted });
}
