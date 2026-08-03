import type { PlanConfig, PlanSlug } from "@/types/billing";

// ─── Pricing ────────────────────────────────────────────────────────────────

export const SMS_SENDER_ID_PRICE = 30_500; // KES, one-time

export const PLAN_CONFIGS: Record<Exclude<PlanSlug, "custom">, PlanConfig> = {
  sindano: {
    slug: "sindano",
    name: "Sindano",
    swahiliName: "The Needle",
    monthlyPrice: 690,
    introPrice: 580,
    annualPrice: 6_900,
    color: "border-slate-200",
    accentColor: "text-slate-700",
    limits: {
      maxUsers: 1,
      maxCustomers: 500,
      maxOrdersPerMonth: 250,
      maxInventoryItems: 500,
      smsPerMonth: 75,
      maxBranches: 1,
      aiCreditsPerMonth: 100,
      storageGb: 2,
      globalSellListings: 30,
    },
    features: {
      analytics: false,
      financeFullDashboard: false,
      teamManagement: false,
      whatsappNotifications: false,
      multiLocation: false,
      apiAccess: false,
      aiAssistant: "limited",
      customSmsSenderId: false,
    },
  },
  fundi: {
    slug: "fundi",
    name: "Fundi",
    swahiliName: "The Craftsman",
    monthlyPrice: 3_399,
    introPrice: 2_850,
    annualPrice: 33_990,
    color: "border-emerald-400",
    accentColor: "text-emerald-700",
    limits: {
      maxUsers: 10,
      maxCustomers: 5_000,
      maxOrdersPerMonth: 2_000,
      maxInventoryItems: 5_000,
      smsPerMonth: 500,
      maxBranches: 5,
      aiCreditsPerMonth: 800,
      storageGb: 20,
      globalSellListings: 300,
    },
    features: {
      analytics: true,
      financeFullDashboard: true,
      teamManagement: true,
      whatsappNotifications: true,
      multiLocation: false,
      apiAccess: false,
      aiAssistant: "full",
      customSmsSenderId: false,
    },
  },
  dhahabu: {
    slug: "dhahabu",
    name: "Dhahabu",
    swahiliName: "Golden Standard",
    monthlyPrice: 8_999,
    introPrice: 7_550,
    annualPrice: 89_990,
    color: "border-amber-400",
    accentColor: "text-amber-700",
    limits: {
      maxUsers: 30,
      maxCustomers: 25_000,
      maxOrdersPerMonth: 10_000,
      maxInventoryItems: 20_000,
      smsPerMonth: 2_000,
      maxBranches: 15,
      aiCreditsPerMonth: 3_000,
      storageGb: 100,
      globalSellListings: 2_000,
    },
    features: {
      analytics: true,
      financeFullDashboard: true,
      teamManagement: true,
      whatsappNotifications: true,
      multiLocation: true,
      apiAccess: true,
      aiAssistant: "full",
      customSmsSenderId: true,
    },
  },
};

// ─── Free trial ───────────────────────────────────────────────────────────────

/** Length of the free trial, in days. "Get started for free" → 14 days. */
export const TRIAL_DAYS = 14;

/** Start nudging the owner when the trial has this many days (or fewer) left. */
export const TRIAL_REMINDER_DAYS = 5;

/**
 * Days remaining in a trial (rounded up). Returns null when there is no trial
 * deadline, and can be negative once the trial has lapsed.
 */
export function getTrialDaysLeft(trialEndsAt?: string | null): number | null {
  if (!trialEndsAt) return null;
  const diffMs = new Date(trialEndsAt).getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/** True when a trialing subscription's deadline has passed. */
export function isTrialExpired(trialEndsAt?: string | null): boolean {
  if (!trialEndsAt) return false;
  return new Date(trialEndsAt).getTime() <= Date.now();
}

// ─── Billing rules ──────────────────────────────────────────────────────────

/**
 * Length of one subscription billing period, in days. The first payment at
 * checkout covers the first month; subsequent renewals repeat every 30 days.
 */
export const BILLING_INTERVAL_DAYS = 30;

/** Paystack Kenya local-card fee rate */
export const PAYSTACK_FEE_RATE = 0.015; // 1.5%

/** Paystack fee cap in KES */
export const PAYSTACK_FEE_CAP_KES = 2_000;

/** Subscription statuses that grant full dashboard access */
export const ACTIVE_SUBSCRIPTION_STATUSES: readonly string[] = ["active"] as const;

// ─── Branch (outlet) limits ───────────────────────────────────────────────────
// Maximum branches per plan, INCLUDING the auto-created main branch.
// Must mirror business_branch_limit() in migration 00040 (the DB backstop).

export const PLAN_BRANCH_LIMITS: Record<Exclude<PlanSlug, "custom">, number> = {
  sindano: 1, // main outlet only — no extra branches
  fundi: 5,
  dhahabu: 15,
};

/**
 * Resolve how many branches a workspace may run from its active plan slug.
 * No / unknown subscription falls back to the Sindano limit (1); "custom"
 * (enterprise, arranged with sales) is unlimited.
 */
export function branchLimitForPlan(slug?: string | null): number {
  if (slug === "custom") return Number.POSITIVE_INFINITY;
  return PLAN_BRANCH_LIMITS[slug as Exclude<PlanSlug, "custom">] ?? PLAN_BRANCH_LIMITS.sindano;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function getPlanConfig(slug: PlanSlug): PlanConfig | null {
  if (slug === "custom") return null;
  return PLAN_CONFIGS[slug] ?? null;
}

export function isValidPlanSlug(value: unknown): value is Exclude<PlanSlug, "custom"> {
  return typeof value === "string" && Object.keys(PLAN_CONFIGS).includes(value);
}
