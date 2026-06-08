import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { verifyAdminToken, SESSION_COOKIE } from "@/lib/admin/session";

function getAdminDb() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/rest\/v1\/?$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`)
  );
  const token = match ? decodeURIComponent(match[1]) : null;

  if (token) {
    const payload = await verifyAdminToken(token);
    if (payload) {
      const db = getAdminDb();
      const tokenHash = createHash("sha256").update(token).digest("hex");

      await db
        .from("admin_sessions")
        .update({ is_active: false })
        .eq("token_hash", tokenHash);

      await db.from("admin_audit_logs").insert({
        admin_uid: payload.uid,
        action: "admin_logout",
        ip_address:
          request.headers.get("x-forwarded-for") ??
          request.headers.get("x-real-ip") ??
          "unknown",
        severity: "info",
      });
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
