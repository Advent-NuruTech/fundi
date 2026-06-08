"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CreditCard,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Receipt,
  Loader2,
  RefreshCw,
  Scissors,
  MessageSquare,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Ban,
  RotateCcw,
  Sparkles,
  Shield,
  MessageCircle,
  ChevronRight,
  Info,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatKes } from "@/lib/billing/fees";
import { SMS_SENDER_ID_PRICE, PLAN_CONFIGS } from "@/lib/billing/constants";
import { useAuth } from "@/features/auth/components/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { PlanBadge } from "@/components/billing/plan-badge";
import type { BillingPortalData, PlanSlug, Subscription } from "@/types/billing";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  active:          { label: "Active",          color: "text-emerald-700 bg-emerald-100 border-emerald-200",  icon: CheckCircle2 },
  pending_payment: { label: "Pending Payment", color: "text-amber-700   bg-amber-100   border-amber-200",    icon: Clock },
  past_due:        { label: "Past Due",        color: "text-rose-700    bg-rose-100    border-rose-200",     icon: AlertCircle },
  cancelled:       { label: "Cancelled",       color: "text-slate-600   bg-slate-100   border-slate-200",    icon: XCircle },
  suspended:       { label: "Suspended",       color: "text-orange-700  bg-orange-100  border-orange-200",   icon: XCircle },
} as const;

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  installation_fee:    "Installation Fee",
  monthly_subscription: "Monthly Subscription",
  sms_sender_id:       "Custom SMS Sender ID",
  upgrade:             "Plan Upgrade",
  renewal:             "Subscription Renewal",
};

const SENDER_ID_STATUS_CONFIG = {
  none:             { label: "Not purchased",          color: "text-slate-500" },
  pending_payment:  { label: "Awaiting payment",       color: "text-amber-600" },
  pending_approval: { label: "Pending admin approval", color: "text-amber-600" },
  approved:         { label: "Active",                 color: "text-emerald-700" },
  rejected:         { label: "Rejected",               color: "text-rose-700" },
} as const;

const AUDIT_ACTION_LABELS: Record<string, string> = {
  subscription_activated:    "Subscription activated",
  plan_upgraded:             "Plan upgraded",
  downgrade_scheduled:       "Downgrade scheduled",
  downgrade_cancelled:       "Downgrade cancelled",
  cancellation_scheduled:    "Cancellation scheduled",
  cancellation_reversed:     "Cancellation reversed",
  sender_id_payment_completed: "Sender ID payment completed",
  subscription_renewed:      "Subscription renewed",
};

// ─── Plan ranking ─────────────────────────────────────────────────────────────

const PLAN_RANK: Record<string, number> = { sindano: 1, fundi: 2, dhahabu: 3 };

// ─── Helper: get auth token ───────────────────────────────────────────────────

async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

