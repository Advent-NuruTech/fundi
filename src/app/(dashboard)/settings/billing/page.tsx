"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  CreditCard,
  Calendar,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  ArrowUpRight,
  Receipt,
  Loader2,
  RefreshCw,
  Scissors,
  MessageSquare,
  XCircle,
  Clock,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatKes } from "@/lib/billing/fees";
import { SMS_SENDER_ID_PRICE } from "@/lib/billing/constants";
import { useAuth } from "@/features/auth/components/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PlanBadge } from "@/components/billing/plan-badge";
import type { BillingPortalData } from "@/types/billing";

const STATUS_CONFIG = {
  active:          { label: "Active",          color: "text-emerald-700 bg-emerald-100", icon: CheckCircle2 },
  pending_payment: { label: "Pending Payment", color: "text-amber-700   bg-amber-100",   icon: Clock },
  past_due:        { label: "Past Due",        color: "text-rose-700    bg-rose-100",    icon: AlertCircle },
  cancelled:       { label: "Cancelled",       color: "text-slate-600   bg-slate-100",   icon: XCircle },
  suspended:       { label: "Suspended",       color: "text-orange-700  bg-orange-100",  icon: XCircle },
} as const;

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  installation_fee:    "Installation Fee",
  monthly_subscription: "Monthly Subscription",
  sms_sender_id:       "Custom SMS Sender ID",
  upgrade:             "Plan Upgrade",
};

