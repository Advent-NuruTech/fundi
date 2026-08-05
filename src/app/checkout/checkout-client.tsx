"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  Lock,
  Smartphone,
  CreditCard,
  Building2,
  Loader2,
  ChevronRight,
  AlertCircle,
  Scissors,
  Star,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useFreeTrialEnabled } from "@/hooks/useFreeTrialEnabled";
import { calculateCheckoutTotals, formatKes } from "@/lib/billing/fees";
import { getPlanConfig } from "@/lib/billing/constants";
import { usePlanConfigs } from "@/hooks/usePlanConfigs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { PlanSlug } from "@/types/billing";

// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  planSlug: PlanSlug;
  trialExpired?: boolean;
}

export function CheckoutClient({ planSlug, trialExpired = false }: Props) {
  const router = useRouter();
  const { data: planConfigs } = usePlanConfigs();
  const plan =
    planConfigs.plans[planSlug as Exclude<PlanSlug, "custom">] ?? getPlanConfig(planSlug);
  const { enabled: freeTrialEnabled } = useFreeTrialEnabled();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totals = calculateCheckoutTotals(planSlug, false, { plan });

  const handleProceed = useCallback(async () => {
    if (loading) return;
    setError(null);
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        router.push(`/login?redirect=/checkout?plan=${planSlug}`);
        return;
      }

      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ planSlug }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          toast.info("Your workspace already has an active subscription.");
          router.push("/dashboard");
          return;
        }
        throw new Error(data.error ?? "Checkout failed");
      }

      // Redirect to Paystack hosted checkout
      window.location.href = data.authorizationUrl;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [loading, planSlug, router]);

  if (!plan) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">Invalid plan. <Link href="/pricing" className="text-emerald-600 underline">Back to pricing</Link></p>
      </div>
    );
  }

  const ACCENT = planSlug === "sindano"
    ? "bg-slate-900"
    : planSlug === "fundi"
    ? "bg-emerald-600"
    : "bg-amber-500";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Top nav */}
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-black text-slate-900">
            <Scissors className="h-5 w-5 text-emerald-600" />
            FundiFlow
          </Link>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Lock className="h-3.5 w-3.5" />
            Secured by Paystack
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-16">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-sm text-slate-500">
          <Link href="/pricing" className="hover:text-slate-900">Pricing</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-semibold text-slate-900">Checkout — {plan.name}</span>
        </nav>

        {/* Trial-ended notice (only shown while the platform free-trial flag is live) */}
        {trialExpired && freeTrialEnabled && (
          <div className="mb-8 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <div>
              <p className="font-bold text-slate-900">Your free trial has ended</p>
              <p className="mt-1 text-sm text-slate-600">
                Pay to continue using FundiFlow. Your {plan.name} workspace, customers,
                orders and settings are safe and stay exactly as you left them — complete
                your first month&apos;s payment below to pick up right where you stopped.
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[1fr_420px]">

          {/* ── LEFT: Plan summary ────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Plan header */}
            <div className={cn("rounded-3xl p-8 text-white", ACCENT)}>
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
                  <Scissors className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-3xl font-black">{plan.name}</h1>
                  <p className="text-sm opacity-80">{plan.swahiliName}</p>
                </div>
                {planSlug === "fundi" && (
                  <span className="ml-auto flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
                    <Star className="h-3 w-3" /> Most Popular
                  </span>
                )}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4 rounded-2xl bg-black/20 p-4">
                <div>
                  <p className="text-xs opacity-70">First payment</p>
                  <p className="text-2xl font-black">{formatKes(plan.introPrice)}</p>
                  <p className="text-xs opacity-70">1st month — launch offer</p>
                </div>
                <div>
                  <p className="text-xs opacity-70">Then every 30 days</p>
                  <p className="text-2xl font-black">{formatKes(plan.monthlyPrice)}</p>
                  <p className="text-xs opacity-70">after your first 2 months</p>
                </div>
              </div>
            </div>

            {/* Billing timeline */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h3 className="mb-3 font-bold text-slate-900">Your billing timeline</h3>
              <p className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2.5 text-xs font-medium text-amber-800">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <span>
                  Launch offer: <strong>{formatKes(plan.introPrice)}/month</strong> for your first
                  two months, then {formatKes(plan.monthlyPrice)}/month.
                </span>
              </p>
              <ol className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">1</span>
                  <span>
                    <strong>Today:</strong> Pay your first month at the launch rate of{" "}
                    <strong>{formatKes(plan.introPrice)}</strong>.
                    Your workspace activates immediately.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">2</span>
                  <span>
                    <strong>In 30 days:</strong> Your second month renews at the launch rate of{" "}
                    <strong>{formatKes(plan.introPrice)}</strong> — the offer ends after this.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-400 text-[10px] font-bold text-white">3</span>
                  <span>
                    <strong>Every 30 days after:</strong> Your subscription continues at{" "}
                    <strong>{formatKes(plan.monthlyPrice)}/month</strong>.
                    Cancel anytime from your billing dashboard.
                  </span>
                </li>
              </ol>
            </div>

           

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Shield, label: "256-bit SSL encryption" },
                { icon: Lock, label: "PCI DSS compliant" },
                { icon: Scissors, label: "Cancel anytime" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 p-3 text-center">
                  <Icon className="h-5 w-5 text-slate-400" />
                  <span className="text-xs text-slate-500">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT: Payment card ───────────────────────────────────────── */}
          <div className="space-y-4">
            <Card className="sticky top-6 shadow-xl">
              <CardContent className="p-6">
                <h2 className="mb-5 text-lg font-black text-slate-900">Order summary</h2>

                {/* Line items */}
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">
                      First month subscription ({plan.name})
                      <span className="ml-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        Launch offer
                      </span>
                    </span>
                    <span className="font-semibold text-slate-900">{formatKes(plan.introPrice)}</span>
                  </div>

                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Second month (in 30 days) — launch offer</span>
                    <span className="font-semibold text-emerald-700">{formatKes(plan.introPrice)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>From month 3 — standard rate</span>
                    <span className="font-semibold text-slate-700">{formatKes(plan.monthlyPrice)}/month</span>
                  </div>

                  <div className="border-t border-slate-200 pt-3">
                    <div className="flex justify-between text-base font-black text-slate-900">
                      <span>Total payable today</span>
                      <span>{formatKes(totals.total)}</span>
                    </div>
                  </div>
                </div>

                {/* Renewal note */}
                <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                  Launch offer: <strong className="text-slate-700">{formatKes(plan.introPrice)}/month</strong>{" "}
                  for your first 2 months, then{" "}
                  <strong className="text-slate-700">{formatKes(plan.monthlyPrice)}/month</strong>.
                  No hidden charges. Cancel anytime.
                </div>

                {/* Error */}
                {error && (
                  <div className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-600">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                {/* CTA */}
                <Button
                  onClick={handleProceed}
                  disabled={loading}
                  className="mt-5 w-full gap-2 rounded-xl bg-emerald-600 py-3 text-base font-bold text-white hover:bg-emerald-500 disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Preparing secure payment…
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      Proceed to Secure Payment
                    </>
                  )}
                </Button>

                {/* Payment method badges */}
                <div className="mt-4 flex items-center justify-center gap-3">
                  <div className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600">
                    <Smartphone className="h-3.5 w-3.5 text-emerald-600" />
                    M-Pesa
                  </div>
                  <div className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600">
                    <CreditCard className="h-3.5 w-3.5 text-blue-600" />
                    Card
                  </div>
                  <div className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600">
                    <Building2 className="h-3.5 w-3.5 text-slate-500" />
                    Bank
                  </div>
                </div>

                <p className="mt-4 text-center text-xs text-slate-400">
                  <Lock className="mr-1 inline h-3 w-3" />
                  Payment secured by Paystack. Your card details are never stored.
                </p>
              </CardContent>
            </Card>

            {/* Support */}
            <a
              href="https://wa.me/254142225233?text=Hi%2C+I+need+help+with+my+FundiFlow+subscription"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600 transition-colors hover:bg-slate-50"
            >
              <MessageCircle className="h-4 w-4 text-emerald-500" />
              Questions? Chat with us on WhatsApp
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
