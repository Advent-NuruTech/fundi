import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AIAnalytics,
  AIAnalyticsBucket,
  AIAnalyticsDailyPoint,
  AIAnalyticsSummary,
} from "@/types/ai-billing";
import { portfolioMargin } from "./formulas";
import { getActiveAIConfig } from "./config-store";
import { getMostExpensiveRequests } from "./records";

const MARGIN_ALERT_ACTION = "ai_margin_below_target";
const MARGIN_ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

function toBuckets(rows: unknown): AIAnalyticsBucket[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      key: String(row.key ?? "unknown"),
      count: Number(row.count ?? 0),
      totalCost: Number(row.totalCost ?? 0),
      totalRevenue: Number(row.totalRevenue ?? 0),
      totalCredits: Number(row.totalCredits ?? 0),
    };
  });
}

function toDaily(rows: unknown): AIAnalyticsDailyPoint[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      date: String(row.date ?? ""),
      cost: Number(row.cost ?? 0),
      revenue: Number(row.revenue ?? 0),
      requests: Number(row.requests ?? 0),
    };
  });
}

function orderBuckets(list: AIAnalyticsBucket[], keys: string[]): AIAnalyticsBucket[] {
  const order = new Map(keys.map((k, i) => [k, i]));
  return [...list].sort((a, b) => {
    const ia = order.get(a.key) ?? Number.MAX_SAFE_INTEGER;
    const ib = order.get(b.key) ?? Number.MAX_SAFE_INTEGER;
    return ia - ib;
  });
}

export async function getAIAnalytics(
  db: SupabaseClient,
  days = 30
): Promise<AIAnalytics> {
  const [{ data, error }, config] = await Promise.all([
    db.rpc("ai_billing_analytics", { p_days: days }),
    getActiveAIConfig(db),
  ]);
  if (error) throw new Error(`Could not compute AI analytics: ${error.message}`);

  const raw = (data ?? {}) as Record<string, unknown>;
  const rawSummary = (raw.summary ?? {}) as Record<string, unknown>;
  const targetMarginPercent = config.config.margin.targetGrossMarginPercent;

  const totalCostKes = Number(rawSummary.totalCostKes ?? 0);
  const totalRevenue = Number(rawSummary.totalRevenue ?? 0);
  const grossMarginPercent = portfolioMargin(totalRevenue, totalCostKes);
  const belowTargetMargin =
    totalCostKes > 0 && grossMarginPercent < targetMarginPercent;

  const summary: AIAnalyticsSummary = {
    requestCount: Number(rawSummary.requestCount ?? 0),
    totalProviderCost: Number(rawSummary.totalProviderCost ?? 0),
    totalRevenue,
    grossMarginPercent,
    averageCredits: Number(rawSummary.averageCredits ?? 0),
    averageProviderCost: Number(rawSummary.averageProviderCost ?? 0),
    averageRevenue: Number(rawSummary.averageRevenue ?? 0),
    portfolioMarginPercent: grossMarginPercent,
    belowTargetMargin,
    targetMarginPercent,
  };

  const byFeature = toBuckets(raw.byFeature);
  const byProvider = toBuckets(raw.byProvider);
  const byModel = toBuckets(raw.byModel);
  const byCategory = toBuckets(raw.byCategory);

  return {
    summary,
    byFeature,
    byProvider,
    byModel,
    byCategory,
    topFeatures: [...byFeature].sort((a, b) => b.totalCost - a.totalCost).slice(0, 5),
    mostExpensiveRequests: await getMostExpensiveRequests(db),
    daily: toDaily(raw.daily),
    monthly: toDaily(raw.monthly),
    timeRange: { start: "", end: "" },
  };
}

/**
 * Portfolio margin verification. The system NEVER chases a per-request margin —
 * it measures margin across ALL AI usage. When the portfolio margin falls below
 * the configured target, an admin alert is raised (at most once per 24h to
 * avoid noise). See src/lib/ai-billing/formulas.ts → portfolioMargin().
 */
export async function raiseMarginAlertIfNeeded(
  db: SupabaseClient,
  input: { grossMarginPercent: number; targetMarginPercent: number; adminUid?: string | null }
): Promise<void> {
  if (input.targetMarginPercent <= 0) return;
  const below = input.grossMarginPercent < input.targetMarginPercent;
  if (!below) return;

  const cutoff = new Date(Date.now() - MARGIN_ALERT_COOLDOWN_MS).toISOString();
  const { data: recent } = await db
    .from("admin_audit_logs")
    .select("id")
    .eq("action", MARGIN_ALERT_ACTION)
    .gte("created_at", cutoff)
    .limit(1);

  if (recent && recent.length > 0) return;

  await db.from("admin_audit_logs").insert({
    admin_uid: input.adminUid ?? null,
    admin_email: null,
    action: MARGIN_ALERT_ACTION,
    resource_type: "ai_billing",
    resource_name: "portfolio_margin",
    metadata: {
      gross_margin_percent: input.grossMarginPercent,
      target_margin_percent: input.targetMarginPercent,
    },
    severity: "warning",
  });
}

export { orderBuckets };
