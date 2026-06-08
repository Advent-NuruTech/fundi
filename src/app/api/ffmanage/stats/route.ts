import { NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/admin/validate";
import type { PlatformStats, RevenueDataPoint } from "@/types/admin";

export async function GET(request: Request) {
  const admin = await validateAdminRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { db } = admin;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();

  const [
    businessesRes,
    subscriptionsRes,
    employeesRes,
    customersRes,
    smsRes,
    pendingPaymentsRes,
    failedPaymentsRes,
    dailyRevenueRes,
    weeklyRevenueRes,
    monthlyRevenueRes,
    annualRevenueRes,
    supportRes,
    revenueTrendRes,
  ] = await Promise.allSettled([
    db.from("businesses").select("id", { count: "exact", head: true }),
    db
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    db.from("business_members").select("id", { count: "exact", head: true }).eq("active", true),
    db.from("customers").select("id", { count: "exact", head: true }),
    db.from("sms_logs").select("id", { count: "exact", head: true }),
    db
      .from("billing_payments")
      .select("id", { count: "exact", head: true })
      .eq("payment_status", "pending"),
    db
      .from("billing_payments")
      .select("id", { count: "exact", head: true })
      .eq("payment_status", "failed"),
    db
      .from("billing_payments")
      .select("amount")
      .eq("payment_status", "success")
      .gte("paid_at", startOfDay),
    db
      .from("billing_payments")
      .select("amount")
      .eq("payment_status", "success")
      .gte("paid_at", startOfWeek),
    db
      .from("billing_payments")
      .select("amount")
      .eq("payment_status", "success")
      .gte("paid_at", startOfMonth),
    db
      .from("billing_payments")
      .select("amount")
      .eq("payment_status", "success")
      .gte("paid_at", startOfYear),
    db
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "in_progress"]),
    db
      .from("billing_payments")
      .select("amount, paid_at")
      .eq("payment_status", "success")
      .gte("paid_at", startOfMonth)
      .order("paid_at", { ascending: true }),
  ]);

  function sumAmounts(res: PromiseSettledResult<{ data: { amount: number }[] | null; error: unknown }>) {
    if (res.status !== "fulfilled" || !res.value.data) return 0;
    return res.value.data.reduce((s, r) => s + (r.amount ?? 0), 0);
  }

  function getCount(res: PromiseSettledResult<{ count: number | null; error: unknown }>) {
    if (res.status !== "fulfilled") return 0;
    return res.value.count ?? 0;
  }

  const totalRevenue = sumAmounts(annualRevenueRes as never);

  const stats: PlatformStats = {
    totalBusinesses: getCount(businessesRes as never),
    activeSubscriptions: getCount(subscriptionsRes as never),
    totalEmployees: getCount(employeesRes as never),
    totalCustomers: getCount(customersRes as never),
    totalSmsSent: getCount(smsRes as never),
    totalRevenue,
    pendingPayments: getCount(pendingPaymentsRes as never),
    failedPayments: getCount(failedPaymentsRes as never),
    dailyRevenue: sumAmounts(dailyRevenueRes as never),
    weeklyRevenue: sumAmounts(weeklyRevenueRes as never),
    monthlyRevenue: sumAmounts(monthlyRevenueRes as never),
    annualRevenue: totalRevenue,
    openSupportTickets: getCount(supportRes as never),
  };

  // Build revenue trend (last 30 days)
  const trendMap = new Map<string, { revenue: number; payments: number }>();
  if (revenueTrendRes.status === "fulfilled" && revenueTrendRes.value.data) {
    for (const row of revenueTrendRes.value.data) {
      const date = row.paid_at?.slice(0, 10) ?? "";
      const existing = trendMap.get(date) ?? { revenue: 0, payments: 0 };
      trendMap.set(date, {
        revenue: existing.revenue + (row.amount ?? 0),
        payments: existing.payments + 1,
      });
    }
  }

  const revenueTrend: RevenueDataPoint[] = Array.from(trendMap.entries()).map(
    ([date, vals]) => ({ date, ...vals })
  );

  return NextResponse.json({ stats, revenueTrend });
}
