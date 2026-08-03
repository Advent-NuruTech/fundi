"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Loader2,
  Scissors,
  Lock,
  ShieldCheck,
  CalendarClock,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useFreeTrialEnabled } from "@/hooks/useFreeTrialEnabled";
import { usePlanConfigs } from "@/hooks/usePlanConfigs";
import { TRIAL_DAYS, isValidPlanSlug } from "@/lib/billing/constants";
import { formatKes } from "@/lib/billing/fees";
import { Button } from "@/components/ui/button";
import type { PlanConfig, PlanSlug } from "@/types/billing";

type TrialPlan = Exclude<PlanSlug, "custom">;
const PLAN_ORDER: TrialPlan[] = ["sindano", "fundi", "dhahabu"];

const nf = (value: number | null | undefined): string =>
  value == null ? "Unlimited" : value.toLocaleString("en-KE");

// Short, scannable highlights per plan for the trial chooser.
function buildPlanHighlights(configs: Record<TrialPlan, PlanConfig>): Record<TrialPlan, string[]> {
  const l = configs;
  return {
    sindano: [
      `${nf(l.sindano.limits.maxUsers)} user account${l.sindano.limits.maxUsers === 1 ? "" : "s"}`,
      `Up to ${nf(l.sindano.limits.maxCustomers)} customers`,
      "Basic inventory & payments",
      `${nf(l.sindano.limits.smsPerMonth)} SMS / month`,
    ],
    fundi: [
      `Up to ${nf(l.fundi.limits.maxUsers)} user accounts`,
      `Up to ${nf(l.fundi.limits.maxCustomers)} customers & ${nf(l.fundi.limits.maxOrdersPerMonth)} orders/mo`,
      "Full finance dashboard & analytics",
      `${nf(l.fundi.limits.smsPerMonth)} SMS + WhatsApp notifications`,
    ],
    dhahabu: [
      `Up to ${nf(l.dhahabu.limits.maxUsers)} users`,
      "Everything in Fundi, unlocked",
      "Multi-branch + API access",
      `${nf(l.dhahabu.limits.smsPerMonth)} SMS + AI assistant & forecasting`,
    ],
  };
}

