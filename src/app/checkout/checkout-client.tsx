"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
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
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { calculateCheckoutTotals, formatKes } from "@/lib/billing/fees";
import { SMS_SENDER_ID_PRICE, getPlanConfig } from "@/lib/billing/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { PlanSlug } from "@/types/billing";

// ── Feature list per plan ────────────────────────────────────────────────────

const PLAN_FEATURES: Record<string, string[]> = {
  sindano: [
    "1 user account (owner only)",
    "Up to 100 customer records",
    "Up to 80 active orders/month",
    "Customer measurements & fitting notes",
    "Basic inventory tracking (up to 50 items)",
    "Payment recording (Cash & M-Pesa)",
    "50 SMS notifications/month",
    "Mobile dashboard (PWA) + offline mode",
    "AI Assistant — limited access",
    "Email support (48 hr response)",
  ],
  fundi: [
    "Up to 10 user accounts",
    "Unlimited customers & orders",
    "Full measurements, fittings & style records",
    "Full production workflow (6 stages)",
    "Full inventory + purchase orders",
    "Complete finance dashboard",
    "700 SMS notifications/month",
    "WhatsApp order notifications",
    "Analytics — sales trends & KPIs",
    "Role-based team management (6 roles)",
    "AI Assistant",
    "Priority support (12 hr response)",
  ],
  dhahabu: [
    "Unlimited user accounts",
    "Everything in Fundi, fully unlocked",
    "AI Assistant — full access & forecasting",
    "Unlimited SMS notifications",
    "Advanced analytics & profit forecasting",
    "Multi-location / branch support",
    "API access for custom integrations",
    "Dedicated account manager",
    "On-site training & onboarding (Nairobi)",
    "SLA: 99.9% uptime guarantee",
    "Priority phone support (2 hr response)",
  ],
};

// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  planSlug: PlanSlug;
}

export function CheckoutClient({ planSlug }: Props) {
  const router = useRouter();
  const plan = getPlanConfig(planSlug);
  const [addSenderId, setAddSenderId] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totals = calculateCheckoutTotals(planSlug, addSenderId);
  const features = PLAN_FEATURES[planSlug] ?? [];

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
        body: JSON.stringify({ planSlug, addSmsSenderId: addSenderId }),
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
  }, [loading, planSlug, addSenderId, router]);

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
                  <p className="text-2xl font-black">{formatKes(plan.installationFee)}</p>
                  <p className="text-xs opacity-70">installation fee</p>
                </div>
                <div>
                  <p className="text-xs opacity-70">Then after 60 days</p>
                  <p className="text-2xl font-black">{formatKes(plan.monthlyPrice)}</p>
                  <p className="text-xs opacity-70">/month recurring</p>
                </div>
              </div>
            </div>

            {/* Billing timeline */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h3 className="mb-3 font-bold text-slate-900">Your billing timeline</h3>
              <ol className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">1</span>
                  <span>
                    <strong>Today:</strong> Pay the one-time installation fee of{" "}
                    <strong>{formatKes(plan.installationFee)}</strong>.
                    Your workspace activates immediately.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-400 text-[10px] font-bold text-white">2</span>
                  <span>
                    <strong>In 60 days:</strong> First monthly subscription of{" "}
                    <strong>{formatKes(plan.monthlyPrice)}/month</strong> begins.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-400 text-[10px] font-bold text-white">3</span>
                  <span>
                    <strong>Every 30 days after:</strong> Recurring subscription renewed.
                    Cancel anytime from your billing dashboard.
                  </span>
                </li>
              </ol>
            </div>

            {/* Features */}
            <div>
              <h3 className="mb-4 font-bold text-slate-900">What&apos;s included</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {features.map((f) => (
                  <div key={f} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <span className="text-sm text-slate-600">{f}</span>
                  </div>
                ))}
              </div>
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
                    <span className="text-slate-600">Installation fee ({plan.name})</span>
                    <span className="font-semibold text-slate-900">{formatKes(plan.installationFee)}</span>
                  </div>

                  {addSenderId && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Custom SMS Sender ID</span>
                      <span className="font-semibold">{formatKes(SMS_SENDER_ID_PRICE)}</span>
                    </div>
                  )}

                  <div className="border-t border-slate-200 pt-3">
                    <div className="flex justify-between text-base font-black text-slate-900">
                      <span>Total payable today</span>
                      <span>{formatKes(totals.total)}</span>
                    </div>
                  </div>
                </div>

                {/* Sender ID addon */}
                <div className="mt-5 rounded-xl border border-slate-200 p-4">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={addSenderId}
                      onChange={(e) => setAddSenderId(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-emerald-600"
                    />
                    <div>
                      <p className="font-semibold text-slate-900">
                        Custom SMS Sender ID
                        <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                          One-time
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Send SMS under your business name instead of a generic code.
                        Available on all plans. Never billed again after purchase.
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-900">
                        + {formatKes(SMS_SENDER_ID_PRICE)}
                      </p>
                    </div>
                  </label>
                </div>

                {/* After 60 days note */}
                <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                  After 60 days, your subscription renews at{" "}
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
