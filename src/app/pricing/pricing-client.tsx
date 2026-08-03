"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  ArrowRight,
  MessageCircle,
  Sparkles,
  BadgeCheck,
  ShieldCheck,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/components/auth-context";
import {
  BUSINESS_TYPES,
  DEFAULT_BUSINESS_TYPE,
  isBusinessType,
  type BusinessType,
} from "@/lib/business-types";
import { getPlansForCategory, getHeroForCategory, type PricingPlan } from "@/lib/billing/pricing-content";
import { formatKes } from "@/lib/billing/fees";

const SALES_URL =
  "https://wa.me/254142225233?text=Hi%2C%20I%27d%20like%20a%20custom%20FundiFlow%20plan%20with%20more%20capacity";

const DEMO_URL =
  "https://wa.me/254142225233?text=Hi%2C%20I%27d%20like%20to%20request%20a%20demo%20of%20FundiFlow";

type BillingCycle = "monthly" | "annual";

const CAPACITY_TILES: { key: keyof PricingPlan["capacity"]; label: string }[] = [
  { key: "customers", label: "Customer records" },
  { key: "ordersPerMonth", label: "Orders / month" },
  { key: "users", label: "Team members" },
  { key: "branches", label: "Locations" },
  { key: "sms", label: "SMS / month" },
  { key: "aiCredits", label: "AI Credits" },
];

