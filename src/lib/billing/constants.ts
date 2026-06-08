import type { PlanConfig, PlanSlug } from "@/types/billing";

// ─── Pricing ────────────────────────────────────────────────────────────────

export const SMS_SENDER_ID_PRICE = 30_500; // KES, one-time

export const PLAN_CONFIGS: Record<Exclude<PlanSlug, "custom">, PlanConfig> = {
  sindano: {
    slug: "sindano",
    name: "Sindano",
    swahiliName: "The Needle",
    installationFee: 5_000,
    monthlyPrice: 690,
    color: "border-slate-200",
    accentColor: "text-slate-700",
    limits: {
      maxUsers: 1,
      maxCustomers: 100,
      maxOrdersPerMonth: 80,
      maxInventoryItems: 50,
      smsPerMonth: 50,
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
    installationFee: 28_000,
    monthlyPrice: 3_690,
    color: "border-emerald-400",
    accentColor: "text-emerald-700",
    limits: {
      maxUsers: 10,
      maxCustomers: null,
      maxOrdersPerMonth: null,
      maxInventoryItems: null,
      smsPerMonth: 700,
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
    installationFee: 43_990,
    monthlyPrice: 9_990,
    color: "border-amber-400",
    accentColor: "text-amber-700",
    limits: {
      maxUsers: null,
      maxCustomers: null,
      maxOrdersPerMonth: null,
      maxInventoryItems: null,
      smsPerMonth: null,
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

// ─── Billing rules ──────────────────────────────────────────────────────────

/** Days after installation fee payment before first recurring charge */
export const NEXT_BILLING_DAYS = 60;

/** Paystack Kenya local-card fee rate */
export const PAYSTACK_FEE_RATE = 0.015; // 1.5%

/** Paystack fee cap in KES */
export const PAYSTACK_FEE_CAP_KES = 2_000;

/** Subscription statuses that grant full dashboard access */
export const ACTIVE_SUBSCRIPTION_STATUSES: readonly string[] = ["active"] as const;

// ─── Helpers ────────────────────────────────────────────────────────────────

export function getPlanConfig(slug: PlanSlug): PlanConfig | null {
  if (slug === "custom") return null;
  return PLAN_CONFIGS[slug] ?? null;
}

export function isValidPlanSlug(value: unknown): value is Exclude<PlanSlug, "custom"> {
  return typeof value === "string" && Object.keys(PLAN_CONFIGS).includes(value);
}
