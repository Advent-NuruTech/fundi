// SERVER-ONLY — never import from client components.
//
// Business Memory layer for the Business AI Assistant (AI 2).
// Builds a private, per-tenant data snapshot that is injected into the system
// prompt. The snapshot is scoped by the persona's declared contextScopes — a
// financial analyst never receives inventory numbers it doesn't need, a
// production planner never receives marketing data. This is the AI-level
// permission boundary INSIDE one tenant; cross-tenant isolation is enforced by
// the backend (business_id filters + RLS + membership checks) and is never the
// prompt's responsibility.
//
// Every query is wrapped so a failing sub-query degrades gracefully: the
// assistant still works, it just sees less data (and the prompt tells it not
// to invent missing figures).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AIContextScope } from "./types";

export interface BusinessSnapshot {
  business: {
    name: string;
    businessType: string | null;
    location: string | null;
    currency: string | null;
    address: string | null;
    createdAt: string | null;
  } | null;
  finance: {
    todayRevenue: number | null;
    monthRevenue: number | null;
    monthExpenses: number | null;
    outstandingDebt: number | null;
    recentExpenses: { category: string; amount: number; date: string }[];
  } | null;
  inventory: {
    lowStock: { name: string; quantity: number; reorderLevel: number; unit: string; cost: number }[];
    stockValue: number | null;
    totalItems: number | null;
  } | null;
  orders: {
    activeCount: number | null;
    overdueCount: number | null;
    dueNext7Days: number | null;
    byStage: Record<string, number>;
    last30DaysCount: number | null;
    last30DaysAvgOrderValue: number | null;
    outstandingBalances: { orderNumber: string; customerName: string; balance: number; dueDate: string }[];
  } | null;
  customers: {
    total: number | null;
    activeLast90Days: number | null;
    newThisMonth: number | null;
    topByOrders: { name: string; totalOrders: number; lastOrderAt: string | null }[];
  } | null;
  payments: {
    last7DaysSum: number | null;
    last7DaysCount: number | null;
    todayCount: number | null;
  } | null;
  team: {
    activeMembers: number | null;
    byRole: Record<string, number>;
  } | null;
}

type Row = Record<string, unknown>;

const currencyOf = (biz: Row | null): string => (biz?.currency ? String(biz.currency) : "KES");

function startOfMonth(): Date {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function startOfToday(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}

// ─── Snapshot cache ───────────────────────────────────────────────────────────
//
// The business snapshot is rebuilt at most once per TTL window per business.
// This serves two cost goals at once:
//   1. It stops the context builder from shipping entire tables on every turn
//      (DB aggregates + bounded top-N lists keep the payload minimal).
//   2. It keeps the system prompt STABLE between turns, so the LLM provider's
//      automatic prompt caching hits on the guardrails + persona + snapshot
//      prefix and on the conversation history that follows it.
// A stale snapshot is a degraded snapshot, never a wrong one: the prompt tells
// the assistant figures may be up to ~2 minutes old and never to invent them.

const SNAPSHOT_CACHE_TTL_MS = 90_000;
const SNAPSHOT_CACHE_MAX = 500;

const snapshotCache = new Map<
  string,
  { expiresAt: number; snapshot: BusinessSnapshot }
>();

function snapshotCacheKey(businessId: string, scopes: AIContextScope[]): string {
  return `${businessId}:${[...scopes].sort().join(",")}`;
}

function snapshotCacheGet(key: string): BusinessSnapshot | null {
  const hit = snapshotCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    snapshotCache.delete(key);
    return null;
  }
  return hit.snapshot;
}

function snapshotCacheSet(key: string, snapshot: BusinessSnapshot): void {
  snapshotCache.set(key, { expiresAt: Date.now() + SNAPSHOT_CACHE_TTL_MS, snapshot });
  if (snapshotCache.size <= SNAPSHOT_CACHE_MAX) return;
  const now = Date.now();
  for (const k of snapshotCache.keys()) {
    const entry = snapshotCache.get(k);
    if (entry && entry.expiresAt <= now) snapshotCache.delete(k);
    if (snapshotCache.size <= Math.floor(SNAPSHOT_CACHE_MAX / 2)) break;
  }
}

