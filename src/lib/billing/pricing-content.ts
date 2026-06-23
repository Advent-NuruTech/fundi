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

export interface PricingPlan {
  id: PricingPlanId;
  name: string;
  swahili: string;
  meaning: string;
  tagline: string;
  description: string;
  monthlyPrice: number;
  installationFee: number;
  /** e.g. "1 outlet", "Up to 4 branches". */
  branchLabel: string;
  highlight: boolean;
  badge?: string;
  color: string;
  accentColor: string;
  iconBg: string;
  features: PricingFeature[];
  cta: string;
}

// ── Constant brand identity (never changes per industry) ──────────────────────
const PLAN_BRAND: Record<PricingPlanId, Omit<PricingPlan,
  "tagline" | "description" | "features" | "monthlyPrice" | "installationFee" | "branchLabel" | "cta">> = {
  sindano: {
    id: "sindano",
    name: "Sindano",
    swahili: "سِنْدَانُو — The Needle",
    meaning: "Every great enterprise starts with a single, dependable tool.",
    highlight: false,
    color: "border-slate-200",
    accentColor: "text-slate-700",
    iconBg: "bg-slate-100",
  },
  fundi: {
    id: "fundi",
    name: "Fundi",
    swahili: "فُنْدِي — The Craftsman",
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
    swahili: "ذَهَب — Golden Standard",
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
    hero: "Three plans built for every stage of your tailoring business — from a solo needle to a full fashion house.",
    plans: {
      sindano: {
        tagline: "Perfect for solo tailors & small workshops",
        description:
          "Get your tailoring business organised and professional from day one — manage customers, track orders and never miss a measurement or payment.",
      },
      fundi: {
        tagline: "For growing workshops with a team",
        description:
          "Unlock the full power of FundiFlow — team management, complete finance visibility, analytics and multi-role access so you run a tight, profitable workshop.",
      },
      dhahabu: {
        tagline: "For established tailoring houses & enterprises",
        description:
          "The complete, unrestricted experience — purpose-built for high-volume fashion houses and multi-branch boutiques that demand the best.",
      },
    },
  },
  retail: {
    hero: "Three plans built for every stage of your shop — from a single duka to a multi-branch retail chain.",
    plans: {
      sindano: {
        tagline: "Perfect for a solo duka or kiosk",
        description:
          "Get your shop organised from day one — record sales, track stock and know exactly how much you made today, without complexity.",
      },
      fundi: {
        tagline: "For growing shops with a team",
        description:
          "Unlock the full power of FundiFlow — team management, complete finance visibility, analytics and multi-role access so you run a tight, profitable shop.",
      },
      dhahabu: {
        tagline: "For established retailers & chains",
        description:
          "The complete, unrestricted experience — purpose-built for high-volume retailers and multi-branch shops that demand the best.",
      },
    },
  },
  wholesale: {
    hero: "Three plans built for every stage of your distribution business — from a single store to a regional supply network.",
    plans: {
      sindano: {
        tagline: "Perfect for a small distributor",
        description:
          "Get your wholesale business organised — track bulk stock, client orders and credit without a single notebook.",
      },
      fundi: {
        tagline: "For growing distributors with a team",
        description:
          "Unlock the full power of FundiFlow — team management, complete finance visibility, analytics and supplier tracking so you move bulk stock profitably.",
      },
      dhahabu: {
        tagline: "For established wholesalers & distributors",
        description:
          "The complete, unrestricted experience — purpose-built for high-volume distributors and multi-branch supply networks that demand the best.",
      },
    },
  },
  hardware: {
    hero: "Three plans built for every stage of your hardware store — from a single shop to a multi-branch building-supply business.",
    plans: {
      sindano: {
        tagline: "Perfect for a single hardware shop",
        description:
          "Get your hardware shop organised — track thousands of SKUs, stop stock-outs on fast movers and account for every shilling.",
      },
      fundi: {
        tagline: "For growing hardware stores with a team",
        description:
          "Unlock the full power of FundiFlow — team management, complete finance visibility, analytics and supplier tracking so you run a tight, profitable store.",
      },
      dhahabu: {
        tagline: "For established hardware & building-supply chains",
        description:
          "The complete, unrestricted experience — purpose-built for high-volume hardware businesses and multi-branch outlets that demand the best.",
      },
    },
  },
  general: {
    hero: "Three plans built for every stage of your business — from a one-person operation to a multi-branch enterprise.",
    plans: {
      sindano: {
        tagline: "Perfect for a small or solo business",
        description:
          "Get your business organised from day one — manage customers, track work and money in one simple place built for SMEs.",
      },
      fundi: {
        tagline: "For growing businesses with a team",
        description:
          "Unlock the full power of FundiFlow — team management, complete finance visibility, analytics and multi-role access so you run a tight, profitable operation.",
      },
      dhahabu: {
        tagline: "For established businesses & enterprises",
        description:
          "The complete, unrestricted experience — purpose-built for high-volume operations and multi-branch enterprises that demand the best.",
      },
    },
  },
};

