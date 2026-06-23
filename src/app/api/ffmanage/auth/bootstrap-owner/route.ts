/**
 * Register a new platform system owner.
 *
 * Anyone who knows the SYSTEM_OWNER_PASSCODE (set in .env.local) can register
 * as a platform owner. Multiple owners are supported.
 *
 * PLATFORM DOMAIN ONLY — creates:
 *   - auth.users entry
 *   - platform_admins entry (role = 'owner')
 *   - system_config flags (system_owner_uid, system_initialized, public_signup_enabled)
 *   - admin_session + httpOnly cookie
 *
 * DOES NOT CREATE:
 *   - profiles, businesses, business_members (tenant tables)
 *
 * Security:
 *   - SYSTEM_OWNER_PASSCODE env var must match the submitted passcode
 *   - Rate-limited: 5 attempts per IP per hour
 *   - Password policy enforced server-side
 *   - Audit log written on success
 *   - Auth user deleted on any failure (rollback)
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash, randomUUID } from "crypto";
import { z } from "zod";
import { signAdminToken, SESSION_COOKIE, TOKEN_TTL_SECONDS } from "@/lib/admin/session";

export const dynamic = "force-dynamic";

const bootstrapAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = bootstrapAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    bootstrapAttempts.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count += 1;
  return true;
}

const bodySchema = z.object({
  fullName: z.string().min(2).max(100).trim(),
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(8).max(128).refine(
    (p) => /[A-Z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p),
    { message: "Password must contain at least one uppercase letter, one number, and one special character" }
  ),
  confirmPassword: z.string(),
  passcode: z.string().min(1),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

function getDb() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/rest\/v1\/?$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in 1 hour." },
      { status: 429 }
    );
  }

  // Validate request body
  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first?.message ?? "Invalid input" }, { status: 400 });
  }

  const { fullName, email, password, passcode } = parsed.data;

  // Validate system owner passcode
  const systemPasscode = process.env.SYSTEM_OWNER_PASSCODE ?? "";
  if (!systemPasscode) {
    return NextResponse.json(
      { error: "System owner passcode is not configured. Set SYSTEM_OWNER_PASSCODE in .env.local." },
      { status: 500 }
    );
  }
  if (passcode !== systemPasscode) {
    return NextResponse.json(
      { error: "Invalid system owner passcode." },
      { status: 403 }
    );
  }

  const db = getDb();

  // Create Supabase Auth user (email auto-confirmed — owner needs immediate access)
  const { data: authData, error: authErr } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (authErr || !authData?.user) {
    return NextResponse.json(
      { error: authErr?.message ?? "Failed to create account" },
      { status: 400 }
    );
  }

  const userId = authData.user.id;

  try {
    // Create platform_admins entry (role = owner).
    // Multiple owners are allowed — each registered with the correct passcode.
    const { error: paErr } = await db.from("platform_admins").insert({
      user_id: userId,
      role: "owner",
      email,
      full_name: fullName,
      is_active: true,
    });
    if (paErr) throw new Error(`Platform admin record: ${paErr.message}`);

    // Keep system_config flags in sync (backward compat)
    await Promise.all([
      db.from("system_config").upsert(
        { key: "system_owner_uid", value: JSON.stringify(userId) },
        { onConflict: "key" }
      ),
      db.from("system_config").upsert(
        { key: "system_initialized", value: JSON.stringify(true) },
        { onConflict: "key" }
      ),
      db.from("system_config").upsert(
        { key: "public_signup_enabled", value: JSON.stringify(true) },
        { onConflict: "key" }
      ),
    ]);

    // Create admin session
    const sessionId = randomUUID();
    const token = await signAdminToken(sessionId, userId);
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const userAgent = request.headers.get("user-agent") ?? "";

    await db.from("admin_sessions").insert({
      id: sessionId,
      user_id: userId,
      token_hash: tokenHash,
      ip_address: ip,
      user_agent: userAgent.slice(0, 500),
      device_info: { userAgent: userAgent.slice(0, 200) },
      is_active: true,
      expires_at: new Date(Date.now() + TOKEN_TTL_SECONDS * 1000).toISOString(),
    });

    // Audit log
    await db.from("admin_audit_logs").insert({
      admin_uid: userId,
      admin_email: email,
      action: "register_platform_owner",
      resource_type: "platform",
      metadata: { ip, fullName, domain: "platform" },
      ip_address: ip,
      user_agent: userAgent.slice(0, 500),
      severity: "critical",
    });

    const isProd = process.env.NODE_ENV === "production";
    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "strict",
      path: "/",
      maxAge: TOKEN_TTL_SECONDS,
    });
    return response;

  } catch (err) {
    await db.auth.admin.deleteUser(userId).catch(() => {});
    const msg = err instanceof Error ? err.message : "Setup failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