export default function BillingDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<BillingPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPortal = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/billing/portal", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });

      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? "Failed to load billing data");
      }

      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === "owner") {
      fetchPortal();
    } else {
      setLoading(false);
    }
  }, [user, fetchPortal]);

  // Non-owners
  if (user?.role !== "owner") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <CreditCard className="h-12 w-12 text-slate-300" />
        <h2 className="text-xl font-bold text-slate-900">Billing is owner-only</h2>
        <p className="text-slate-500">Only the workspace owner can manage billing and subscriptions.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <AlertCircle className="h-12 w-12 text-rose-400" />
        <h2 className="text-xl font-bold text-slate-900">Failed to load billing</h2>
        <p className="text-sm text-slate-500">{error}</p>
        <Button onClick={fetchPortal} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  const { subscription, payments, plan } = data ?? {};
  const statusCfg = subscription?.status
    ? STATUS_CONFIG[subscription.status] ?? STATUS_CONFIG.active
    : null;
  const StatusIcon = statusCfg?.icon ?? CheckCircle2;

  const nextBillingDate = subscription?.nextBillingDate
    ? new Date(subscription.nextBillingDate).toLocaleDateString("en-KE", {
        year: "numeric", month: "long", day: "numeric",
      })
    : null;

  return (
    <div className="space-y-8 pb-12">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Billing & Subscription</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your plan, view invoices, and update billing details.
          </p>
        </div>
        <Button onClick={fetchPortal} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* ── Current plan ─────────────────────────────────────────────────── */}
      {subscription && plan ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Plan card */}
          <Card className={`col-span-1 border-2 ${plan.color ?? "border-emerald-400"}`}>
            <CardContent className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <Scissors className="h-5 w-5 text-slate-400" />
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Current Plan</span>
              </div>
              <div className="flex items-center gap-2">
                <PlanBadge planSlug={subscription.planSlug} />
                {statusCfg && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${statusCfg.color}`}>
                    <StatusIcon className="h-3 w-3" />
                    {statusCfg.label}
                  </span>
                )}
              </div>
              <p className="mt-3 text-2xl font-black text-slate-900">
                {formatKes(plan.monthlyPrice)}
                <span className="text-sm font-normal text-slate-400">/month</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Installation fee paid ✓
              </p>
              {subscription.smsSenderIdPaid && (
                <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" />
                  Custom SMS Sender ID active
                </p>
              )}
            </CardContent>
          </Card>

          {/* Next billing */}
          <Card>
            <CardContent className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-slate-400" />
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Next Billing</span>
              </div>
              {nextBillingDate ? (
                <>
                  <p className="text-lg font-bold text-slate-900">{nextBillingDate}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatKes(plan.monthlyPrice)} will be charged
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-500">Not yet scheduled</p>
              )}
            </CardContent>
          </Card>

          {/* SMS Sender ID */}
          <Card>
            <CardContent className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-slate-400" />
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">SMS Sender ID</span>
              </div>
              {subscription.smsSenderIdPaid ? (
                <>
                  <p className="flex items-center gap-1.5 font-bold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Active
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Paid {subscription.smsSenderIdPaidAt
                      ? new Date(subscription.smsSenderIdPaidAt).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" })
                      : ""}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-500">Not purchased</p>
                  <a
                    href={`https://wa.me/254142225233?text=Hi%2C+I+want+to+add+Custom+SMS+Sender+ID+to+my+FundiFlow+account`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
                  >
                    Add for {formatKes(SMS_SENDER_ID_PRICE)} <ArrowUpRight className="h-3 w-3" />
                  </a>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="border-dashed border-slate-300">
          <CardContent className="py-12 text-center">
            <CreditCard className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <h3 className="font-bold text-slate-900">No active subscription</h3>
            <p className="mt-1 text-sm text-slate-500">
              Choose a plan to unlock full dashboard access.
            </p>
            <Link href="/pricing">
              <Button className="mt-4 gap-2">
                View Plans <ArrowUpRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* ── Plan actions ──────────────────────────────────────────────────── */}
      {subscription?.status === "active" && (
        <div>
          <h2 className="mb-4 text-lg font-bold text-slate-900">Plan actions</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <a
              href="https://wa.me/254142225233?text=Hi%2C+I+want+to+upgrade+my+FundiFlow+plan"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
            >
              Upgrade plan
              <ArrowUpRight className="h-4 w-4" />
            </a>
            <a
              href="https://wa.me/254142225233?text=Hi%2C+I+want+to+downgrade+my+FundiFlow+plan"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Downgrade plan
              <ArrowUpRight className="h-4 w-4" />
            </a>
            <a
              href="https://wa.me/254142225233?text=Hi%2C+I+want+to+cancel+my+FundiFlow+subscription"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 hover:bg-rose-100"
            >
              Cancel subscription
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Upgrades and downgrades are handled by our team. Chat with us on WhatsApp for immediate assistance.
          </p>
        </div>
      )}

      {/* ── Payment history ───────────────────────────────────────────────── */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-slate-900">Payment history</h2>

        {!payments?.length ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Receipt className="mx-auto mb-3 h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-500">No payments recorded yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="py-3 pl-5 pr-4 text-left font-semibold text-slate-600">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Type</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Amount</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">Status</th>
                  <th className="py-3 pl-4 pr-5 text-left font-semibold text-slate-600">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="py-3 pl-5 pr-4 text-slate-600">
                      {p.paidAt
                        ? new Date(p.paidAt).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" })
                        : new Date(p.createdAt).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {PAYMENT_TYPE_LABELS[p.paymentType] ?? p.paymentType}
                      {p.includesSmsSenderId && (
                        <span className="ml-1 text-xs text-slate-400">+ Sender ID</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {formatKes(p.amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                          p.paymentStatus === "success"
                            ? "bg-emerald-100 text-emerald-700"
                            : p.paymentStatus === "failed"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {p.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 pl-4 pr-5 font-mono text-xs text-slate-400">
                      {p.paystackReference}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Support ───────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <div className="flex items-start gap-4">
          <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
          <div>
            <p className="font-bold text-slate-900">Need billing help?</p>
            <p className="mt-0.5 text-sm text-slate-500">
              Our team is available on WhatsApp for any billing queries, invoice requests,
              or plan changes.
            </p>
            <a
              href="https://wa.me/254142225233?text=Hi%2C+I+need+help+with+my+FundiFlow+billing"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:underline"
            >
              Chat on WhatsApp <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
