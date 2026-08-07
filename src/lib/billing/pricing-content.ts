/**
 * Per-category pricing content.
 *
 * FundiFlow sells the SAME three plans (Sindano / Fundi / Dhahabu) at the SAME
 * prices to every industry. What changes per category is the *wording*: a duka
 * owner should read "sales" and "products", a tailor "orders" and "garments".
 *
 * This module turns the industry preset (`src/lib/business-types.ts` terms) +
 * the canonical prices/limits (`src/lib/billing/constants.ts`) into ready-to-
 * render plan cards. Prices, branch limits and the plan brand identity stay
 * constant; only the human copy is re-skinned. Plain data (no JSX) so it can be
 * imported by the client pricing component without pulling in React.
 */

import { getBusinessTypeConfig, type BusinessType } from "@/lib/business-types";
import { PLAN_CONFIGS } from "@/lib/billing/constants";
import type { PlanConfig } from "@/types/billing";

export type PricingPlanId = "sindano" | "fundi" | "dhahabu";

/** Optional live configs (defaults + admin overrides) for building plan cards. */
type PlanConfigsMap = Record<PricingPlanId, PlanConfig>;

function resolveConfigs(configs?: Partial<PlanConfigsMap>): PlanConfigsMap {
  return {
    sindano: configs?.sindano ?? PLAN_CONFIGS.sindano,
    fundi: configs?.fundi ?? PLAN_CONFIGS.fundi,
    dhahabu: configs?.dhahabu ?? PLAN_CONFIGS.dhahabu,
  };
}

export interface PricingFeature {
  text: string;
  included: boolean;
  note?: string;
}

/** Human-readable included capacity per plan (framed as value, not limits). */
export interface PlanCapacity {
  customers: string;
  ordersPerMonth: string;
  users: string;
  branches: string;
  inventoryItems: string;
  sms: string;
  aiCredits: string;
  storage: string;
  listings: string;
}

export interface PricingPlan {
  id: PricingPlanId;
  name: string;
  swahili: string;
  meaning: string;
  tagline: string;
  description: string;
  /** Introductory launch price — first 2 months (KES/month). */
  introPrice: number;
  /** Standard monthly price (KES/month). */
  monthlyPrice: number;
  /** Annual price = 10 months of the standard monthly rate (KES/year). */
  annualPrice: number;
  /** Two free months, in KES. */
  annualSavings: number;
  /** e.g. "1 location", "Up to 5 locations". */
  branchLabel: string;
  highlight: boolean;
  badge?: string;
  color: string;
  accentColor: string;
  iconBg: string;
  capacity: PlanCapacity;
  features: PricingFeature[];
  cta: string;
}

// ── Constant brand identity (never changes per industry) ──────────────────────
const PLAN_BRAND: Record<PricingPlanId, Omit<PricingPlan,
  "tagline" | "description" | "features" | "introPrice" | "monthlyPrice" | "annualPrice" | "annualSavings" | "branchLabel" | "capacity" | "cta">> = {
  sindano: {
    id: "sindano",
    name: "Sindano",
    swahili: "Sindano — The Needle",
    meaning: "Every great enterprise starts with a single, dependable tool.",
    highlight: false,
    color: "border-slate-200",
    accentColor: "text-slate-700",
    iconBg: "bg-slate-100",
  },
  fundi: {
    id: "fundi",
    name: "Fundi",
    swahili: "Fundi — The Craftsman",
    meaning: "The expert who builds something lasting.",
    highlight: true,
    badge: "Most Popular",
    color: "border-emerald-400",
    accentColor: "text-emerald-700",
    iconBg: "bg-emerald-100",
  },
  dhahabu: {
    id: "dhahabu",
    name: "Dhahabu",
    swahili: "Dhahabu — The Gold Standard",
    meaning: "The pinnacle of craft. The measure of excellence.",
    highlight: false,
    color: "border-amber-400",
    accentColor: "text-amber-700",
    iconBg: "bg-amber-100",
  },
};

// ── Per-category hero + plan taglines/descriptions ────────────────────────────
interface CategoryCopy {
  hero: string;
  plans: Record<PricingPlanId, { tagline: string; description: string }>;
}

const CATEGORY_COPY: Record<BusinessType, CategoryCopy> = {
  tailoring: {
    hero:
      "Three plans built around the way a tailoring business actually grows — from your first needle to a full fashion house. Start simple, scale with confidence, and never outgrow your tools.",
    plans: {
      sindano: {
        tagline: "For individuals starting or formalising their business",
        description:
          "A complete, organised way to run your work — from your first customer record to your hundredth repeat order. Generous included capacity, and nothing you don't need.",
      },
      fundi: {
        tagline: "Designed for growing tailoring businesses with a team",
        description:
          "Everything you need to run a tight, profitable workshop — team access, complete finance visibility and the analytics to grow with confidence.",
      },
      dhahabu: {
        tagline: "Built for established fashion businesses at scale",
        description:
          "The complete FundiFlow experience — every branch, every team, every garment and every shilling, managed from one command centre.",
      },
    },
  },
};

const nf = (value: number | null | undefined): string =>
  value == null ? "—" : value.toLocaleString("en-KE");

/** "1 location" / "Up to N locations" for a plan. */
export function branchLabelForPlan(
  id: PricingPlanId,
  configs?: Partial<PlanConfigsMap>
): string {
  const max = resolveConfigs(configs)[id].limits.maxBranches ?? 1;
  if (max <= 1) return "1 location";
  return `Up to ${max} locations`;
}