// ─── Helper: authenticated API call ──────────────────────────────────────────

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getToken();
  return fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BillingDashboardPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const action = searchParams.get("action");
  const ref = searchParams.get("ref");

  const [data, setData] = useState<BillingPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Post-payment polling state
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const paymentPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const paymentPollCountRef = useRef(0);

  // Modal state
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [downgradeOpen, setDowngradeOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [uncancelOpen, setUncancelOpen] = useState(false);
  const [senderIdOpen, setSenderIdOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const [cancelDowngradeOpen, setCancelDowngradeOpen] = useState(false);

  const fetchPortal = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch("/api/billing/portal", { cache: "no-store" });
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

  // Handle post-payment redirect with polling
  useEffect(() => {
    if (!action || !ref || user?.role !== "owner") return;
    setPaymentProcessing(true);
    paymentPollCountRef.current = 0;

    paymentPollRef.current = setInterval(async () => {
      paymentPollCountRef.current += 1;
      try {
        const res = await apiFetch("/api/billing/portal", { cache: "no-store" });
        if (res.ok) {
          const fresh = await res.json() as BillingPortalData;
          setData(fresh);
          // Stop polling once we detect the payment was processed
          const processed = detectPaymentProcessed(action, ref, fresh.subscription, fresh.payments ?? []);
          if (processed || paymentPollCountRef.current >= 15) {
            clearInterval(paymentPollRef.current!);
            setPaymentProcessing(false);
          }
        }
      } catch {
        if (paymentPollCountRef.current >= 15) {
          clearInterval(paymentPollRef.current!);
          setPaymentProcessing(false);
        }
      }
    }, 3000);

    return () => {
      if (paymentPollRef.current) clearInterval(paymentPollRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, ref]);

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

  const { subscription, payments, plan, auditLogs } = data ?? {};
  const currentPlanSlug = subscription?.planSlug;
  const currentRank = currentPlanSlug ? (PLAN_RANK[currentPlanSlug] ?? 0) : 0;

  const statusCfg = subscription?.status
    ? STATUS_CONFIG[subscription.status] ?? STATUS_CONFIG.active
    : null;
  const StatusIcon = statusCfg?.icon ?? CheckCircle2;

  const nextBillingDate = subscription?.nextBillingDate
    ? new Date(subscription.nextBillingDate).toLocaleDateString("en-KE", {
        year: "numeric", month: "long", day: "numeric",
      })
    : null;

  const periodEndDate = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString("en-KE", {
        year: "numeric", month: "long", day: "numeric",
      })
    : null;

  const pendingPlanConfig = subscription?.pendingPlanSlug
    ? PLAN_CONFIGS[subscription.pendingPlanSlug as Exclude<PlanSlug, "custom">] ?? null
    : null;

  const pendingChangeDate = subscription?.pendingChangeAt
    ? new Date(subscription.pendingChangeAt).toLocaleDateString("en-KE", {
        year: "numeric", month: "long", day: "numeric",
      })
    : null;

  const senderIdCfg = subscription?.smsSenderIdStatus
    ? SENDER_ID_STATUS_CONFIG[subscription.smsSenderIdStatus] ?? SENDER_ID_STATUS_CONFIG.none
    : SENDER_ID_STATUS_CONFIG.none;

  return (
    <div className="space-y-8 pb-12">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Billing & Subscription</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your plan, invoices, and billing preferences.
          </p>
        </div>
        <Button onClick={fetchPortal} variant="outline" size="sm" className="gap-2" disabled={paymentProcessing}>
          <RefreshCw className={`h-3.5 w-3.5 ${paymentProcessing ? "animate-spin" : ""}`} />
          {paymentProcessing ? "Processing…" : "Refresh"}
        </Button>
      </div>

      {/* ── Post-payment banner ───────────────────────────────────────────── */}
      {paymentProcessing && action && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-600 shrink-0" />
          <div>
            <p className="font-semibold text-emerald-900">Payment received — activating your changes…</p>
            <p className="text-sm text-emerald-700">
              {action === "upgrade" && "Your plan upgrade is being activated. This takes a few seconds."}
              {action === "sender_id" && "Your SMS Sender ID payment is confirmed. Awaiting admin approval."}
              {action === "renewal" && "Your subscription renewal is being processed."}
            </p>
          </div>
        </div>
      )}

      {/* ── No subscription ───────────────────────────────────────────────── */}
      {!subscription || !plan ? (
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
      ) : (
        <>
          {/* ── Status indicators ─────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-2">
            {/* Base subscription status */}
            {statusCfg && (
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${statusCfg.color}`}>
                <StatusIcon className="h-3.5 w-3.5" />
                {statusCfg.label}
              </span>
            )}
            {/* Cancel scheduled */}
            {subscription.cancelAtPeriodEnd && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                <Ban className="h-3.5 w-3.5" />
                Cancel scheduled {periodEndDate ? `— ends ${periodEndDate}` : ""}
              </span>
            )}
            {/* Pending downgrade */}
            {subscription.pendingPlanSlug && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                <TrendingDown className="h-3.5 w-3.5" />
                Downgrade to {pendingPlanConfig?.name ?? subscription.pendingPlanSlug} on {pendingChangeDate ?? "period end"}
              </span>
            )}
            {/* Sender ID pending approval */}
            {subscription.smsSenderIdStatus === "pending_approval" && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                <MessageSquare className="h-3.5 w-3.5" />
                Sender ID pending approval
              </span>
            )}
          </div>

          {/* ── Current plan cards ────────────────────────────────────────── */}
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
                </div>
                <p className="mt-3 text-2xl font-black text-slate-900">
                  {formatKes(plan.monthlyPrice)}
                  <span className="text-sm font-normal text-slate-400">/month</span>
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Installation fee paid ✓
                </p>
                {subscription.smsSenderIdStatus === "approved" && (
                  <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" />
                    Custom Sender ID: {subscription.smsSenderIdName}
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
                      {subscription.cancelAtPeriodEnd
                        ? "Subscription ends — no renewal charge"
                        : subscription.pendingPlanSlug
                        ? `${formatKes(pendingPlanConfig?.monthlyPrice ?? plan.monthlyPrice)} (after downgrade)`
                        : `${formatKes(plan.monthlyPrice)} will be charged`}
                    </p>
                    {subscription.cancelAtPeriodEnd && periodEndDate && (
                      <p className="mt-1 text-xs text-rose-600 font-medium">
                        Access ends: {periodEndDate}
                      </p>
                    )}
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
                <p className={`text-sm font-semibold ${senderIdCfg.color}`}>
                  {senderIdCfg.label}
                </p>
                {subscription.smsSenderIdName && (
                  <p className="mt-0.5 text-xs text-slate-500">
                    Requested ID: <span className="font-mono font-bold">{subscription.smsSenderIdName}</span>
                  </p>
                )}
                {subscription.smsSenderIdStatus === "none" && (
                  <>
                    <p className="mt-1 text-xs text-slate-400">
                      Use your business name instead of a generic number.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 h-7 gap-1 text-xs"
                      onClick={() => setSenderIdOpen(true)}
                    >
                      Purchase — {formatKes(SMS_SENDER_ID_PRICE)}
                      <ArrowUpRight className="h-3 w-3" />
                    </Button>
                  </>
                )}
                {subscription.smsSenderIdStatus === "rejected" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 h-7 gap-1 text-xs text-rose-600"
                    onClick={() => setSenderIdOpen(true)}
                  >
                    Request a new Sender ID
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Plan actions ──────────────────────────────────────────────── */}
          {subscription.status === "active" && (
            <div>
              <h2 className="mb-3 text-lg font-bold text-slate-900">Manage subscription</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {/* Upgrade */}
                {currentRank < 3 && !subscription.cancelAtPeriodEnd && (
                  <button
                    onClick={() => setUpgradeOpen(true)}
                    className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left text-sm font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Upgrade plan
                    </span>
                    <ChevronRight className="h-4 w-4 text-emerald-600" />
                  </button>
                )}

                {/* Downgrade */}
                {currentRank > 1 && !subscription.cancelAtPeriodEnd && !subscription.pendingPlanSlug && (
                  <button
                    onClick={() => setDowngradeOpen(true)}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4" />
                      Downgrade plan
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>
                )}

                {/* Cancel pending downgrade */}
                {subscription.pendingPlanSlug && (
                  <button
                    onClick={() => setCancelDowngradeOpen(true)}
                    className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-sm font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <RotateCcw className="h-4 w-4" />
                      Keep current plan
                    </span>
                    <ChevronRight className="h-4 w-4 text-amber-600" />
                  </button>
                )}

                {/* Cancel subscription */}
                {!subscription.cancelAtPeriodEnd && (
                  <button
                    onClick={() => setCancelOpen(true)}
                    className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-4 text-left text-sm font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Ban className="h-4 w-4" />
                      Cancel subscription
                    </span>
                    <ChevronRight className="h-4 w-4 text-rose-500" />
                  </button>
                )}

                {/* Reverse scheduled cancellation */}
                {subscription.cancelAtPeriodEnd && (
                  <button
                    onClick={() => setUncancelOpen(true)}
                    className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left text-sm font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <RotateCcw className="h-4 w-4" />
                      Keep subscription
                    </span>
                    <ChevronRight className="h-4 w-4 text-emerald-600" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Renew expired / past-due */}
          {(subscription.status === "past_due" || subscription.status === "cancelled") && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div className="flex-1">
                  <p className="font-bold text-amber-900">
                    {subscription.status === "past_due" ? "Payment overdue" : "Subscription ended"}
                  </p>
                  <p className="mt-0.5 text-sm text-amber-800">
                    Renew to restore full access. Your data is safe.
                  </p>
                </div>
                <Button size="sm" onClick={() => setRenewOpen(true)} className="shrink-0 gap-1.5">
                  <CreditCard className="h-3.5 w-3.5" />
                  Renew
                </Button>
              </div>
            </div>
          )}

          {/* ── Payment history ───────────────────────────────────────────── */}
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

          {/* ── Audit log ─────────────────────────────────────────────────── */}
          {auditLogs && auditLogs.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-bold text-slate-900">Activity log</h2>
              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-2.5">
                    <div className="flex items-center gap-2 text-sm">
                      <Shield className="h-3.5 w-3.5 text-slate-400" />
                      <span className="font-medium text-slate-700">
                        {AUDIT_ACTION_LABELS[log.action] ?? log.action}
                      </span>
                      {log.performedByRole && (
                        <span className="text-xs text-slate-400">by {log.performedByRole}</span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(log.createdAt).toLocaleDateString("en-KE", {
                        year: "numeric", month: "short", day: "numeric",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Support (WhatsApp — for assistance only, not billing actions) ── */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <div className="flex items-start gap-4">
          <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
          <div>
            <p className="font-bold text-slate-900">Need help?</p>
            <p className="mt-0.5 text-sm text-slate-500">
              Contact our team on WhatsApp for billing questions, invoice copies, or technical support.
              All plan changes are now managed directly in this portal.
            </p>
            <a
              href="https://wa.me/254142225233?text=Hi%2C+I+need+help+with+my+FundiFlow+billing"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:underline"
            >
              Chat with support <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* ═══ MODALS ════════════════════════════════════════════════════════════ */}

      {subscription && plan && (
        <>
          <UpgradePlanModal
            open={upgradeOpen}
            onClose={() => setUpgradeOpen(false)}
            currentRank={currentRank}
          />

          <DowngradePlanModal
            open={downgradeOpen}
            onClose={() => setDowngradeOpen(false)}
            currentRank={currentRank}
            periodEndDate={periodEndDate}
            onSuccess={(newSlug, changeAt) => {
              setDowngradeOpen(false);
              setData((prev) =>
                prev
                  ? {
                      ...prev,
                      subscription: {
                        ...prev.subscription,
                        pendingPlanSlug: newSlug as PlanSlug,
                        pendingChangeAt: changeAt,
                      },
                    }
                  : prev
              );
            }}
          />

          <CancelDowngradeModal
            open={cancelDowngradeOpen}
            onClose={() => setCancelDowngradeOpen(false)}
            pendingPlanSlug={subscription.pendingPlanSlug}
            onSuccess={() => {
              setCancelDowngradeOpen(false);
              setData((prev) =>
                prev
                  ? {
                      ...prev,
                      subscription: {
                        ...prev.subscription,
                        pendingPlanSlug: null,
                        pendingChangeAt: null,
                      },
                    }
                  : prev
              );
            }}
          />

          <CancelModal
            open={cancelOpen}
            onClose={() => setCancelOpen(false)}
            periodEndDate={periodEndDate}
            onSuccess={() => {
              setCancelOpen(false);
              setData((prev) =>
                prev
                  ? {
                      ...prev,
                      subscription: {
                        ...prev.subscription,
                        cancelAtPeriodEnd: true,
                      },
                    }
                  : prev
              );
            }}
          />

          <UncancelModal
            open={uncancelOpen}
            onClose={() => setUncancelOpen(false)}
            onSuccess={() => {
              setUncancelOpen(false);
              setData((prev) =>
                prev
                  ? {
                      ...prev,
                      subscription: {
                        ...prev.subscription,
                        cancelAtPeriodEnd: false,
                        cancelReason: null,
                      },
                    }
                  : prev
              );
            }}
          />

          <SenderIdModal
            open={senderIdOpen}
            onClose={() => setSenderIdOpen(false)}
          />

          <RenewModal
            open={renewOpen}
            onClose={() => setRenewOpen(false)}
            plan={plan}
          />
        </>
      )}
    </div>
  );
}

// ─── Helper: detect if payment was processed ─────────────────────────────────

function detectPaymentProcessed(
  action: string,
  ref: string,
  subscription: Subscription | undefined,
  payments: BillingPortalData["payments"]
): boolean {
  if (!subscription) return false;
  const matchingPayment = payments?.find(
    (p) => p.paystackReference === ref && p.paymentStatus === "success"
  );
  if (matchingPayment) return true;
  if (action === "upgrade" && subscription.pendingPlanSlug === null) return true;
  if (action === "sender_id" && subscription.smsSenderIdStatus === "pending_approval") return true;
  if (action === "renewal" && subscription.status === "active") return true;
  return false;
}

// ─── Upgrade Plan Modal ───────────────────────────────────────────────────────

function UpgradePlanModal({
  open,
  onClose,
  currentRank,
}: {
  open: boolean;
  onClose: () => void;
  currentRank: number;
}) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upgradePlans = Object.values(PLAN_CONFIGS).filter(
    (p) => (PLAN_RANK[p.slug] ?? 0) > currentRank
  );

  async function handleUpgrade() {
    if (!selectedPlan) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/billing/upgrade", {
        method: "POST",
        body: JSON.stringify({ newPlanSlug: selectedPlan }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Upgrade failed"); return; }
      window.location.href = json.authorizationUrl;
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Upgrade your plan">
      <div className="space-y-4 p-1">
        <p className="text-sm text-slate-600">
          Select a plan to upgrade to. You will be charged the new plan&apos;s full monthly price and your billing period resets from today.
        </p>

        <div className="space-y-3">
          {upgradePlans.map((p) => (
            <button
              key={p.slug}
              onClick={() => setSelectedPlan(p.slug)}
              className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                selectedPlan === p.slug
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">{p.name} <span className="text-slate-400 font-normal">— {p.swahiliName}</span></p>
                  <p className="text-sm text-slate-500 mt-0.5">{formatKes(p.monthlyPrice)}/month</p>
                </div>
                <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                  selectedPlan === p.slug ? "border-emerald-500 bg-emerald-500" : "border-slate-300"
                }`}>
                  {selectedPlan === p.slug && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {p.features.analytics && <FeaturePill label="Analytics" />}
                {p.features.teamManagement && <FeaturePill label="Team management" />}
                {p.features.multiLocation && <FeaturePill label="Multi-location" />}
                {p.features.apiAccess && <FeaturePill label="API access" />}
                {p.limits.maxUsers === null && <FeaturePill label="Unlimited users" />}
              </div>
            </button>
          ))}
        </div>

        {selectedPlan && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <div className="flex items-center justify-between font-semibold text-slate-900">
              <span>Charge today</span>
              <span>{formatKes(PLAN_CONFIGS[selectedPlan as Exclude<PlanSlug, "custom">]?.monthlyPrice ?? 0)}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Payment via Paystack. Billing period resets from today for {60} days.
            </p>
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            className="flex-1 gap-2"
            onClick={handleUpgrade}
            disabled={!selectedPlan || loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
            {loading ? "Redirecting…" : "Upgrade & Pay"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

// ─── Downgrade Plan Modal ─────────────────────────────────────────────────────

function DowngradePlanModal({
  open,
  onClose,
  currentRank,
  periodEndDate,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  currentRank: number;
  periodEndDate: string | null;
  onSuccess: (newSlug: string, changeAt: string) => void;
}) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downgradePlans = Object.values(PLAN_CONFIGS).filter(
    (p) => (PLAN_RANK[p.slug] ?? 0) < currentRank
  );

  async function handleDowngrade() {
    if (!selectedPlan) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/billing/downgrade", {
        method: "POST",
        body: JSON.stringify({ newPlanSlug: selectedPlan }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Downgrade failed"); return; }
      onSuccess(json.pendingPlanSlug, json.pendingChangeAt);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Schedule a downgrade">
      <div className="space-y-4 p-1">
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Downgrades take effect at the end of your current billing period
            {periodEndDate ? ` (${periodEndDate})` : ""}. You keep full access until then.
          </span>
        </div>

        <div className="space-y-3">
          {downgradePlans.map((p) => (
            <button
              key={p.slug}
              onClick={() => setSelectedPlan(p.slug)}
              className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                selectedPlan === p.slug
                  ? "border-slate-500 bg-slate-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">{p.name} <span className="text-slate-400 font-normal">— {p.swahiliName}</span></p>
                  <p className="text-sm text-slate-500 mt-0.5">{formatKes(p.monthlyPrice)}/month</p>
                </div>
                <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                  selectedPlan === p.slug ? "border-slate-600 bg-slate-600" : "border-slate-300"
                }`}>
                  {selectedPlan === p.slug && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                </div>
              </div>
            </button>
          ))}
        </div>

        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            className="flex-1 gap-2 bg-slate-700 hover:bg-slate-800"
            onClick={handleDowngrade}
            disabled={!selectedPlan || loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingDown className="h-4 w-4" />}
            {loading ? "Scheduling…" : "Schedule downgrade"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

// ─── Cancel Downgrade Modal ───────────────────────────────────────────────────

function CancelDowngradeModal({
  open,
  onClose,
  pendingPlanSlug,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  pendingPlanSlug: PlanSlug | null;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingConfig = pendingPlanSlug
    ? PLAN_CONFIGS[pendingPlanSlug as Exclude<PlanSlug, "custom">]
    : null;

  async function handleCancel() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/billing/cancel-downgrade", { method: "POST" });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed"); return; }
      onSuccess();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Cancel scheduled downgrade">
      <div className="space-y-4 p-1">
        <p className="text-sm text-slate-600">
          You have a downgrade to <strong>{pendingConfig?.name ?? pendingPlanSlug}</strong> scheduled. Cancel it to stay on your current plan.
        </p>
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
            Back
          </Button>
          <Button className="flex-1 gap-2" onClick={handleCancel} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            {loading ? "Cancelling…" : "Keep current plan"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

// ─── Cancel Subscription Modal ────────────────────────────────────────────────

function CancelModal({
  open,
  onClose,
  periodEndDate,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  periodEndDate: string | null;
  onSuccess: () => void;
}) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/billing/cancel", {
        method: "POST",
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Cancellation failed"); return; }
      onSuccess();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Cancel subscription">
      <div className="space-y-4 p-1">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <p className="font-semibold">What happens when you cancel:</p>
          <ul className="mt-2 space-y-1 text-slate-600 list-disc list-inside">
            <li>Access continues until the end of your current billing period
              {periodEndDate ? ` (${periodEndDate})` : ""}.</li>
            <li>No further charges will be made.</li>
            <li>Your data is preserved — you can resubscribe anytime.</li>
          </ul>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Reason for cancelling <span className="text-slate-400">(optional)</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Tell us why you're leaving…"
            rows={3}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
            Keep subscription
          </Button>
          <Button
            className="flex-1 gap-2 bg-rose-600 hover:bg-rose-700 text-white border-0"
            onClick={handleCancel}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
            {loading ? "Cancelling…" : "Yes, cancel"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

// ─── Reverse Cancellation Modal ───────────────────────────────────────────────

function UncancelModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUncancel() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/billing/uncancel", { method: "POST" });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to reverse cancellation"); return; }
      onSuccess();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Keep your subscription">
      <div className="space-y-4 p-1">
        <p className="text-sm text-slate-600">
          Changed your mind? We&apos;ll remove the cancellation and your subscription will continue as normal at the next billing date.
        </p>
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
            Never mind
          </Button>
          <Button className="flex-1 gap-2" onClick={handleUncancel} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            {loading ? "Reversing…" : "Keep subscription"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

// ─── SMS Sender ID Modal ──────────────────────────────────────────────────────

function SenderIdModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [senderIdName, setSenderIdName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = /^[A-Za-z0-9]{3,11}$/.test(senderIdName);

  async function handlePurchase() {
    if (!isValid) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/billing/sender-id", {
        method: "POST",
        body: JSON.stringify({ senderIdName }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Payment initiation failed"); return; }
      window.location.href = json.authorizationUrl;
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Purchase Custom SMS Sender ID">
      <div className="space-y-4 p-1">
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <p className="font-semibold mb-1">Your SMS messages will show your business name</p>
          <p className="text-blue-700">
            Instead of a random number, your customers see{" "}
            <span className="font-mono font-bold">{senderIdName || "YourBiz"}</span> when you send SMS.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Desired Sender ID
          </label>
          <input
            type="text"
            value={senderIdName}
            onChange={(e) => setSenderIdName(e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 11))}
            placeholder="e.g. FundiFlow"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <p className="mt-1 text-xs text-slate-500">
            3–11 alphanumeric characters only. No spaces or special characters.
            {senderIdName.length > 0 && (
              <span className={`ml-1 font-medium ${isValid ? "text-emerald-600" : "text-rose-500"}`}>
                {senderIdName.length}/11 chars
                {isValid ? " ✓" : " — must be 3–11 chars, letters and numbers only"}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-start gap-2 text-sm text-slate-600">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <span>
            After payment, your Sender ID will be reviewed by our team (usually within 1–2 business days).
            You&apos;ll be notified once it&apos;s approved.
          </span>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <div className="flex items-center justify-between font-semibold text-slate-900">
            <span>One-time fee</span>
            <span>{formatKes(SMS_SENDER_ID_PRICE)}</span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">Paid via Paystack. No recurring charge.</p>
        </div>

        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            className="flex-1 gap-2"
            onClick={handlePurchase}
            disabled={!isValid || loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
            {loading ? "Redirecting…" : `Pay ${formatKes(SMS_SENDER_ID_PRICE)}`}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

// ─── Renew Modal ──────────────────────────────────────────────────────────────

function RenewModal({
  open,
  onClose,
  plan,
}: {
  open: boolean;
  onClose: () => void;
  plan: BillingPortalData["plan"];
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRenew() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/billing/renew", { method: "POST" });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Renewal initiation failed"); return; }
      window.location.href = json.authorizationUrl;
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  if (!plan) return null;

  return (
    <Dialog open={open} onClose={onClose} title="Renew subscription">
      <div className="space-y-4 p-1">
        <p className="text-sm text-slate-600">
          Renew your <strong>{plan.name}</strong> plan to restore full dashboard access.
          Your billing period will reset from today for 60 days.
        </p>

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <div className="flex items-center justify-between font-semibold text-slate-900">
            <span>Renewal amount</span>
            <span>{formatKes(plan.monthlyPrice)}</span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">Paid via Paystack. Billing period: 60 days from today.</p>
        </div>

        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button className="flex-1 gap-2" onClick={handleRenew} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            {loading ? "Redirecting…" : "Renew & Pay"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

// ─── Feature pill ─────────────────────────────────────────────────────────────

function FeaturePill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
      {label}
    </span>
  );
}
