import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getManagerPermissions, isFinanceOwner } from "@/lib/permissions";
import type { FinanceAccessSettings, UserProfile, ManagerPermissions } from "@/types/domain";

function getAdminClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/rest\/v1\/?$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !serviceKey) throw new Error("Missing Supabase admin env vars");
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * GET /api/finance/owner-insights
 * Returns aggregated financial metrics restricted to the owner or permitted managers.
 * Server-side permission enforcement — no restricted data leaks through this endpoint.
 *
 * Authorization: Bearer <supabase-session-token>
 * Query params:
 *   businessId — required
 *   permission — optional: specific ManagerPermissions key being requested
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  const permission = searchParams.get("permission") as keyof ManagerPermissions | null;

  if (!businessId) {
    return NextResponse.json({ error: "Missing businessId" }, { status: 400 });
  }

  const authHeader = request.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdminClient();
  const { data: { user: authUser }, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !authUser) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  // Load caller profile
  const { data: profileRow } = await admin
    .from("profiles")
    .select("*")
    .eq("id", authUser.id)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!profileRow) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const profile = { ...(profileRow as Record<string, unknown>), uid: authUser.id } as unknown as UserProfile;

  // Load business finance_access settings
  const { data: bizRow } = await admin
    .from("businesses")
    .select("finance_access")
    .eq("id", businessId)
    .maybeSingle();

  const financeAccess = (bizRow as Record<string, unknown> | null)?.finance_access as FinanceAccessSettings | undefined;

  // Resolve access
  const ownerAccess = isFinanceOwner(profile, financeAccess);
  if (!ownerAccess) {
    if (!permission) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const managerPerms = getManagerPermissions(profile, financeAccess);
    if (!managerPerms[permission]) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }
  }

  // Aggregate the financial data
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const [paymentsRes, expensesRes, withdrawalsRes, materialsRes, membersRes] = await Promise.all([
    admin.from("payments").select("amount, recorded_at").eq("business_id", businessId),
    admin.from("expenses").select("amount, expense_date").eq("business_id", businessId),
    admin.from("withdrawals").select("amount, withdrawal_date").eq("business_id", businessId),
    admin.from("inventory_materials").select("quantity, average_unit_cost").eq("business_id", businessId),
    admin.from("profiles").select("pay_rate, pay_period").eq("business_id", businessId).neq("role", "owner"),
  ]);

  type PaymentRow = { amount: number; recorded_at?: string };
  type ExpenseRow = { amount: number; expense_date?: string };
  type WithdrawalRow = { amount: number; withdrawal_date?: string };
  type MaterialRow = { quantity: number; average_unit_cost: number };
  type MemberRow = { pay_rate?: number; pay_period?: string };

  const payments = (paymentsRes.data ?? []) as PaymentRow[];
  const expenses = (expensesRes.data ?? []) as ExpenseRow[];
  const withdrawals = (withdrawalsRes.data ?? []) as WithdrawalRow[];
  const materials = (materialsRes.data ?? []) as MaterialRow[];
  const members = (membersRes.data ?? []) as MemberRow[];

  const sumAmt = (rows: Array<{ amount: number }>) => rows.reduce((s, r) => s + Number(r.amount), 0);

  const weekPayments = payments.filter((p) => p.recorded_at && new Date(p.recorded_at) >= weekStart);
  const monthPayments = payments.filter((p) => p.recorded_at && new Date(p.recorded_at) >= monthStart);
  const yearPayments = payments.filter((p) => p.recorded_at && new Date(p.recorded_at) >= yearStart);
  const monthExpenses = expenses.filter((e) => e.expense_date && new Date(e.expense_date) >= monthStart);
  const monthWithdrawals = withdrawals.filter((w) => w.withdrawal_date && new Date(w.withdrawal_date) >= monthStart);

  const inventoryValue = materials.reduce((s, m) => s + Number(m.quantity) * Number(m.average_unit_cost), 0);
  const totalRevenue = sumAmt(payments);
  const weekRevenue = sumAmt(weekPayments);
  const monthRevenue = sumAmt(monthPayments);
  const yearRevenue = sumAmt(yearPayments);
  const monthExpTotal = sumAmt(monthExpenses);
  const monthWdlTotal = sumAmt(monthWithdrawals);
  const netProfit = monthRevenue - monthExpTotal - monthWdlTotal;
  const profitMargin = monthRevenue > 0 ? (netProfit / monthRevenue) * 100 : 0;

  const payrollLiability = members.reduce((s, m) => {
    const rate = Number(m.pay_rate ?? 0);
    if (m.pay_period === "daily") return s + rate * 30;
    if (m.pay_period === "weekly") return s + rate * 4;
    return s + rate;
  }, 0);

  return NextResponse.json({
    weekRevenue,
    monthRevenue,
    yearRevenue,
    totalRevenue,
    inventoryValue,
    netProfit,
    profitMargin,
    monthExpenses: monthExpTotal,
    monthWithdrawals: monthWdlTotal,
    payrollLiability,
  });
}
