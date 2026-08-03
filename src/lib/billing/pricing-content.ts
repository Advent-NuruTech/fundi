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

export type PricingPlanId = "sindano" | "fundi" | "dhahabu";

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
  retail: {
    hero:
      "Three plans built around the way a shop actually grows — from a single duka to a multi-branch retail chain. Start simple, scale with confidence.",
    plans: {
      sindano: {
        tagline: "For individuals starting or formalising their business",
        description:
          "A complete, organised way to run your shop — from your first sale to a steady stream of repeat customers. Generous included capacity, nothing you don't need.",
      },
      fundi: {
        tagline: "Designed for growing shops with a team",
        description:
          "Everything you need to run a tight, profitable shop — team access, complete finance visibility and the analytics to grow with confidence.",
      },
      dhahabu: {
        tagline: "Built for established retailers and chains",
        description:
          "The complete FundiFlow experience — every branch, every team, every product and every shilling, managed from one command centre.",
      },
    },
  },
  wholesale: {
    hero:
      "Three plans built around the way a distribution business actually grows — from a single store to a regional supply network. Start simple, scale with confidence.",
    plans: {
      sindano: {
        tagline: "For individuals starting or formalising their business",
        description:
          "A complete, organised way to move stock — from your first order to a growing list of trusted clients. Generous included capacity, nothing you don't need.",
      },
      fundi: {
        tagline: "Designed for growing distributors with a team",
        description:
          "Everything you need to run a tight, profitable distribution business — team access, complete finance visibility and supplier tracking done right.",
      },
      dhahabu: {
        tagline: "Built for established wholesalers and distributors",
        description:
          "The complete FundiFlow experience — every branch, every team, every order and every shilling, managed from one command centre.",
      },
    },
  },
  hardware: {
    hero:
      "Three plans built around the way a hardware business actually grows — from a single shop to a multi-branch building-supply chain. Start simple, scale with confidence.",
    plans: {
      sindano: {
        tagline: "For individuals starting or formalising their business",
        description:
          "A complete, organised way to run your store — from your first sale to a dependable record of every shilling. Generous included capacity, nothing you don't need.",
      },
      fundi: {
        tagline: "Designed for growing hardware stores with a team",
        description:
          "Everything you need to run a tight, profitable store — team access, complete finance visibility and stock you can trust.",
      },
      dhahabu: {
        tagline: "Built for established hardware and building-supply chains",
        description:
          "The complete FundiFlow experience — every branch, every team, every SKU and every shilling, managed from one command centre.",
      },
    },
  },
  general: {
    hero:
      "Three plans built around the way a business actually grows — from a one-person operation to a multi-branch enterprise. Start simple, scale with confidence.",
    plans: {
      sindano: {
        tagline: "For individuals starting or formalising their business",
        description:
          "A complete, organised way to run your operation — from your first record to a dependable system you can build on. Generous included capacity, nothing you don't need.",
      },
      fundi: {
        tagline: "Designed for growing businesses with a team",
        description:
          "Everything you need to run a tight, profitable operation — team access, complete finance visibility and the analytics to grow with confidence.",
      },
      dhahabu: {
        tagline: "Built for established businesses and enterprises",
        description:
          "The complete FundiFlow experience — every branch, every team, every record and every shilling, managed from one command centre.",
      },
    },
  },
};

const nf = (value: number | null | undefined): string =>
  value == null ? "—" : value.toLocaleString("en-KE");

/** "1 location" / "Up to N locations" for a plan. */
export function branchLabelForPlan(id: PricingPlanId): string {
  const max = PLAN_CONFIGS[id].limits.maxBranches ?? 1;
  if (max <= 1) return "1 location";
  return `Up to ${max} locations`;
}

/** Build the included-capacity block for a plan from the canonical limits. */
function capacityForPlan(id: PricingPlanId): PlanCapacity {
  const l = PLAN_CONFIGS[id].limits;
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
export function getPlansForCategory(type: BusinessType): PricingPlan[] {
  const cfg = getBusinessTypeConfig(type);
  const t = cfg.terms;
  const copy = CATEGORY_COPY[type] ?? CATEGORY_COPY.general;
  const isTailoring = type === "tailoring";

  const lc = (s: string) => s.toLowerCase();

  const sindano: PricingFeature[] = [
    { text: `Manage up to 500 ${lc(t.customer)} records with confidence`, included: true },
    { text: `Track up to 250 ${lc(t.orders)} every month`, included: true },
    ...(isTailoring
      ? [
          { text: "Customer measurements & fitting notes", included: true },
          { text: "Essential production workflow tracking", included: true },
        ]
      : [
          { text: "Essential sales & stock tracking", included: true },
        ]),
    { text: `Track up to 500 ${lc(t.inventory)} items`, included: true },
    { text: "Payment recording — cash & M-Pesa", included: true },
    { text: "75 SMS every month, automatic", included: true },
    { text: "Customer Portal for your customers", included: true },
    { text: "100 AI Credits every month", included: true },
    { text: "Offline-first mobile dashboard (PWA)", included: true },
    { text: "Email support — answers within 48 hours", included: true },
  ];

  const fundi: PricingFeature[] = [
    { text: `Manage up to 5,000 ${lc(t.customer)} records`, included: true },
    { text: `Track up to 2,000 ${lc(t.orders)} every month`, included: true },
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
    { text: "500 SMS + WhatsApp notifications every month", included: true },
    { text: "800 AI Credits every month", included: true },
    { text: "Role-based team access (up to 10 users)", included: true },
    { text: "Analytics — trends & KPIs", included: true },
    { text: "Offline-first mobile dashboard (PWA)", included: true },
    { text: "Priority support — response within hours", included: true },
  ];

  const dhahabu: PricingFeature[] = [
    { text: `Manage up to 25,000 ${lc(t.customer)} records`, included: true },
    { text: `Track up to 10,000 ${lc(t.orders)} every month`, included: true },
    { text: "Everything in Fundi, fully unlocked", included: true },
    { text: "2,000 SMS + WhatsApp every month", included: true },
    { text: "3,000 AI Credits every month", included: true },
    { text: "Advanced analytics & profit forecasting", included: true },
    { text: "Up to 15 locations, fully synced", included: true },
    { text: "Up to 30 users with custom roles", included: true },
    { text: "Dedicated account manager", included: true },
    { text: "API access for custom integrations", included: true },
    { text: "Priority phone support", included: true },
  ];

  const featuresById: Record<PricingPlanId, PricingFeature[]> = { sindano, fundi, dhahabu };

  return (Object.keys(PLAN_BRAND) as PricingPlanId[]).map((id) => {
    const cfgPrice = PLAN_CONFIGS[id];
    return {
      ...PLAN_BRAND[id],
      tagline: copy.plans[id].tagline,
      description: copy.plans[id].description,
      introPrice: cfgPrice.introPrice,
      monthlyPrice: cfgPrice.monthlyPrice,
      annualPrice: cfgPrice.annualPrice,
      annualSavings: cfgPrice.monthlyPrice * 12 - cfgPrice.annualPrice,
      branchLabel: branchLabelForPlan(id),
      capacity: capacityForPlan(id),
      features: featuresById[id],
      cta: `Start free trial with ${PLAN_BRAND[id].name}`,
    };
  });
}

export function getHeroForCategory(type: BusinessType): string {
  return (CATEGORY_COPY[type] ?? CATEGORY_COPY.general).hero;
}