export function PricingClient({ freeTrialEnabled }: { freeTrialEnabled: boolean }) {
  const searchParams = useSearchParams();
  const initial = searchParams.get("category");
  const [category, setCategory] = useState<BusinessType>(
    isBusinessType(initial) ? initial : DEFAULT_BUSINESS_TYPE,
  );
  const [billing, setBilling] = useState<BillingCycle>("monthly");
  const { user } = useAuth();

  const plans = useMemo(() => getPlansForCategory(category), [category]);
  const hero = getHeroForCategory(category);

  const comparisonRows = useMemo(
    () => [
      {
        feature: "Introductory price",
        values: plans.map((p) => `${formatKes(p.introPrice)}/mo`),
      },
      {
        feature: "Standard price",
        values: plans.map((p) => `${formatKes(p.monthlyPrice)}/mo`),
      },
      {
        feature: "Customer records",
        values: plans.map((p) => p.capacity.customers),
      },
      {
        feature: "Orders per month",
        values: plans.map((p) => p.capacity.ordersPerMonth),
      },
      {
        feature: "Team members",
        values: plans.map((p) => p.capacity.users),
      },
      {
        feature: "Locations / branches",
        values: plans.map((p) => p.capacity.branches),
      },
      {
        feature: "Inventory items",
        values: plans.map((p) => p.capacity.inventoryItems),
      },
      {
        feature: "SMS included",
        values: plans.map((p) => p.capacity.sms),
      },
      {
        feature: "WhatsApp notifications",
        values: plans.map((p) => (p.id === "sindano" ? "—" : "✓")),
      },
      {
        feature: "AI Credits included",
        values: plans.map((p) => p.capacity.aiCredits),
      },
      {
        feature: "File storage",
        values: plans.map((p) => p.capacity.storage),
      },
      {
        feature: "Global Sell listings",
        values: plans.map((p) => p.capacity.listings),
      },
      {
        feature: "Customer Portal",
        values: plans.map(() => "✓"),
      },
      {
        feature: "Offline mode",
        values: plans.map(() => "✓"),
      },
      {
        feature: "Reports & analytics",
        values: ["Essential", "Full", "Advanced + forecasting"],
      },
      {
        feature: "AI Assistant",
        values: ["Essential", "Full", "Full + deep insights"],
      },
      {
        feature: "Support",
        values: ["Email", "Priority", "Dedicated manager"],
      },
    ],
    [plans],
  );

  return (
    <>
      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-24">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-semibold text-emerald-300">
            <Sparkles className="h-4 w-4" />
            Transparent Pricing
          </span>
          <h1 className="mb-5 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
            Pricing that scales with{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              your craft
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-slate-300">{hero}</p>

          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400"
            >
              Start free trial
              <ArrowRight className="h-5 w-5" />
            </Link>
            <a
              href={DEMO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-7 py-3.5 text-base font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20"
            >
              <MessageCircle className="h-5 w-5" />
              Request a demo
            </a>
          </div>
          <p className="mt-5 flex items-center justify-center gap-2 text-sm text-slate-400">
            <BadgeCheck className="h-4 w-4 text-emerald-400" />
            14-day free trial · No card required · Cancel anytime
          </p>

          {/* Category picker */}
          <div className="mt-10">
            <p className="mb-3 text-sm font-medium text-slate-400">
              Choose your kind of business to see tailored pricing:
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {BUSINESS_TYPES.map((bt) => {
                const active = bt.id === category;
                return (
                  <button
                    key={bt.id}
                    type="button"
                    onClick={() => setCategory(bt.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition",
                      active
                        ? "border-emerald-400 bg-emerald-500/20 text-white"
                        : "border-white/15 bg-white/5 text-slate-300 hover:border-emerald-400/50 hover:text-white",
                    )}
                  >
                    <span className="text-base leading-none">{bt.emoji}</span>
                    {bt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── INTRODUCTORY LAUNCH OFFER ── */}
      <section className="border-b border-amber-200 bg-gradient-to-r from-amber-50 via-emerald-50 to-amber-50 py-14">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-300/60 bg-amber-100/80 px-4 py-1.5 text-sm font-bold uppercase tracking-wide text-amber-800">
            <Sparkles className="h-4 w-4" />
            Introductory Launch Offer
          </span>
          <h2 className="mb-3 text-3xl font-black text-slate-900 sm:text-4xl">
            Welcome to FundiFlow.{" "}
            <span className="text-emerald-700">Your first two months, at our best price.</span>
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-slate-600">
            For a limited time, every plan starts at a special introductory rate for your{" "}
            <strong className="text-slate-900">first two months</strong> — then continues
            automatically at the standard rate. Two full months to run your business on
            FundiFlow, at our lowest prices ever.
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm"
              >
                <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
                  {plan.name}
                </p>
                <p className="mt-2 text-3xl font-black text-slate-900">
                  <span className="text-sm font-medium text-slate-500">KES </span>
                  {plan.introPrice.toLocaleString("en-KE")}
                  <span className="text-sm font-medium text-slate-400">/month</span>
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  First 2 months ·{" "}
                  <span className="font-semibold text-slate-700">
                    then {formatKes(plan.monthlyPrice)}/mo
                  </span>
                </p>
                <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                  You save {formatKes(plan.monthlyPrice - plan.introPrice)}/month
                </p>
              </div>
            ))}
          </div>

          <p className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-amber-700">
            <ShieldCheck className="h-4 w-4" />
            Limited time only — it starts when you do, and rolls into your standard rate
            automatically. No fine print.
          </p>
        </div>
      </section>

      {/* ── BILLING TOGGLE + PLAN CARDS ── */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-black text-slate-900 sm:text-4xl">
              Choose the plan that fits the stage you&apos;re at
            </h2>
            <p className="mx-auto max-w-xl text-slate-500">
              Every plan includes the complete FundiFlow operating system — with capacity
              designed around real business growth, not arbitrary restrictions.
            </p>

            {/* Billing toggle */}
            <div className="mt-8 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 p-1.5">
              <button
                type="button"
                onClick={() => setBilling("monthly")}
                className={cn(
                  "rounded-full px-5 py-2 text-sm font-bold transition-all",
                  billing === "monthly"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800",
                )}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBilling("annual")}
                className={cn(
                  "flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold transition-all",
                  billing === "annual"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800",
                )}
              >
                Annual
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                  2 months free
                </span>
              </button>
            </div>
            <p className="mt-3 text-sm text-slate-500">
              {billing === "annual"
                ? "Pay for 10 months, get 12 — two free months on every plan."
                : "Simple monthly billing. Switch to annual anytime for two free months."}
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                billing={billing}
                category={category}
                user={Boolean(user)}
                freeTrialEnabled={freeTrialEnabled}
              />
            ))}
          </div>

          {/* ── CUSTOM / CONTACT SALES ── */}
          <div className="mt-10 rounded-3xl border border-slate-200 bg-slate-50 p-8">
            <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  Need more than our largest plan?
                </h3>
                <p className="mt-1 max-w-xl text-sm text-slate-600">
                  Running a large chain, franchise or enterprise operation? We build custom
                  plans with bespoke onboarding and a price tailored to your scale — plus
                  extra SMS, AI Credits, storage and capacity purchased anytime. Talk to our
                  team.
                </p>
              </div>
              <a
                href={SALES_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3.5 text-sm font-bold text-white transition-all hover:bg-slate-800"
              >
                <MessageCircle className="h-4 w-4" />
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── FULL COMPARISON TABLE ── */}
      <section className="bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mb-10 text-center">
            <span className="mb-3 inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-700">
              Compare plans
            </span>
            <h2 className="text-3xl font-black text-slate-900 sm:text-4xl">
              Every detail, side by side
            </h2>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="py-4 pl-6 pr-4 text-left font-semibold">Feature</th>
                  <th className="px-4 py-4 text-center font-bold">Sindano</th>
                  <th className="px-4 py-4 text-center font-bold text-emerald-300">Fundi</th>
                  <th className="px-4 py-4 text-center font-bold text-amber-300">Dhahabu</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map(({ feature, values }, i) => (
                  <tr
                    key={feature}
                    className={cn("border-t border-slate-100", i % 2 === 0 ? "bg-white" : "bg-slate-50")}
                  >
                    <td className="py-3 pl-6 pr-4 font-medium text-slate-700">{feature}</td>
                    {values.map((value, j) => (
                      <td
                        key={j}
                        className={cn(
                          "px-4 py-3 text-center",
                          value === "—" ? "text-slate-300" : "text-slate-600",
                          j === 1 && value !== "—" && "font-medium text-emerald-700",
                          j === 2 && value !== "—" && "font-medium text-amber-700",
                        )}
                      >
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mx-auto mt-8 max-w-2xl text-center text-sm leading-relaxed text-slate-500">
            Need more? You can upgrade your plan or purchase additional SMS, AI Credits,
            storage, or other capacity at any time — your business never stops growing.
          </p>
        </div>
      </section>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  billing,
  category,
  user,
  freeTrialEnabled,
}: {
  plan: PricingPlan;
  billing: BillingCycle;
  category: BusinessType;
  user: boolean;
  freeTrialEnabled: boolean;
}) {
  const href = user
    ? freeTrialEnabled
      ? `/start-trial?plan=${plan.id}`
      : `/checkout?plan=${plan.id}`
    : `/register?category=${category}&plan=${plan.id}`;

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-3xl border bg-white p-8 shadow-sm transition-shadow hover:shadow-md",
        plan.color,
        plan.highlight && "shadow-lg ring-2 ring-emerald-400/40",
      )}
    >
      {plan.badge && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-4 py-1 text-sm font-bold text-white shadow-sm">
            <Star className="h-3.5 w-3.5" />
            {plan.badge}
          </span>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-2xl font-black text-slate-900">{plan.name}</h2>
        <p className={cn("text-sm font-semibold", plan.accentColor)}>{plan.swahili}</p>
        <p className="mt-1 text-xs italic text-slate-400">{plan.meaning}</p>
      </div>

      {/* Price */}
      <div className="mb-2">
        {billing === "monthly" ? (
          <>
            <div className="flex items-end gap-1">
              <span className="text-sm font-medium text-slate-500">KES</span>
              <span className="text-5xl font-black text-slate-900">
                {plan.monthlyPrice.toLocaleString("en-KE")}
              </span>
              <span className="mb-1.5 text-sm text-slate-400">/month</span>
            </div>
            <p className="mt-1.5 text-sm font-semibold text-emerald-700">
              Launch offer:{" "}
              <span className="font-black">KES {plan.introPrice.toLocaleString("en-KE")}</span>
              /month for your first 2 months
            </p>
          </>
        ) : (
          <>
            <div className="flex items-end gap-1">
              <span className="text-sm font-medium text-slate-500">KES</span>
              <span className="text-5xl font-black text-slate-900">
                {plan.annualPrice.toLocaleString("en-KE")}
              </span>
              <span className="mb-1.5 text-sm text-slate-400">/year</span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                <BadgeCheck className="h-3.5 w-3.5" />
                Save {formatKes(plan.annualSavings)}
              </span>
              <span className="text-sm text-slate-500">
                KES {Math.round(plan.annualPrice / 12).toLocaleString("en-KE")}/month equivalent
              </span>
            </div>
            <p className="mt-1.5 text-sm text-slate-500">Pay for 10 months, get 12.</p>
          </>
        )}
      </div>

      <p className="mb-3 mt-2 text-sm italic text-slate-500">{plan.tagline}</p>
      <p className="mb-6 text-sm leading-relaxed text-slate-600">{plan.description}</p>

      <Link
        href={href}
        className={cn(
          "mb-2 flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold transition-all",
          plan.id === "dhahabu"
            ? "bg-amber-500 text-white hover:bg-amber-400"
            : plan.highlight
              ? "bg-emerald-600 text-white hover:bg-emerald-500"
              : "bg-slate-900 text-white hover:bg-slate-800",
        )}
      >
        {freeTrialEnabled ? "Start 14-day free trial" : `Get started with ${plan.name}`}
        <ArrowRight className="h-4 w-4" />
      </Link>
      <p className="mb-8 text-center text-xs text-slate-400">
        {freeTrialEnabled && "No card required · "}
        {billing === "annual" ? "cancel anytime" : "then continue monthly · cancel anytime"}
      </p>

      {/* Included capacity */}
      <div className="mb-6">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
          Included capacity
        </p>
        <div className="grid grid-cols-2 gap-2">
          {CAPACITY_TILES.map(({ key, label }) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
            >
              <span className="text-[11px] text-slate-500">{label}</span>
              <span className="text-sm font-black text-slate-900">{plan.capacity[key]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-2.5">
        {plan.features.map(({ text, included, note }) => (
          <div key={text} className="flex items-start gap-2.5">
            {included ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            ) : (
              <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-slate-300" />
            )}
            <span className={cn("text-sm", included ? "text-slate-700" : "text-slate-400")}>
              {text}
              {note && <span className="ml-1.5 text-xs text-slate-400">({note})</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
