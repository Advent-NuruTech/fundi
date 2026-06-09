/**
 * Server-side admin request validation.
 * Call this at the top of every /api/ffmanage/* route handler.
 *
 * Authorization model:
 *   1. Verify HMAC-signed session token (stateless, fast)
 *   2. Verify session row is active + not expired in admin_sessions
 *   3. Verify user exists in platform_admins with is_active = true
 *
 * Platform admins are NOT tenants. This check never touches profiles,
 * businesses, or business_members.
 */

import { createClient } from "@supabase/supabase-js";
import { verifyAdminToken, SESSION_COOKIE } from "./session";
import { createHash } from "crypto";
import type { NextRequest } from "next/server";
import type { PlatformRole } from "@/types/admin";

function getAdminDb() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(
    /\/rest\/v1\/?$/,
    ""
  );
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) throw new Error("Missing Supabase admin env vars");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface ValidatedAdmin {
  uid: string;
  email: string;
  platformRole: PlatformRole;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  db: ReturnType<typeof getAdminDb>;
}

function getCookieValue(request: Request | NextRequest, name: string): string | null {
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

  // 1. Verify session is active + not expired
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { data: session } = await db
    .from("admin_sessions")
    .select("id, is_active, expires_at, user_id")
    .eq("token_hash", tokenHash)
    .single();

  if (!session || !session.is_active || new Date(session.expires_at) < new Date()) {
    return null;
  }

  // 2. Verify user is an active platform admin (NOT a tenant check)
  const { data: platformAdmin } = await db
    .from("platform_admins")
    .select("role, is_active, email")
    .eq("user_id", payload.uid)
    .single();

  if (!platformAdmin || !platformAdmin.is_active) return null;

  // Touch last_active_at (fire-and-forget)
  db.from("admin_sessions")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", session.id)
    .then(() => {});

  return {
    uid: payload.uid,
    email: platformAdmin.email,
    platformRole: platformAdmin.role as PlatformRole,
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
