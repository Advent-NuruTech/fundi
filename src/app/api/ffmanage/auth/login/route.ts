import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash, randomUUID } from "crypto";
import { z } from "zod";
import { signAdminToken, SESSION_COOKIE, TOKEN_TTL_SECONDS } from "@/lib/admin/session";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Rate limiter: 5 attempts per IP per 15 minutes
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 15 * 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count += 1;
  return true;
}

function getDb() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/rest\/v1\/?$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many login attempts. Try again in 15 minutes." },
      { status: 429 }
    );
  }

  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const db = getDb();

  // Step 1: Authenticate via Supabase Auth
  const { data: authData, error: authErr } = await db.auth.signInWithPassword({ email, password });
  if (authErr || !authData?.user) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const user = authData.user;

  // Step 2: Verify the user is an active platform admin (explicit platform identity check).
  //         This is intentionally separate from the tenant domain (profiles/businesses).
  const { data: platformAdmin, error: paErr } = await db
    .from("platform_admins")
    .select("id, role, is_active, full_name")
    .eq("user_id", user.id)
    .single();

  if (paErr || !platformAdmin || !platformAdmin.is_active) {
    return NextResponse.json(
      { error: "Access denied. You are not registered as a platform administrator." },
      { status: 403 }
    );
  }

  // Step 3: Create platform admin session
  const sessionId = randomUUID();
  const token = await signAdminToken(sessionId, user.id);
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const userAgent = request.headers.get("user-agent") ?? "";

  const { error: sessionErr } = await db.from("admin_sessions").insert({
    id: sessionId,
    user_id: user.id,
    token_hash: tokenHash,
    ip_address: ip,
    user_agent: userAgent.slice(0, 500),
    device_info: { userAgent: userAgent.slice(0, 200), acceptLanguage: request.headers.get("accept-language") },
    is_active: true,
    expires_at: new Date(Date.now() + TOKEN_TTL_SECONDS * 1000).toISOString(),
  });

  if (sessionErr) {
    return NextResponse.json({ error: "Session creation failed" }, { status: 500 });
  }

  // Step 4: Update last_login_at on platform_admins record
  await db.from("platform_admins")
    .update({ last_login_at: new Date().toISOString() })
    .eq("user_id", user.id);

  // Step 5: Audit log
  await db.from("admin_audit_logs").insert({
    admin_uid: user.id,
    admin_email: user.email,
    action: "platform_admin_login",
    metadata: { ip, role: platformAdmin.role, userAgent: userAgent.slice(0, 200) },
    ip_address: ip,
    user_agent: userAgent.slice(0, 500),
    severity: "info",
  });

  const isProd = process.env.NODE_ENV === "production";
  const response = NextResponse.json({ success: true, role: platformAdmin.role });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    path: "/",
    maxAge: TOKEN_TTL_SECONDS,
  });
  return response;
}
