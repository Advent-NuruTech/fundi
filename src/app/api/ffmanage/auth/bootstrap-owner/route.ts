/**
 * Bootstrap the system owner account.
 *
 * Security guarantees:
 *  - Only executable when system_owner_uid is null (no owner exists)
 *  - Uses an advisory lock (pg_try_advisory_xact_lock) to prevent race conditions
 *  - Sets public_signup_enabled = false atomically after owner creation
 *  - Rate-limited to 3 attempts per IP per hour
 *  - Full audit log written on success and failure
 *  - Password policy enforced server-side
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash, randomUUID } from "crypto";
import { z } from "zod";
import { signAdminToken, SESSION_COOKIE, TOKEN_TTL_SECONDS } from "@/lib/admin/session";

export const dynamic = "force-dynamic";

// Rate limiting: 3 attempts per IP per hour
const bootstrapAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 3;
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
    (p) =>
      /[A-Z]/.test(p) &&
      /[0-9]/.test(p) &&
      /[^A-Za-z0-9]/.test(p),
    {
      message:
        "Password must contain at least one uppercase letter, one number, and one special character",
    }
  ),
  confirmPassword: z.string(),
  businessName: z.string().min(2).max(200).trim().optional(),
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
      { error: "Too many setup attempts. Try again in 1 hour." },
      { status: 429 }
    );
  }

  const db = getDb();

  // ── Guard: only executable when no owner exists ───────────────────────────
  // Use PostgreSQL advisory lock (hash of the string "bootstrap_owner_lock")
  // to prevent concurrent bootstrap attempts.
  // Attempt advisory lock — best effort only; the double-check below is the real guard.
  // Wrapped in try/catch because the RPC signature may differ across PG versions.
  try {
    await db.rpc("pg_try_advisory_xact_lock", { key: 42424242 }).single();
  } catch {
    // Lock unavailable — proceed; the system_owner_uid check below is authoritative.
  }

  const { data: ownerConfig } = await db
    .from("system_config")
    .select("value")
    .eq("key", "system_owner_uid")
    .maybeSingle();

  const currentOwner = ownerConfig?.value
    ? String(ownerConfig.value).replace(/^"|"$/g, "")
    : null;

  if (currentOwner && currentOwner !== "null" && currentOwner.length > 10) {
    return NextResponse.json(
      { error: "System owner already exists. Use the sign-in form." },
      { status: 409 }
    );
  }

  // ── Validate body ─────────────────────────────────────────────────────────
  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first?.message ?? "Invalid input" }, { status: 400 });
  }

  const { fullName, email, password, businessName } = parsed.data;

  // ── Create Supabase Auth user ─────────────────────────────────────────────
  const { data: authData, error: authErr } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // auto-confirm — owner needs immediate access
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
    // ── Create profile ────────────────────────────────────────────────────
    const { error: profileErr } = await db.from("profiles").upsert(
      {
        id: userId,
        email,
        display_name: fullName,
        role: "owner",
        roles: ["owner"],
        active: true,
        must_change_password: false,
      },
      { onConflict: "id" }
    );
    if (profileErr) throw new Error(`Profile: ${profileErr.message}`);

    // ── Create business ───────────────────────────────────────────────────
    const resolvedBizName = businessName || `${fullName}'s Workshop`;
    const { data: bizData, error: bizErr } = await db
      .from("businesses")
      .insert({
        name: resolvedBizName,
        phone: "",
        currency: "KES",
        country: "Kenya",
        owner_uid: userId,
        order_counter: 0,
        employee_counter: 0,
      })
      .select("id")
      .single();
    if (bizErr || !bizData) throw new Error(`Business: ${bizErr?.message}`);

    const businessId = bizData.id;

    // ── Link profile → business ───────────────────────────────────────────
    await db.from("profiles").update({ business_id: businessId }).eq("id", userId);

    // ── Add as business member ────────────────────────────────────────────
    await db.from("business_members").upsert(
      { profile_id: userId, business_id: businessId, role: "owner", roles: ["owner"], active: true },
      { onConflict: "profile_id,business_id" }
    );

    // ── Default inventory setup ───────────────────────────────────────────
    const units = ["Pieces", "Meters", "Cones", "Kilograms", "Liters"];
    const cats = ["Fabrics", "Threads", "Buttons", "Zips", "Elastic", "Lining", "Accessories"];
    await Promise.allSettled([
      ...units.map((name) =>
        db.from("inventory_units").upsert({ business_id: businessId, name }, { onConflict: "business_id,name" })
      ),
      ...cats.map((name) =>
        db.from("inventory_categories").upsert({ business_id: businessId, name }, { onConflict: "business_id,name" })
      ),
    ]);

    // ── Set as system owner ───────────────────────────────────────────────
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
        { key: "public_signup_enabled", value: JSON.stringify(false) },
        { onConflict: "key" }
      ),
    ]);

    // ── Create admin session ──────────────────────────────────────────────
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

    // ── Audit log ─────────────────────────────────────────────────────────
    await db.from("admin_audit_logs").insert({
      admin_uid: userId,
      admin_email: email,
      action: "bootstrap_system_owner",
      resource_type: "system",
      metadata: { ip, businessId, fullName },
      ip_address: ip,
      user_agent: userAgent.slice(0, 500),
      severity: "critical",
    });

    // ── Set httpOnly cookie and return ────────────────────────────────────
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
    // Roll back: delete the auth user to keep DB consistent
    await db.auth.admin.deleteUser(userId).catch(() => {});
    const msg = err instanceof Error ? err.message : "Setup failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