/** "1 outlet" / "Up to 4 branches" / "Up to 9 branches" for a plan. */
export function branchLabelForPlan(id: PricingPlanId): string {
  const max = PLAN_CONFIGS[id].limits.maxBranches ?? 1;
  if (max <= 1) return "1 outlet (single branch)";
  return `Up to ${max} branches`;
}

/** Build the three display plans for a chosen industry. */
export function getPlansForCategory(type: BusinessType): PricingPlan[] {
  const cfg = getBusinessTypeConfig(type);
  const t = cfg.terms;
  const copy = CATEGORY_COPY[type] ?? CATEGORY_COPY.general;
  const isTailoring = type === "tailoring";

  const lc = (s: string) => s.toLowerCase();

  const sindano: PricingFeature[] = [
    { text: "1 user account (owner only)", included: true },
    { text: `Up to 100 ${lc(t.customer)} records`, included: true },
    { text: `Up to 80 ${lc(t.orders)} per month`, included: true },
    ...(isTailoring
      ? [
          { text: "Customer measurements & fitting notes", included: true },
          { text: "Basic production workflow tracking", included: true },
        ]
      : []),
    { text: `Basic ${lc(t.inventory)} tracking (up to 50 items)`, included: true },
    { text: "Payment recording (Cash & M-Pesa)", included: true },
    { text: "SMS notifications — 50 per month", included: true },
    { text: branchLabelForPlan("sindano"), included: true },
    { text: "Mobile-optimised dashboard (PWA)", included: true },
    { text: "Offline mode — works without internet", included: true },
    { text: "Email support (48 hr response)", included: true },
    { text: "Full finance dashboard", included: false },
    { text: "Team & role management", included: false },
    { text: "WhatsApp notifications", included: false },
    { text: "Analytics & business reports", included: false },
    { text: "AI Assistant — limited access", included: true },
  ];

  const fundi: PricingFeature[] = [
    { text: "Up to 10 user accounts", included: true },
    { text: `Unlimited ${lc(t.customer)} records`, included: true },
    { text: `Unlimited ${lc(t.orders)}`, included: true },
    ...(isTailoring
      ? [
          { text: "Full measurements, fittings & style records", included: true },
          { text: "Full production workflow (6 stages)", included: true },
        ]
      : []),
    { text: `Full ${lc(t.inventory)} + purchase orders + ${lc(t.suppliers)}`, included: true },
    { text: "Complete finance dashboard", included: true, note: "Owner-controlled visibility" },
    { text: "Expenses, withdrawals, savings & investments", included: true },
    { text: "Weekly, monthly & yearly finance reports", included: true },
    { text: "Payment recording (Cash, M-Pesa, POS)", included: true },
    { text: "SMS notifications — 700 per month", included: true },
    { text: "WhatsApp order notifications", included: true },
    { text: "Analytics — sales trends, top items, KPIs", included: true },
    { text: "Role-based team management (6 roles)", included: true },
    { text: branchLabelForPlan("fundi"), included: true },
    { text: "Offline mode — works without internet", included: true },
    { text: "Priority support (12 hr response)", included: true },
    { text: "AI Assistant", included: true },
  ];

  const dhahabu: PricingFeature[] = [
    { text: "Unlimited user accounts", included: true },
    { text: "Everything in Fundi, fully unlocked", included: true },
    { text: "AI Assistant — full access", included: true },
    { text: "Deep AI business insights & forecasting", included: true },
    { text: "Custom SMS Sender ID (your brand name)", included: true, note: "additional cost" },
    { text: "Unlimited SMS notifications", included: true },
    { text: "Advanced analytics & profit forecasting", included: true },
    { text: branchLabelForPlan("dhahabu"), included: true },
    { text: "Dedicated account manager", included: true },
    { text: "On-site training & onboarding (Nairobi)", included: true },
    { text: "SLA: 99.9% uptime guarantee", included: true },
    { text: "Priority phone support (2 hr response)", included: true },
    { text: "API access for custom integrations", included: true },
    { text: "White-label option (your own branding)", included: true },
    { text: "Quarterly business review sessions", included: true },
  ];

  const featuresById: Record<PricingPlanId, PricingFeature[]> = { sindano, fundi, dhahabu };

  return (Object.keys(PLAN_BRAND) as PricingPlanId[]).map((id) => ({
    ...PLAN_BRAND[id],
    tagline: copy.plans[id].tagline,
    description: copy.plans[id].description,
    monthlyPrice: PLAN_CONFIGS[id].monthlyPrice,
    installationFee: PLAN_CONFIGS[id].installationFee,
    branchLabel: branchLabelForPlan(id),
    features: featuresById[id],
    cta: `Start with ${PLAN_BRAND[id].name}`,
  }));
}

export function getHeroForCategory(type: BusinessType): string {
  return (CATEGORY_COPY[type] ?? CATEGORY_COPY.general).hero;
}
