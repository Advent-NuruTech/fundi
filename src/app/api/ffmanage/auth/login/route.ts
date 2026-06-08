import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash, randomUUID } from "crypto";
import { z } from "zod";
import { signAdminToken, SESSION_COOKIE, TOKEN_TTL_SECONDS } from "@/lib/admin/session";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Simple in-memory rate limiter: max 5 attempts per IP per 15 minutes
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

function getAdminDb() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/rest\/v1\/?$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
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
  const db = getAdminDb();

  // Authenticate via Supabase Auth
  const { data: authData, error: authErr } = await db.auth.signInWithPassword({
    email,
    password,
  });

  if (authErr || !authData?.user) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const user = authData.user;

  // Check that this user is the system owner
  const { data: ownerConfig } = await db
    .from("system_config")
    .select("value")
    .eq("key", "system_owner_uid")
    .single();

  const systemOwnerUid = ownerConfig?.value
    ? String(ownerConfig.value).replace(/^"|"$/g, "")
    : null;

  if (systemOwnerUid !== user.id) {
    return NextResponse.json(
      { error: "Access denied. This panel is restricted to the system owner." },
      { status: 403 }
    );
  }

  // Create session
  const sessionId = randomUUID();
  const token = await signAdminToken(sessionId, user.id);
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const userAgent = request.headers.get("user-agent") ?? "";
  const deviceInfo = {
    userAgent: userAgent.slice(0, 200),
    acceptLanguage: request.headers.get("accept-language") ?? null,
  };

  const { error: sessionErr } = await db.from("admin_sessions").insert({
    id: sessionId,
    user_id: user.id,
    token_hash: tokenHash,
    ip_address: ip,
    user_agent: userAgent.slice(0, 500),
    device_info: deviceInfo,
    is_active: true,
    expires_at: new Date(Date.now() + TOKEN_TTL_SECONDS * 1000).toISOString(),
  });

  if (sessionErr) {
    return NextResponse.json({ error: "Session creation failed" }, { status: 500 });
  }

  // Log the login
  await db.from("admin_audit_logs").insert({
    admin_uid: user.id,
    admin_email: user.email,
    action: "admin_login",
    metadata: { ip, userAgent: userAgent.slice(0, 200) },
    ip_address: ip,
    user_agent: userAgent.slice(0, 500),
    severity: "info",
  });

  // Set httpOnly session cookie
  const response = NextResponse.json({ success: true });
  const isProd = process.env.NODE_ENV === "production";
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    path: "/",
    maxAge: TOKEN_TTL_SECONDS,
  });

  return response;
}