/** Loads the private business snapshot. Every section fails soft and returns null. */
export async function loadBusinessSnapshot(
  admin: SupabaseClient,
  businessId: string,
  scopes: AIContextScope[]
): Promise<BusinessSnapshot> {
  const want = new Set(scopes);
  const scope = (s: AIContextScope) => want.has(s);

  const snapshot: BusinessSnapshot = {
    business: null,
    finance: null,
    inventory: null,
    orders: null,
    customers: null,
    payments: null,
    team: null,
  };

  // ── business ───────────────────────────────────────────────────────────────
  if (scope("business")) {
    const { data } = await admin
      .from("businesses")
      .select("name, business_type, location, currency, address, created_at")
      .eq("id", businessId)
      .maybeSingle();
    if (data) {
      snapshot.business = {
        name: String(data.name ?? ""),
        businessType: (data.business_type as string | null) ?? null,
        location: (data.location as string | null) ?? null,
        currency: (data.currency as string | null) ?? null,
        address: (data.address as string | null) ?? null,
        createdAt: (data.created_at as string | null) ?? null,
      };
    }
  }

  // ── finance ────────────────────────────────────────────────────────────────
  if (scope("finance")) {
    const monthStart = startOfMonth().toISOString();
    const todayStart = startOfToday().toISOString();

    // Aggregates run in SQL (see 00045_ai_cost_efficiency.sql) so we never
    // ship whole payment/expense tables to the app just to add them up.
    const [todayRev, monthRev, debt, monthExp, recentExp] = await Promise.all([
      admin.rpc("ai_payments_sum", { p_business_id: businessId, p_since: todayStart }),
      admin.rpc("ai_payments_sum", { p_business_id: businessId, p_since: monthStart }),
      admin.rpc("ai_customer_balances_sum", { p_business_id: businessId }),
      admin.rpc("ai_expenses_sum", { p_business_id: businessId, p_since: monthStart }),
      admin
        .from("expenses")
        .select("category, amount, expense_date")
        .eq("business_id", businessId)
        .gte("expense_date", monthStart)
        .order("expense_date", { ascending: false })
        .limit(5),
    ]);

    const rpcNumber = (r: { data: unknown; error: unknown }): number | null =>
      r.error ? null : Number(r.data ?? 0);

    snapshot.finance = {
      todayRevenue: rpcNumber(todayRev),
      monthRevenue: rpcNumber(monthRev),
      monthExpenses: rpcNumber(monthExp),
      outstandingDebt: rpcNumber(debt),
      recentExpenses: (recentExp.data ?? []).map((r) => ({
        category: String(r.category ?? "Other"),
        amount: Number(r.amount ?? 0),
        date: String(r.expense_date ?? "").slice(0, 10),
      })),
    };
  }

  // ── inventory ──────────────────────────────────────────────────────────────
  if (scope("inventory")) {
    const [lowStock, stockValue, totalItems] = await Promise.all([
      admin
        .from("inventory_materials")
        .select("name, quantity, reorder_level, unit_name, average_unit_cost")
        .eq("business_id", businessId)
        .lte("quantity", "reorder_level")
        .order("reorder_level", { ascending: false })
        .limit(8),
      admin.rpc("ai_inventory_value", { p_business_id: businessId }),
      admin
        .from("inventory_materials")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId),
    ]);

    snapshot.inventory = {
      lowStock: (lowStock.data ?? []).map((r) => ({
        name: String(r.name ?? ""),
        quantity: Number(r.quantity ?? 0),
        reorderLevel: Number(r.reorder_level ?? 0),
        unit: String(r.unit_name ?? ""),
        cost: Number(r.average_unit_cost ?? 0),
      })),
      stockValue: stockValue.error ? null : Number(stockValue.data ?? 0),
      totalItems: totalItems.count,
    };
  }

  // ── orders + production ────────────────────────────────────────────────────
  if (scope("orders") || scope("production")) {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const inSeven = new Date(today.getTime() + 7 * 86_400_000).toISOString().slice(0, 10);
    const thirtyDays = daysAgo(30).toISOString();

    const [active, overdue, dueWeek, byStage, last30, last30Sum, balances] = await Promise.all([
      admin
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .neq("delivery_status", "picked"),
      admin
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .neq("delivery_status", "picked")
        .lt("due_date", todayStr),
      admin
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .neq("delivery_status", "picked")
        .gte("due_date", todayStr)
        .lte("due_date", inSeven),
      admin
        .from("orders")
        .select("stage")
        .eq("business_id", businessId)
        .neq("delivery_status", "picked"),
      admin
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .gte("created_at", thirtyDays),
      admin.rpc("ai_orders_subtotal_sum", { p_business_id: businessId, p_since: thirtyDays }),
      admin
        .from("orders")
        .select("order_number, customer_name, balance_amount, due_date")
        .eq("business_id", businessId)
        .gt("balance_amount", 0)
        .order("due_date", { ascending: true })
        .limit(5),
    ]);

    const stageCounts: Record<string, number> = {};
    for (const r of byStage.data ?? []) {
      const stage = String(r.stage ?? "unknown");
      stageCounts[stage] = (stageCounts[stage] ?? 0) + 1;
    }
    const last30Count = last30.count ?? 0;
    const last30Subtotal = last30Sum.error ? null : Number(last30Sum.data ?? 0);

    snapshot.orders = {
      activeCount: active.count,
      overdueCount: overdue.count,
      dueNext7Days: dueWeek.count,
      byStage: stageCounts,
      last30DaysCount: last30Count,
      last30DaysAvgOrderValue:
        last30Count && last30Subtotal != null
          ? Math.round(last30Subtotal / last30Count)
          : null,
      outstandingBalances: (balances.data ?? []).map((r) => ({
        orderNumber: String(r.order_number ?? ""),
        customerName: String(r.customer_name ?? ""),
        balance: Number(r.balance_amount ?? 0),
        dueDate: String(r.due_date ?? "").slice(0, 10),
      })),
    };
  }

  // ── customers ──────────────────────────────────────────────────────────────
  if (scope("customers")) {
    const monthStart = startOfMonth().toISOString();
    const ninetyDays = daysAgo(90).toISOString();

    const [total, active, newMonth, top] = await Promise.all([
      admin
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId),
      admin
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .gte("last_order_at", ninetyDays),
      admin
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .gte("created_at", monthStart),
      admin
        .from("customers")
        .select("full_name, total_orders, last_order_at")
        .eq("business_id", businessId)
        .order("total_orders", { ascending: false })
        .limit(5),
    ]);

    snapshot.customers = {
      total: total.count,
      activeLast90Days: active.count,
      newThisMonth: newMonth.count,
      topByOrders: (top.data ?? []).map((r) => ({
        name: String(r.full_name ?? ""),
        totalOrders: Number(r.total_orders ?? 0),
        lastOrderAt: (r.last_order_at as string | null) ?? null,
      })),
    };
  }

  // ── payments ───────────────────────────────────────────────────────────────
  if (scope("payments")) {
    const sevenDays = daysAgo(7).toISOString();
    const todayStart = startOfToday().toISOString();

    const [week, weekCount, today] = await Promise.all([
      admin.rpc("ai_payments_sum", { p_business_id: businessId, p_since: sevenDays }),
      admin
        .from("payments")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .gte("recorded_at", sevenDays),
      admin
        .from("payments")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .gte("recorded_at", todayStart),
    ]);

    snapshot.payments = {
      last7DaysSum: week.error ? null : Number(week.data ?? 0),
      last7DaysCount: weekCount.count,
      todayCount: today.count,
    };
  }

  // ── team ───────────────────────────────────────────────────────────────────
  if (scope("team")) {
    const { data } = await admin
      .from("business_members")
      .select("role")
      .eq("business_id", businessId)
      .eq("active", true);

    const byRole: Record<string, number> = {};
    for (const r of data ?? []) {
      const role = String(r.role ?? "member");
      byRole[role] = (byRole[role] ?? 0) + 1;
    }
    snapshot.team = {
      activeMembers: data?.length ?? null,
      byRole,
    };
  }

  return snapshot;
}

