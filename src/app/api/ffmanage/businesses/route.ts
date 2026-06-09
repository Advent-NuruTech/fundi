import { NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/admin/validate";
import type { AdminBusinessSummary } from "@/types/admin";

export async function GET(request: Request) {
  const admin = await validateAdminRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { db } = admin;
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") ?? "1", 10);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20", 10), 100);
  const search = url.searchParams.get("search") ?? "";
  const plan = url.searchParams.get("plan") ?? "";
  const status = url.searchParams.get("status") ?? "";
  const sortBy = url.searchParams.get("sortBy") ?? "created_at";
  const sortDir = url.searchParams.get("sortDir") === "asc" ? true : false;
  const offset = (page - 1) * limit;

  // Fetch platform admin UIDs so we can exclude them from tenant listings.
  // Platform admins are NOT tenants and must never appear in the business table.
  const { data: platformAdmins } = await db
    .from("platform_admins")
    .select("user_id")
    .eq("is_active", true);
  const platformAdminUids = (platformAdmins ?? []).map((p: { user_id: string }) => p.user_id);

  let query = db
    .from("businesses")
    .select(
      `
      id, name, email, phone, location, owner_uid, is_active, created_at, plan,
      subscriptions!subscriptions_workspace_id_fkey (
        id, plan_slug, status, next_billing_date, installation_fee_paid
      ),
      profiles!businesses_owner_uid_fkey (
        email, display_name
      )
    `,
      { count: "exact" }
    );

  // Always exclude platform admin accounts from the tenant listing
  if (platformAdminUids.length > 0) {
    query = query.not("owner_uid", "in", `(${platformAdminUids.join(",")})`);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
  }
  if (status === "active") query = query.eq("is_active", true);
  if (status === "suspended") query = query.eq("is_active", false);

  const allowedSorts = ["created_at", "name", "plan"];
  const safeSort = allowedSorts.includes(sortBy) ? sortBy : "created_at";
  query = query.order(safeSort, { ascending: sortDir }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Filter by plan after fetch (subscription plan_slug)
  let rows = (data ?? []) as Array<Record<string, unknown>>;
  if (plan) {
    rows = rows.filter((r) => {
      const sub = Array.isArray(r.subscriptions) ? r.subscriptions[0] : r.subscriptions;
      return sub && (sub as Record<string, unknown>).plan_slug === plan;
    });
  }

  // Get employee + customer counts in bulk
  const businessIds = rows.map((r) => r.id as string);

  const [memberCountsRes, customerCountsRes, orderCountsRes, revenueRes, smsCountsRes] =
    await Promise.allSettled([
      db
        .from("business_members")
        .select("business_id")
        .in("business_id", businessIds)
        .eq("active", true),
      db.from("customers").select("business_id").in("business_id", businessIds),
      db.from("orders").select("business_id").in("business_id", businessIds),
      db
        .from("billing_payments")
        .select("workspace_id, amount")
        .in("workspace_id", businessIds)
        .eq("payment_status", "success"),
      db
        .from("sms_logs")
        .select("business_id")
        .in("business_id", businessIds),
    ]);

  function countsByBusiness(res: PromiseSettledResult<{ data: { business_id?: string; workspace_id?: string }[] | null }>) {
    const counts = new Map<string, number>();
    if (res.status !== "fulfilled" || !res.value.data) return counts;
    for (const row of res.value.data) {
      const id = (row.business_id ?? row.workspace_id) as string;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  }

  function revenueByBusiness(res: PromiseSettledResult<{ data: { workspace_id: string; amount: number }[] | null }>) {
    const totals = new Map<string, number>();
    if (res.status !== "fulfilled" || !res.value.data) return totals;
    for (const row of res.value.data) {
      totals.set(row.workspace_id, (totals.get(row.workspace_id) ?? 0) + (row.amount ?? 0));
    }
    return totals;
  }

  const memberCounts = countsByBusiness(memberCountsRes as never);
  const customerCounts = countsByBusiness(customerCountsRes as never);
  const orderCounts = countsByBusiness(orderCountsRes as never);
  const revenues = revenueByBusiness(revenueRes as never);
  const smsCounts = countsByBusiness(smsCountsRes as never);

  const businesses: AdminBusinessSummary[] = rows.map((r) => {
    const sub = Array.isArray(r.subscriptions)
      ? (r.subscriptions[0] as Record<string, unknown>)
      : (r.subscriptions as Record<string, unknown> | null);
    const profile = Array.isArray(r.profiles)
      ? (r.profiles[0] as Record<string, unknown>)
      : (r.profiles as Record<string, unknown> | null);
    const id = r.id as string;
    return {
      id,
      name: r.name as string,
      email: r.email as string | null,
      phone: r.phone as string,
      location: r.location as string | null,
      ownerUid: r.owner_uid as string,
      ownerEmail: profile?.email as string | undefined,
      ownerName: profile?.display_name as string | undefined,
      isActive: r.is_active as boolean,
      createdAt: r.created_at as string,
      plan: (sub?.plan_slug as string) ?? (r.plan as string) ?? "none",
      subscriptionStatus: (sub?.status as string) ?? null,
      subscriptionId: (sub?.id as string) ?? null,
      employeeCount: memberCounts.get(id) ?? 0,
      customerCount: customerCounts.get(id) ?? 0,
      orderCount: orderCounts.get(id) ?? 0,
      totalRevenue: revenues.get(id) ?? 0,
      smsSentCount: smsCounts.get(id) ?? 0,
      lastPaymentAt: null,
      nextBillingDate: (sub?.next_billing_date as string) ?? null,
    };
  });

  return NextResponse.json({ businesses, total: count ?? 0, page, limit });
}
