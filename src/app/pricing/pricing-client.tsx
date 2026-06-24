"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, X, ArrowRight, MessageCircle, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BUSINESS_TYPES,
  DEFAULT_BUSINESS_TYPE,
  isBusinessType,
  type BusinessType,
} from "@/lib/business-types";
import { getPlansForCategory, getHeroForCategory } from "@/lib/billing/pricing-content";

const SALES_URL =
  "https://wa.me/254142225233?text=Hi%2C%20I%27d%20like%20a%20custom%20FundiFlow%20plan%20with%20more%20branches";

export function PricingClient() {
  const searchParams = useSearchParams();
  const initial = searchParams.get("category");
  const [category, setCategory] = useState<BusinessType>(
    isBusinessType(initial) ? initial : DEFAULT_BUSINESS_TYPE,
  );

  const plans = useMemo(() => getPlansForCategory(category), [category]);
  const hero = getHeroForCategory(category);

  const comparisonRows = useMemo(
    () => [
      { feature: "User accounts", sindano: "1", fundi: "Up to 10", dhahabu: "Unlimited" },
      { feature: "Customers", sindano: "Up to 100", fundi: "Unlimited", dhahabu: "Unlimited" },
      { feature: "Transactions / month", sindano: "Up to 80", fundi: "Unlimited", dhahabu: "Unlimited" },
      { feature: "Inventory items", sindano: "Up to 50", fundi: "Unlimited", dhahabu: "Unlimited" },
      { feature: "Branches / outlets", sindano: "1", fundi: "Up to 4", dhahabu: "Up to 9" },
      { feature: "SMS / month", sindano: "50", fundi: "700", dhahabu: "Unlimited" },
      { feature: "Finance dashboard", sindano: "Basic", fundi: "Full", dhahabu: "Full + AI" },
      { feature: "WhatsApp notifications", sindano: "✗", fundi: "✓", dhahabu: "✓" },
      { feature: "Team roles", sindano: "✗", fundi: "6 roles", dhahabu: "6 roles + custom" },
      { feature: "Analytics", sindano: "✗", fundi: "✓", dhahabu: "Advanced + forecasting" },
      { feature: "AI Assistant", sindano: "✓ Limited", fundi: "✓", dhahabu: "✓ Full access" },
      { feature: "Dedicated account manager", sindano: "✗", fundi: "✗", dhahabu: "✓" },
      { feature: "API access", sindano: "✗", fundi: "✗", dhahabu: "✓" },
      { feature: "Support", sindano: "Email 48hr", fundi: "Priority 12hr", dhahabu: "Phone 2hr" },
      {
        feature: "Installation fee",
        sindano: "KES 5,075",
        fundi: "KES 28,420",
        dhahabu: "KES 43,990",
      },
    ],
    [],
  );

  return (
    <>
      {/* ── HERO + CATEGORY PICKER ── */}
      <section className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 py-20 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-semibold text-emerald-300">
            <Building2 className="h-4 w-4" />
            Transparent Pricing
          </span>
          <h1 className="mb-2 text-2xl font-black leading-tight sm:text-4xl">
            Simple, honest pricing
            <br className="hidden sm:block" />
            <span className="text-emerald-400">for every business</span>
          </h1>
          <p className="mx-auto max-w-xl text-lg text-slate-300">{hero}</p>

          {/* Category selector */}
          <div className="mt-8">
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

      {/* ── PLAN CARDS ── */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col rounded-3xl border bg-white p-8 shadow-sm transition-shadow hover:shadow-md",
                  plan.color,
                  plan.highlight && "shadow-lg ring-2 ring-emerald-400/40",
                )}
              >
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-emerald-600 px-4 py-1 text-sm font-bold text-white shadow-sm">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <div
                    className={cn(
                      "mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl text-2xl",
                      plan.iconBg,
                    )}
                  >
                    {BUSINESS_TYPES.find((b) => b.id === category)?.emoji ?? "🏬"}
                  </div>
                  <h2 className="text-2xl font-black text-slate-900">{plan.name}</h2>
                  <p className={cn("text-sm font-semibold", plan.accentColor)}>{plan.swahili}</p>
                  <p className="mt-1 text-xs italic text-slate-400">{plan.meaning}</p>
                </div>

                <div className="mb-2">
                  <div className="flex items-end gap-1">
                    <span className="text-sm font-medium text-slate-500">KES</span>
                    <span className="text-5xl font-black text-slate-900">
                      {plan.monthlyPrice.toLocaleString()}
                    </span>
                    <span className="mb-1.5 text-sm text-slate-400">/month</span>
                  </div>
                  <p className="text-sm text-slate-500">
                    + One-time installation fee:{" "}
                    <span className="font-semibold text-slate-700">
                      KES {plan.installationFee.toLocaleString()}
                    </span>
                  </p>
                </div>

                <p className="mb-6 text-sm italic text-slate-500">{plan.tagline}</p>
                <p className="mb-6 text-sm leading-relaxed text-slate-600">{plan.description}</p>

                <Link
                  href={`/register?category=${category}&plan=${plan.id}`}
                  className={cn(
                    "mb-2 flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold transition-all",
                    plan.id === "dhahabu"
                      ? "bg-amber-500 text-white hover:bg-amber-400"
                      : plan.highlight
                        ? "bg-emerald-600 text-white hover:bg-emerald-500"
                        : "bg-slate-900 text-white hover:bg-slate-800",
                  )}
                >
                  Start 14-day free trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <p className="mb-8 text-center text-xs text-slate-400">
                  No card required · then {plan.cta.toLowerCase().includes("contact") ? "contact us" : `KES ${plan.monthlyPrice.toLocaleString()}/mo`}
                </p>

                <div className="flex-1 space-y-2.5">
                  {plan.features.map(({ text, included, note }) => (
                    <div key={text} className="flex items-start gap-2.5">
                      {included ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      ) : (
                        <X className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                      )}
                      <span className={cn("text-sm", included ? "text-slate-700" : "text-slate-400")}>
                        {text}
                        {note && <span className="ml-1.5 text-xs text-slate-400">({note})</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* ── CUSTOM / CONTACT SALES ── */}
          <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-8">
            <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  Need more than 9 branches?
                </h3>
                <p className="mt-1 max-w-xl text-sm text-slate-600">
                  Running a large chain or franchise? We build custom plans with unlimited
                  branches, bespoke onboarding and a price tailored to your scale. Talk to our
                  sales team.
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
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-black text-slate-900 sm:text-4xl">
              Compare plans side by side
            </h2>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
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
                {comparisonRows.map(({ feature, sindano, fundi, dhahabu }, i) => (
                  <tr
                    key={feature}
                    className={cn("border-t border-slate-100", i % 2 === 0 ? "bg-white" : "bg-slate-50")}
                  >
                    <td className="py-3 pl-6 pr-4 font-medium text-slate-700">{feature}</td>
                    <td
                      className={cn(
                        "px-4 py-3 text-center",
                        sindano === "✗" ? "text-slate-300" : "text-slate-600",
                      )}
                    >
                      {sindano}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 text-center font-medium",
                        fundi === "✗" ? "text-slate-300" : "text-emerald-700",
                      )}
                    >
                      {fundi}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 text-center font-medium",
                        dhahabu === "✗" ? "text-slate-300" : "text-amber-700",
                      )}
                    >
                      {dhahabu}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