export function StartTrialClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialPlan = searchParams.get("plan");
  const [selected, setSelected] = useState<TrialPlan>(
    isValidPlanSlug(initialPlan) ? initialPlan : "fundi",
  );
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);

  // Defense-in-depth: never show the trial chooser when the platform flag is OFF.
  const { enabled: freeTrialEnabled, loading: trialFlagLoading } = useFreeTrialEnabled();

  // Live plan pricing/capacity (defaults + platform-admin overrides).
  const { data: planConfigs } = usePlanConfigs();
  const planHighlights = useMemo(
    () => buildPlanHighlights(planConfigs.plans),
    [planConfigs.plans]
  );

  useEffect(() => {
    if (trialFlagLoading) return;
    if (!freeTrialEnabled) {
      router.replace(isValidPlanSlug(initialPlan) ? `/checkout?plan=${initialPlan}` : "/pricing");
    }
  }, [trialFlagLoading, freeTrialEnabled, initialPlan, router]);

  // If the workspace already has a subscription/trial, don't show the chooser.
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        router.replace("/login?redirect=/start-trial");
        return;
      }
      const res = await fetch("/api/billing/subscription", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!active) return;
      if (data?.subscription) {
        // Already trialing/active/etc → let the dashboard guard route them.
        router.replace("/dashboard");
        return;
      }
      setChecking(false);
    })();
    return () => {
      active = false;
    };
  }, [router]);

  const trialEndLabel = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + TRIAL_DAYS);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  }, []);

  const handleStart = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        router.replace("/login?redirect=/start-trial");
        return;
      }
      const res = await fetch("/api/billing/start-trial", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ planSlug: selected }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 409) {
          toast.info("Your workspace already has a plan. Taking you to your dashboard.");
          router.replace("/dashboard");
          return;
        }
        throw new Error(data.error ?? "Could not start your trial");
      }

      toast.success(`Your ${TRIAL_DAYS}-day free trial is live. Welcome to FundiFlow!`);
      router.replace("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }, [submitting, selected, router]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          <p className="text-sm text-slate-500">Setting things up…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/40">
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <span className="flex items-center gap-2 font-black text-slate-900">
            <Scissors className="h-5 w-5 text-emerald-600" />
            FundiFlow
          </span>
          <span className="flex items-center gap-1.5 text-sm text-slate-500">
            <Lock className="h-3.5 w-3.5" />
            No card required
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
        {/* Hero */}
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-700">
            <Sparkles className="h-4 w-4" />
            {TRIAL_DAYS}-day free trial
          </span>
          <h1 className="text-3xl font-black leading-tight text-slate-900 sm:text-4xl">
            Get started for free
          </h1>
          <p className="mt-3 text-base text-slate-600">
            Pick the plan you want to try. You get full access for{" "}
            <strong className="text-slate-900">{TRIAL_DAYS} days</strong> — no card, no charge.
            Everything you set up stays yours when you continue.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid gap-5 lg:grid-cols-3">
          {PLAN_ORDER.map((slug) => {
            const plan = planConfigs.plans[slug];
            const active = selected === slug;
            const popular = slug === "fundi";
            return (
              <button
                key={slug}
                type="button"
                onClick={() => setSelected(slug)}
                className={cn(
                  "relative flex flex-col rounded-3xl border bg-white p-6 text-left shadow-sm transition-all",
                  active
                    ? "border-emerald-500 ring-2 ring-emerald-500/30"
                    : "border-slate-200 hover:border-emerald-300",
                )}
              >
                {popular && (
                  <span className="absolute -top-3 left-6 rounded-full bg-emerald-600 px-3 py-0.5 text-xs font-bold text-white shadow-sm">
                    Most popular
                  </span>
                )}
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <p className="text-xl font-black text-slate-900">{plan.name}</p>
                    <p className={cn("text-sm font-semibold", plan.accentColor)}>
                      {plan.swahiliName}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors",
                      active ? "border-emerald-600 bg-emerald-600" : "border-slate-300",
                    )}
                  >
                    {active && <CheckCircle2 className="h-4 w-4 text-white" />}
                  </span>
                </div>

                <div className="mb-4">
                  <span className="text-3xl font-black text-slate-900">
                    {formatKes(plan.monthlyPrice)}
                  </span>
                  <span className="text-sm text-slate-400">/month after trial</span>
                </div>

                <ul className="space-y-2">
                  {planHighlights[slug].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      {f}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        {/* What happens after */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: Sparkles,
                title: "Today",
                desc: `Your ${planConfigs.plans[selected].name} trial starts instantly — full access, no card.`,
              },
              {
                icon: CalendarClock,
                title: `Day ${TRIAL_DAYS - 5}`,
                desc: "We remind you 5 days before your trial ends — no surprises.",
              },
              {
                icon: ShieldCheck,
                title: trialEndLabel,
                desc: "Trial ends. Pay to keep using FundiFlow — your data stays exactly as it is.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{title}</p>
                  <p className="text-xs leading-relaxed text-slate-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 flex flex-col items-center gap-3">
          <Button
            onClick={handleStart}
            disabled={submitting}
            className="w-full max-w-sm gap-2 rounded-2xl bg-emerald-600 py-6 text-base font-bold text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Starting your trial…
              </>
            ) : (
              <>
                Start my free {TRIAL_DAYS}-day trial
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
          <p className="text-center text-xs text-slate-400">
            No payment now. We&apos;ll only ask you to pay if you choose to continue after{" "}
            {TRIAL_DAYS} days.{" "}
            <Link href="/pricing" className="font-medium text-emerald-600 hover:underline">
              Compare plans
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
