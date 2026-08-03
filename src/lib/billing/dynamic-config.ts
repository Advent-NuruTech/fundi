/**
 * Server-side dynamic billing configuration.
 *
 * Plan prices/capacity and the Custom SMS Sender ID fee are no longer only
 * hard-coded in `src/lib/billing/constants.ts`. Platform admins can override
 * them at runtime via `/api/ffmanage/pricing` (stored in the service_role-only
 * `billing_plan_configs` table and the `system_config` key
 * `sms_sender_id_price` — see migration 00041).
 *
 * These helpers merge the baked-in defaults with any DB overrides so the whole
 * system (checkout, renewals, upgrades, the billing portal, the pricing page,
 * branch limits) reflects admin edits without a code change.
 *
 * SERVER-ONLY — never import from client components.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceSupabaseClient } from "@/lib/supabase";
import {
  PLAN_CONFIGS,
  SMS_SENDER_ID_PRICE as DEFAULT_SMS_SENDER_ID_PRICE,
} from "@/lib/billing/constants";
import type { PlanConfig, PlanSlug } from "@/types/billing";

/** The editable slice of a plan an admin can override. */
export interface PlanPricingOverride {
  monthlyPrice: number;
  introPrice: number;
  annualPrice: number;
  limits: {
    maxUsers: number;
    maxCustomers: number;
    maxOrdersPerMonth: number;
    maxInventoryItems: number;
    smsPerMonth: number;
    maxBranches: number;
    aiCreditsPerMonth: number;
    storageGb: number;
    globalSellListings: number;
  };
}

export type StandardPlanSlug = Exclude<PlanSlug, "custom">;
export type PlanConfigsMap = Record<StandardPlanSlug, PlanConfig>;

export const SMS_SENDER_ID_PRICE_KEY = "sms_sender_id_price";

const STANDARD_PLAN_SLUGS = Object.keys(PLAN_CONFIGS) as StandardPlanSlug[];

interface PlanConfigRow {
  plan_slug: StandardPlanSlug;
  config: Partial<PlanPricingOverride>;
  updated_at: string;
  updated_by: string | null;
}

function resolveDb(db?: SupabaseClient): SupabaseClient {
  return db ?? createServiceSupabaseClient();
}

/** Read all per-plan override rows. Returns an empty array when none exist. */
export async function getPlanConfigOverrideRows(
  db?: SupabaseClient
): Promise<PlanConfigRow[]> {
  const client = resolveDb(db);
  const { data, error } = await client
    .from("billing_plan_configs")
    .select("plan_slug, config, updated_at, updated_by");

  if (error) {
    console.error("[dynamic-config] Failed to read plan overrides", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    plan_slug: row.plan_slug as StandardPlanSlug,
    config: (row.config ?? {}) as Partial<PlanPricingOverride>,
    updated_at: row.updated_at,
    updated_by: row.updated_by as string | null,
  }));
}

/** Merge one plan's defaults with its DB override (deep-merge limits). */
function mergePlanConfig(
  slug: StandardPlanSlug,
  overrides: Record<string, Partial<PlanPricingOverride>>
): PlanConfig {
  const base = PLAN_CONFIGS[slug];
  const over = overrides[slug];
  if (!over) return base;

  return {
    ...base,
    ...(over.monthlyPrice != null ? { monthlyPrice: over.monthlyPrice } : {}),
    ...(over.introPrice != null ? { introPrice: over.introPrice } : {}),
    ...(over.annualPrice != null ? { annualPrice: over.annualPrice } : {}),
    limits: {
      ...base.limits,
      ...(over.limits ?? {}),
    },
  };
}

/** Full merged plan configs for all three standard plans. */
export async function getEffectivePlanConfigs(
  db?: SupabaseClient
): Promise<PlanConfigsMap> {
  const rows = await getPlanConfigOverrideRows(db);
  const overrides: Record<string, Partial<PlanPricingOverride>> = {};
  for (const row of rows) overrides[row.plan_slug] = row.config;

  const result = {} as PlanConfigsMap;
  for (const slug of STANDARD_PLAN_SLUGS) {
    result[slug] = mergePlanConfig(slug, overrides);
  }
  return result;
}

/** Single merged plan config, or null for an unknown / "custom" slug. */
export async function getEffectivePlanConfig(
  slug: PlanSlug,
  db?: SupabaseClient
): Promise<PlanConfig | null> {
  if (slug === "custom" || !PLAN_CONFIGS[slug as StandardPlanSlug]) return null;
  const configs = await getEffectivePlanConfigs(db);
  return configs[slug as StandardPlanSlug] ?? null;
}

/** The platform-wide Custom SMS Sender ID fee (KES). Defaults to 30,500. */
export async function getSmsSenderIdPrice(db?: SupabaseClient): Promise<number> {
  const client = resolveDb(db);
  const { data, error } = await client
    .from("system_config")
    .select("value")
    .eq("key", SMS_SENDER_ID_PRICE_KEY)
    .maybeSingle();

  if (!error && data && typeof data.value === "number") {
    return data.value;
  }
  return DEFAULT_SMS_SENDER_ID_PRICE;
}

/** Max branches allowed by a plan slug (async, DB-aware). Infinity for custom. */
export async function getBranchLimitForPlan(
  slug?: string | null,
  db?: SupabaseClient
): Promise<number> {
  if (slug === "custom") return Number.POSITIVE_INFINITY;
  const configs = await getEffectivePlanConfigs(db);
  const plan = configs[slug as StandardPlanSlug];
  if (!plan) return configs.sindano.limits.maxBranches ?? 1;
  return plan.limits.maxBranches ?? 1;
}

/** Branch limits for all standard plans keyed by slug. */
export async function getBranchLimits(
  db?: SupabaseClient
): Promise<Record<StandardPlanSlug, number>> {
  const configs = await getEffectivePlanConfigs(db);
  const limits = {} as Record<StandardPlanSlug, number>;
  for (const slug of STANDARD_PLAN_SLUGS) {
    limits[slug] = configs[slug].limits.maxBranches ?? 1;
  }
  return limits;
}
