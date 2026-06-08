/**
 * Server-side admin request validation.
 * Call this at the top of every /api/ffmanage/* route handler.
 */

import { createClient } from "@supabase/supabase-js";
import { verifyAdminToken, SESSION_COOKIE } from "./session";
import { createHash } from "crypto";
import type { NextRequest } from "next/server";

function getAdminDb() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(
    /\/rest\/v1\/?$/,
    ""
  );
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key)
    throw new Error("Missing Supabase admin env vars");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface ValidatedAdmin {
  uid: string;
  email: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  db: ReturnType<typeof getAdminDb>;
}

/** Extract cookie value from request (works in both API routes and middleware). */
function getCookieValue(request: Request | NextRequest, name: string): string | null {
  // Next.js Request (API routes) — read from Cookie header
  const header = request.headers.get("cookie") ?? "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function validateAdminRequest(
  request: Request
): Promise<ValidatedAdmin | null> {
  const token = getCookieValue(request, SESSION_COOKIE);
  if (!token) return null;

  const payload = await verifyAdminToken(token);
  if (!payload) return null;

  const db = getAdminDb();

  // Verify session is active in DB
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { data: session } = await db
    .from("admin_sessions")
    .select("id, is_active, expires_at, user_id")
    .eq("token_hash", tokenHash)
    .single();

  if (
    !session ||
    !session.is_active ||
    new Date(session.expires_at) < new Date()
  ) {
    return null;
  }

  // Verify user is still the system owner
  const { data: config } = await db
    .from("system_config")
    .select("value")
    .eq("key", "system_owner_uid")
    .single();

  const systemOwnerUid = config?.value
    ? String(config.value).replace(/^"|"$/g, "")
    : null;

  if (systemOwnerUid !== payload.uid) return null;

  // Touch last_active_at (fire-and-forget)
  db.from("admin_sessions")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", session.id)
    .then(() => {});

  const { data: authUser } = await db.auth.admin.getUserById(payload.uid);
  const email = authUser?.user?.email ?? "";

  return {
    uid: payload.uid,
    email,
    sessionId: payload.sessionId,
    ipAddress:
      request.headers.get("x-forwarded-for") ??
      request.headers.get("x-real-ip") ??
      "unknown",
    userAgent: request.headers.get("user-agent") ?? "",
    db,
  };
}

/** Write an admin audit log entry — fire-and-forget is fine. */
export async function writeAuditLog(
  db: ReturnType<typeof getAdminDb>,
  params: {
    adminUid: string;
    adminEmail: string;
    action: string;
    resourceType?: string;
    resourceId?: string;
    resourceName?: string;
    previousState?: Record<string, unknown>;
    newState?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    severity?: "info" | "warning" | "critical";
  }
) {
  await db.from("admin_audit_logs").insert({
    admin_uid: params.adminUid,
    admin_email: params.adminEmail,
    action: params.action,
    resource_type: params.resourceType ?? null,
    resource_id: params.resourceId ?? null,
    resource_name: params.resourceName ?? null,
    previous_state: params.previousState ?? null,
    new_state: params.newState ?? null,
    metadata: params.metadata ?? {},
    ip_address: params.ipAddress ?? null,
    user_agent: params.userAgent ?? null,
    severity: params.severity ?? "info",
  });
}

export { getAdminDb };
