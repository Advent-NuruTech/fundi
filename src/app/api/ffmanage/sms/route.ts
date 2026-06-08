import { NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/admin/validate";

export async function GET(request: Request) {
  const admin = await validateAdminRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { db } = admin;
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") ?? "1", 10);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "25", 10), 100);
  const offset = (page - 1) * limit;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [
    totalRes,
    monthlyRes,
    byBusinessRes,
    logsRes,
    trendRes,
  ] = await Promise.allSettled([
    db.from("sms_logs").select("id", { count: "exact", head: true }),
    db.from("sms_logs").select("id", { count: "exact", head: true }).gte("created_at", startOfMonth),
    db
      .from("sms_logs")
      .select("business_id, status")
      .order("created_at", { ascending: false }),
    db
      .from("sms_logs")
      .select(
        `id, business_id, recipient_phone, message_type, status, created_at,
         businesses!sms_logs_business_id_fkey (name)`
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1),
    db
      .from("sms_logs")
      .select("created_at, status")
      .gte("created_at", new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  // Aggregate by business
  const bizStats = new Map<
    string,
    { sent: number; delivered: number; failed: number }
  >();
  if (byBusinessRes.status === "fulfilled" && byBusinessRes.value.data) {
    for (const row of byBusinessRes.value.data as { business_id: string; status: string }[]) {
      const s = bizStats.get(row.business_id) ?? { sent: 0, delivered: 0, failed: 0 };
      s.sent += 1;
      if (row.status === "delivered" || row.status === "success") s.delivered += 1;
      if (row.status === "failed") s.failed += 1;
      bizStats.set(row.business_id, s);
    }
  }

  // Get business names for top businesses
  const topBizIds = Array.from(bizStats.entries())
    .sort((a, b) => b[1].sent - a[1].sent)
    .slice(0, 10)
    .map(([id]) => id);

  let bizNameMap = new Map<string, string>();
  if (topBizIds.length > 0) {
    const { data: bizData } = await db
      .from("businesses")
      .select("id, name")
      .in("id", topBizIds);
    if (bizData) {
      for (const b of bizData as { id: string; name: string }[]) {
        bizNameMap.set(b.id, b.name);
      }
    }
  }

  const topBusinesses = topBizIds.map((id) => ({
    businessId: id,
    businessName: bizNameMap.get(id) ?? "Unknown",
    ...(bizStats.get(id) ?? { sent: 0, delivered: 0, failed: 0 }),
  }));

  // Daily trend for last 30 days
  const trendMap = new Map<string, number>();
  if (trendRes.status === "fulfilled" && trendRes.value.data) {
    for (const row of trendRes.value.data as { created_at: string }[]) {
      const date = row.created_at.slice(0, 10);
      trendMap.set(date, (trendMap.get(date) ?? 0) + 1);
    }
  }
  const trend = Array.from(trendMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, sent]) => ({ date, sent }));

  const logs =
    logsRes.status === "fulfilled"
      ? (logsRes.value.data ?? []).map((row: Record<string, unknown>) => {
          const biz = Array.isArray(row.businesses) ? row.businesses[0] : row.businesses;
          return {
            ...row,
            businessName: (biz as Record<string, unknown> | null)?.name ?? null,
          };
        })
      : [];

  return NextResponse.json({
    total: totalRes.status === "fulfilled" ? (totalRes.value.count ?? 0) : 0,
    thisMonth: monthlyRes.status === "fulfilled" ? (monthlyRes.value.count ?? 0) : 0,
    topBusinesses,
    trend,
    logs,
    total_logs: (logsRes.status === "fulfilled" ? logsRes.value : null),
  });
}