/** Build the included-capacity block for a plan from the canonical limits. */
function capacityForPlan(id: PricingPlanId, configs?: Partial<PlanConfigsMap>): PlanCapacity {
  const l = resolveConfigs(configs)[id].limits;
  return {
    customers: nf(l.maxCustomers),
    ordersPerMonth: nf(l.maxOrdersPerMonth),
    users: nf(l.maxUsers),
    branches: nf(l.maxBranches),
    inventoryItems: nf(l.maxInventoryItems),
    sms: nf(l.smsPerMonth),
    aiCredits: nf(l.aiCreditsPerMonth),
    storage: l.storageGb == null ? "—" : `${l.storageGb} GB`,
    listings: nf(l.globalSellListings),
  };
}

/** Build the three display plans for a chosen industry. */
export function getPlansForCategory(
  type: BusinessType,
  configs?: Partial<PlanConfigsMap>
): PricingPlan[] {
  const live = resolveConfigs(configs);
  const cfg = getBusinessTypeConfig(type);
  const t = cfg.terms;
  const copy = CATEGORY_COPY[type];
  const isTailoring = type === "tailoring";

  const lc = (s: string) => s.toLowerCase();
  const sindanoL = live.sindano.limits;
  const fundiL = live.fundi.limits;
  const dhahabuL = live.dhahabu.limits;

  const sindano: PricingFeature[] = [
    { text: `Manage up to ${nf(sindanoL.maxCustomers)} ${lc(t.customer)} records with confidence`, included: true },
    { text: `Track up to ${nf(sindanoL.maxOrdersPerMonth)} ${lc(t.orders)} every month`, included: true },
    ...(isTailoring
      ? [
          { text: "Customer measurements & fitting notes", included: true },
          { text: "Essential production workflow tracking", included: true },
        ]
      : [
          { text: "Essential sales & stock tracking", included: true },
        ]),
    { text: `Track up to ${nf(sindanoL.maxInventoryItems)} ${lc(t.inventory)} items`, included: true },
    { text: "Payment recording — cash & M-Pesa", included: true },
    { text: `${nf(sindanoL.smsPerMonth)} SMS every month, automatic`, included: true },
    { text: "Customer Portal for your customers", included: true },
    { text: `${nf(sindanoL.aiCreditsPerMonth)} AI Credits every month`, included: true },
    { text: "Offline-first mobile dashboard (PWA)", included: true },
    { text: "Email support — answers within 48 hours", included: true },
  ];

  const fundi: PricingFeature[] = [
    { text: `Manage up to ${nf(fundiL.maxCustomers)} ${lc(t.customer)} records`, included: true },
    { text: `Track up to ${nf(fundiL.maxOrdersPerMonth)} ${lc(t.orders)} every month`, included: true },
    ...(isTailoring
      ? [
          { text: "Full measurements, fittings & style records", included: true },
          { text: "Full production workflow (6 stages)", included: true },
        ]
      : [
          { text: "Full sales, orders & returns workflow", included: true },
        ]),
    { text: `Complete ${lc(t.inventory)} + purchase orders + ${lc(t.suppliers)}`, included: true },
    { text: "Full finance dashboard & reports", included: true },
    { text: `${nf(fundiL.smsPerMonth)} SMS + WhatsApp notifications every month`, included: true },
    { text: `${nf(fundiL.aiCreditsPerMonth)} AI Credits every month`, included: true },
    { text: `Role-based team access (up to ${nf(fundiL.maxUsers)} users)`, included: true },
    { text: "Analytics — trends & KPIs", included: true },
    { text: "Offline-first mobile dashboard (PWA)", included: true },
    { text: "Priority support — response within hours", included: true },
  ];

  const dhahabu: PricingFeature[] = [
    { text: `Manage up to ${nf(dhahabuL.maxCustomers)} ${lc(t.customer)} records`, included: true },
    { text: `Track up to ${nf(dhahabuL.maxOrdersPerMonth)} ${lc(t.orders)} every month`, included: true },
    { text: "Everything in Fundi, fully unlocked", included: true },
    { text: `${nf(dhahabuL.smsPerMonth)} SMS + WhatsApp every month`, included: true },
    { text: `${nf(dhahabuL.aiCreditsPerMonth)} AI Credits every month`, included: true },
    { text: "Advanced analytics & profit forecasting", included: true },
    { text: `Up to ${nf(dhahabuL.maxBranches)} locations, fully synced`, included: true },
    { text: `Up to ${nf(dhahabuL.maxUsers)} users with custom roles`, included: true },
    { text: "Dedicated account manager", included: true },
    { text: "API access for custom integrations", included: true },
    { text: "Priority phone support", included: true },
  ];

  const featuresById: Record<PricingPlanId, PricingFeature[]> = { sindano, fundi, dhahabu };

  return (Object.keys(PLAN_BRAND) as PricingPlanId[]).map((id) => {
    const cfgPrice = live[id];
    return {
      ...PLAN_BRAND[id],
      tagline: copy.plans[id].tagline,
      description: copy.plans[id].description,
      introPrice: cfgPrice.introPrice,
      monthlyPrice: cfgPrice.monthlyPrice,
      annualPrice: cfgPrice.annualPrice,
      annualSavings: cfgPrice.monthlyPrice * 12 - cfgPrice.annualPrice,
      branchLabel: branchLabelForPlan(id, live),
      capacity: capacityForPlan(id, live),
      features: featuresById[id],
      cta: `Start free trial with ${PLAN_BRAND[id].name}`,
    };
  });
}

export function getHeroForCategory(type: BusinessType): string {
  return CATEGORY_COPY[type].hero;
}
