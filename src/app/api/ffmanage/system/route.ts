import { NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/admin/validate";
import type { SystemHealth } from "@/types/admin";

export async function GET(request: Request) {
  const admin = await validateAdminRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { db } = admin;
  const start = Date.now();

  // Test DB latency with a simple query
  const { error: dbErr } = await db.from("system_config").select("key").limit(1);
  const latencyMs = Date.now() - start;

  const health: SystemHealth = {
    status: dbErr ? "degraded" : "healthy",
    database: {
      status: dbErr ? "degraded" : "ok",
      latencyMs,
    },
    storage: { status: "ok" },
    checkedAt: new Date().toISOString(),
  };

  // Record metric
  await db.from("system_metrics").insert({
    metric_type: "health_check",
    numeric_value: latencyMs,
    json_value: health,
  });

  // Fetch recent metrics
  const { data: recentMetrics } = await db
    .from("system_metrics")
    .select("metric_type, numeric_value, json_value, recorded_at")
    .order("recorded_at", { ascending: false })
    .limit(100);

  // Fetch audit log summary (last 50 admin actions)
  const { data: auditLogs } = await db
    .from("admin_audit_logs")
    .select("id, admin_email, action, resource_type, resource_name, severity, ip_address, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  // Active admin sessions
  const { data: activeSessions } = await db
    .from("admin_sessions")
    .select("id, user_id, ip_address, user_agent, last_active_at, created_at")
    .eq("is_active", true)
    .gt("expires_at", new Date().toISOString());

  // Invite links
  const { data: inviteLinks } = await db
    .from("admin_invite_links")
    .select("*")
    .eq("revoked", false)
    .order("created_at", { ascending: false });

  return NextResponse.json({
    health,
    recentMetrics: recentMetrics ?? [],
    auditLogs: auditLogs ?? [],
    activeSessions: activeSessions ?? [],
    inviteLinks: inviteLinks ?? [],
  });
}