// ─── Rendering ───────────────────────────────────────────────────────────────

const fmtMoney = (n: number | null | undefined, currency: string): string =>
  n == null ? "not available" : `${currency} ${n.toLocaleString()}`;

/** Turns the snapshot into a compact, prompt-friendly "BUSINESS DATA" block. */
export function renderSnapshot(snapshot: BusinessSnapshot): string {
  const parts: string[] = [];
  const currency = currencyOf(snapshot.business as Row | null);

  parts.push("## BUSINESS DATA (private snapshot for this business only)");

  if (snapshot.business) {
    parts.push(`- Business: ${snapshot.business.name}${snapshot.business.businessType ? ` (${snapshot.business.businessType})` : ""}${snapshot.business.location ? `, ${snapshot.business.location}` : ""}`);
  }

  if (snapshot.finance) {
    parts.push(
      "- Finance:",
      `  - Revenue today: ${fmtMoney(snapshot.finance.todayRevenue, currency)}`,
      `  - Revenue this month: ${fmtMoney(snapshot.finance.monthRevenue, currency)}`,
      `  - Expenses this month: ${fmtMoney(snapshot.finance.monthExpenses, currency)}`,
      `  - Outstanding customer debt: ${fmtMoney(snapshot.finance.outstandingDebt, currency)}`,
      snapshot.finance.recentExpenses.length
        ? `  - Recent expenses: ${snapshot.finance.recentExpenses.map((e) => `${e.category} ${currency} ${e.amount.toLocaleString()} (${e.date})`).join(", ")}`
        : ""
    );
  }

  if (snapshot.inventory) {
    parts.push(
      "- Inventory:",
      `  - Total items: ${snapshot.inventory.totalItems ?? "not available"}`,
      `  - Stock value: ${fmtMoney(snapshot.inventory.stockValue, currency)}`,
      snapshot.inventory.lowStock.length
        ? `  - Running low: ${snapshot.inventory.lowStock.map((m) => `${m.name} (${m.quantity} ${m.unit}, reorder at ${m.reorderLevel})`).join("; ")}`
        : "  - No items currently below their reorder level"
    );
  }

  if (snapshot.orders) {
    const stageSummary = Object.entries(snapshot.orders.byStage)
      .map(([s, c]) => `${s}: ${c}`)
      .join(", ");
    parts.push(
      "- Orders:",
      `  - Active orders: ${snapshot.orders.activeCount ?? "not available"}`,
      `  - Overdue orders: ${snapshot.orders.overdueCount ?? "not available"}`,
      `  - Due in the next 7 days: ${snapshot.orders.dueNext7Days ?? "not available"}`,
      stageSummary ? `  - By production stage: ${stageSummary}` : "",
      `  - Orders in the last 30 days: ${snapshot.orders.last30DaysCount ?? "not available"}`,
      `  - Average order value (30 days): ${fmtMoney(snapshot.orders.last30DaysAvgOrderValue, currency)}`,
      snapshot.orders.outstandingBalances.length
        ? `  - Unpaid order balances: ${snapshot.orders.outstandingBalances.map((o) => `${o.orderNumber} (${o.customerName}) ${currency} ${o.balance.toLocaleString()} due ${o.dueDate}`).join("; ")}`
        : ""
    );
  }

  if (snapshot.customers) {
    parts.push(
      "- Customers:",
      `  - Total: ${snapshot.customers.total ?? "not available"}`,
      `  - Active in the last 90 days: ${snapshot.customers.activeLast90Days ?? "not available"}`,
      `  - New this month: ${snapshot.customers.newThisMonth ?? "not available"}`,
      snapshot.customers.topByOrders.length
        ? `  - Top by orders: ${snapshot.customers.topByOrders.map((c) => `${c.name} (${c.totalOrders} orders)`).join(", ")}`
        : ""
    );
  }

  if (snapshot.payments) {
    parts.push(
      "- Payments:",
      `  - Received in the last 7 days: ${fmtMoney(snapshot.payments.last7DaysSum, currency)} (${snapshot.payments.last7DaysCount ?? "?"} payments)`,
      `  - Payments today: ${snapshot.payments.todayCount ?? "not available"}`
    );
  }

  if (snapshot.team) {
    const roleSummary = Object.entries(snapshot.team.byRole)
      .map(([r, c]) => `${r}: ${c}`)
      .join(", ");
    parts.push(
      "- Team:",
      `  - Active members: ${snapshot.team.activeMembers ?? "not available"}`,
      roleSummary ? `  - By role: ${roleSummary}` : ""
    );
  }

  parts.push(
    "",
    "Note: figures marked 'not available' were not loaded. Never invent them — tell the owner the data is missing and where to find it."
  );

  return parts.join("\n");
}

/**
 * One-call helper: load scoped snapshot (cached per business for the TTL
 * window) and render the prompt block.
 */
export async function buildBusinessContext(
  admin: SupabaseClient,
  businessId: string,
  scopes: AIContextScope[]
): Promise<string> {
  const key = snapshotCacheKey(businessId, scopes);
  const cached = snapshotCacheGet(key);
  if (cached) return renderSnapshot(cached);

  const snapshot = await loadBusinessSnapshot(admin, businessId, scopes);
  snapshotCacheSet(key, snapshot);
  return renderSnapshot(snapshot);
}
