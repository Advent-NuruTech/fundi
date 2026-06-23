import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * Per-business performance overview for the signed-in owner.
 *
 * Returns every business this user is an active member of, each with headline
 * performance metrics (sales revenue, orders, customers, branches) plus its
 * plan/category. Powers the "My Businesses" page so an owner can compare all
 * their shops at a glance and jump into any of them.
 *
 * Security: uses the service role but STRICTLY scopes every query to the
 * business ids the caller belongs to (resolved from business_members), so an
 * owner can never see a business they aren't a member of.
 */
function getAdminClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/rest\/v1\/?$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !serviceKey) throw new Error("Missing Supabase admin env vars");
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

interface BusinessOverview {
  id: string;
  name: string;
  businessType: string;
  location: string | null;
  role: string;
  plan: string;
  subscriptionStatus: string | null;
  revenue: number;
  orderCount: number;
  customerCount: number;
  branchCount: number;
  createdAt: string;
}

export async function GET(request: Request) {
  try {
    const admin = getAdminClient();

    const authHeader = request.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    // Businesses this user actively belongs to.
    const { data: memberRows } = await admin
      .from("business_members")
      .select("business_id, role")
      .eq("profile_id", user.id)
      .eq("active", true);

    const roleByBusiness = new Map<string, string>();
    for (const m of memberRows ?? []) roleByBusiness.set(m.business_id as string, m.role as string);
    const ids = [...roleByBusiness.keys()];

    if (ids.length === 0) return NextResponse.json({ businesses: [] });

    const [bizRes, subsRes, paymentsRes, ordersRes, customersRes, branchesRes] =
      await Promise.allSettled([
        admin.from("businesses").select("id, name, business_type, location, created_at").in("id", ids),
        admin.from("subscriptions").select("workspace_id, plan_slug, status").in("workspace_id", ids),
        admin.from("payments").select("business_id, amount").in("business_id", ids),
        admin.from("orders").select("business_id").in("business_id", ids),
        admin.from("customers").select("business_id").in("business_id", ids),
        admin.from("branches").select("business_id").in("business_id", ids),
      ]);

    const val = <T,>(r: PromiseSettledResult<{ data: T[] | null }>): T[] =>
      r.status === "fulfilled" && r.value.data ? r.value.data : [];

    const bizRows = val<{ id: string; name: string; business_type: string; location: string | null; created_at: string }>(bizRes as never);
    const subRows = val<{ workspace_id: string; plan_slug: string; status: string }>(subsRes as never);
    const paymentRows = val<{ business_id: string; amount: number }>(paymentsRes as never);
    const orderRows = val<{ business_id: string }>(ordersRes as never);
    const customerRows = val<{ business_id: string }>(customersRes as never);
    const branchRows = val<{ business_id: string }>(branchesRes as never);

    const subByBiz = new Map<string, { plan: string; status: string }>();
    for (const s of subRows) subByBiz.set(s.workspace_id, { plan: s.plan_slug, status: s.status });

    const revenueByBiz = new Map<string, number>();
    for (const p of paymentRows) revenueByBiz.set(p.business_id, (revenueByBiz.get(p.business_id) ?? 0) + Number(p.amount ?? 0));

    const countBy = (rows: { business_id: string }[]) => {
      const m = new Map<string, number>();
      for (const r of rows) m.set(r.business_id, (m.get(r.business_id) ?? 0) + 1);
      return m;
    };
    const orderCounts = countBy(orderRows);
    const customerCounts = countBy(customerRows);
    const branchCounts = countBy(branchRows);

    const businesses: BusinessOverview[] = bizRows
      .map((b) => ({
        id: b.id,
        name: b.name,
        businessType: b.business_type ?? "tailoring",
        location: b.location,
        role: roleByBusiness.get(b.id) ?? "owner",
        plan: subByBiz.get(b.id)?.plan ?? "none",
        subscriptionStatus: subByBiz.get(b.id)?.status ?? null,
        revenue: revenueByBiz.get(b.id) ?? 0,
        orderCount: orderCounts.get(b.id) ?? 0,
        customerCount: customerCounts.get(b.id) ?? 0,
        branchCount: branchCounts.get(b.id) ?? 0,
        createdAt: b.created_at,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return NextResponse.json({ businesses });
  } catch (err) {
    console.error("[businesses/overview]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load businesses" },
      { status: 500 },
    );
  }
}
