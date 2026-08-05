"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  MessageSquare,
  Sparkles,
  Database,
  Loader2,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  PlusCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  Info,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { formatKes } from "@/lib/billing/fees";
import { useAuth } from "@/features/auth/components/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import {
  USAGE_RESOURCE_META,
  formatUsageUnits,
  pricePerUnit,
  type TopupPackage,
} from "@/lib/billing/topup-packages";
import type {
  UsageLedgerEntry,
  UsageResource,
  UsageSummary,
  UsageTopup,
} from "@/types/billing";

// ─── Resource card config ─────────────────────────────────────────────────────

const RESOURCE_ICONS: Record<UsageResource, typeof MessageSquare> = {
  sms: MessageSquare,
  ai_credits: Sparkles,
  storage: Database,
};

interface UsageData {
  meters: UsageSummary[];
  topups: UsageTopup[];
  ledger: UsageLedgerEntry[];
  packages: TopupPackage[];
}

// ─── Helper: authenticated API call ───────────────────────────────────────────

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function sourceLabel(source: string): string {
  switch (source) {
    case "usage":
      return "Used";
    case "topup":
      return "Top-up purchased";
    case "adjustment":
      return "Adjustment";
    case "measurement":
      return "Storage measured";
    default:
      return source;
  }
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function UsageTopupsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const action = searchParams.get("action");
  const ref = searchParams.get("ref");

  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [topupResource, setTopupResource] = useState<UsageResource | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  const [processing, setProcessing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);

  const fetchUsage = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch("/api/billing/usage", { cache: "no-store" });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? "Failed to load usage");
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
      fetchUsage();
    } else {
      setLoading(false);
    }
  }, [user, fetchUsage]);

  // Post-payment polling
  useEffect(() => {
    if (!action || !ref || user?.role !== "owner") return;
    setProcessing(true);
    pollCountRef.current = 0;

    const verify = async () => {
      pollCountRef.current += 1;
      try {
        const res = await apiFetch("/api/billing/topup/verify", {
          method: "POST",
          body: JSON.stringify({ reference: ref }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.verified) {
            if (pollRef.current) clearInterval(pollRef.current);
            setProcessing(false);
            toast.success("Top-up confirmed — credits added to your balance");
            fetchUsage();
            return;
          }
        }
      } catch {
        // keep polling
      }
      if (pollCountRef.current >= 15) {
        if (pollRef.current) clearInterval(pollRef.current);
        setProcessing(false);
      }
    };

    verify();
    pollRef.current = setInterval(verify, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, ref, user]);

  if (user?.role !== "owner") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <Receipt className="h-12 w-12 text-slate-300" />
        <h2 className="text-xl font-bold text-slate-900">Usage is owner-only</h2>
        <p className="text-slate-500">Only the workspace owner can view usage and buy top-ups.</p>
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
        <h2 className="text-xl font-bold text-slate-900">Failed to load usage</h2>
        <p className="text-sm text-slate-500">{error}</p>
        <Button onClick={fetchUsage} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  const meters = data?.meters ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Usage & Top-ups</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Your plan gives you a monthly allowance of SMS and AI credits plus storage. When you
            run out, buy more right here — you are credited <strong>exactly</strong> what you pay
            for, and every unit is tracked transparently below.
          </p>
        </div>
        {processing && (
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Confirming your payment…
          </span>
        )}
      </div>

      {/* ── Resource cards ──────────────────────────────────────────────────── */}
      <div className="grid gap-5 md:grid-cols-3">
        {meters.map((meter) => (
          <ResourceCard
            key={meter.resource}
            meter={meter}
            onBuy={() => {
              setTopupResource(meter.resource);
              setSelectedPackage(null);
            }}
          />
        ))}
      </div>

      {/* ── Top-up history ──────────────────────────────────────────────────── */}
      {(data?.topups.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top-up purchases</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {(data?.topups ?? []).map((t) => (
                <div key={t.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <ArrowUpCircle className="h-4 w-4 text-emerald-600" />
                    <div>
                      <p className="font-medium text-slate-900">
                        {USAGE_RESOURCE_META[t.resource].name}{" "}
                        <span className="text-slate-500">· {formatUsageUnits(t.resource, t.units)} {USAGE_RESOURCE_META[t.resource].pluralLabel}</span>
                      </p>
                      <p className="text-xs text-slate-400">{formatDate(t.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-600">{formatKes(t.amountKes)}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        t.status === "success"
                          ? "bg-emerald-50 text-emerald-700"
                          : t.status === "pending"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Ledger (full transparency) ──────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Usage ledger</CardTitle>
          <p className="text-xs text-slate-400">
            Every unit bought or used, with the exact balance after each event.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {(data?.ledger.length ?? 0) === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">
              No usage recorded yet. Send an SMS or use the AI Assistant to see activity here.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {(data?.ledger ?? []).map((entry) => {
                const meta = USAGE_RESOURCE_META[entry.resource];
                return (
                  <div key={entry.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                    <div className="flex items-center gap-3">
                      {entry.units >= 0 ? (
                        <ArrowUpCircle className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <ArrowDownCircle className="h-4 w-4 text-rose-500" />
                      )}
                      <div>
                        <p className="text-slate-900">
                          <span className="font-medium">{sourceLabel(entry.source)}</span>
                          <span className="text-slate-500"> · {meta.name}</span>
                        </p>
                        <p className="text-xs text-slate-400">{formatDate(entry.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${entry.units >= 0 ? "text-emerald-700" : "text-slate-700"}`}>
                        {entry.units >= 0 ? "+" : ""}{formatUsageUnits(entry.resource, Math.abs(entry.units))} {meta.pluralLabel}
                      </p>
                      <p className="text-xs text-slate-400">Balance: {formatUsageUnits(entry.resource, entry.balanceAfter)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Top-up modal ────────────────────────────────────────────────────── */}
      {topupResource && (
        <TopupModal
          resource={topupResource}
          packages={(data?.packages ?? []).filter((p) => p.resource === topupResource)}
          selected={selectedPackage}
          onSelect={setSelectedPackage}
          open={true}
          loading={purchasing}
          onClose={() => {
            if (!purchasing) setTopupResource(null);
          }}
          onBuy={async () => {
            if (!selectedPackage) return;
            setPurchasing(true);
            try {
              const res = await apiFetch("/api/billing/topup", {
                method: "POST",
                body: JSON.stringify({ resource: topupResource, packageId: selectedPackage }),
              });
              const json = await res.json();
              if (!res.ok) {
                toast.error(json.error ?? "Could not start payment");
                return;
              }
              window.location.href = json.authorizationUrl;
            } catch {
              toast.error("An unexpected error occurred");
            } finally {
              setPurchasing(false);
            }
          }}
        />
      )}
    </div>
  );
}

// ─── Resource card ────────────────────────────────────────────────────────────

function ResourceCard({
  meter,
  onBuy,
}: {
  meter: UsageSummary;
  onBuy: () => void;
}) {
  const meta = USAGE_RESOURCE_META[meter.resource];
  const Icon = RESOURCE_ICONS[meter.resource];

  const usedPct =
    !meter.unlimited && meter.quota > 0
      ? Math.min(100, (meter.used / meter.quota) * 100)
      : 0;
  const low = !meter.unlimited && meter.quota > 0 && usedPct >= 90;
  const hasPurchased = meter.topUpCredits > 0;

  return (
    <Card className={low ? "border-amber-300" : ""}>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-2.5">
              <Icon className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <p className="font-bold text-slate-900">{meta.name}</p>
              <p className="text-xs text-slate-400">{meta.description}</p>
            </div>
          </div>
        </div>

        <div>
          <p className="text-3xl font-bold text-slate-900">
            {formatUsageUnits(meter.resource, meter.available)}
            <span className="ml-1.5 text-sm font-normal text-slate-400">{meta.pluralLabel} left</span>
          </p>
        </div>

        <div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all ${low ? "bg-amber-500" : "bg-emerald-500"}`}
              style={{ width: `${usedPct}%` }}
            />
          </div>
          <div className="mt-2 flex flex-wrap justify-between text-xs text-slate-500">
            {meter.unlimited ? (
              <span className="font-medium text-emerald-700">Unlimited plan allowance</span>
            ) : (
              <span>
                {formatUsageUnits(meter.resource, meter.used)} of {formatUsageUnits(meter.resource, meter.quota)} used
                {meter.resetsCycle && meter.cycleEnd ? (
                  <span> · resets {formatDate(meter.cycleEnd)}</span>
                ) : null}
              </span>
            )}
            {hasPurchased && (
              <span className="font-medium text-emerald-700">
                +{formatUsageUnits(meter.resource, meter.topUpCredits)} purchased
              </span>
            )}
          </div>
        </div>

        <Button onClick={onBuy} variant={low ? "default" : "outline"} className="w-full gap-2">
          <PlusCircle className="h-4 w-4" /> Buy more
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Top-up modal ─────────────────────────────────────────────────────────────

function TopupModal({
  resource,
  packages,
  selected,
  onSelect,
  open,
  loading,
  onClose,
  onBuy,
}: {
  resource: UsageResource;
  packages: TopupPackage[];
  selected: string | null;
  onSelect: (id: string) => void;
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onBuy: () => void;
}) {
  const meta = USAGE_RESOURCE_META[resource];
  const chosen = packages.find((p) => p.id === selected);

  return (
    <Dialog open={open} onClose={onClose} title={`Buy more ${meta.name}`}>
      <div className="space-y-4 p-5">
        <div className="flex items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Pay once, get <strong>exactly</strong> what you pay for — the credits are added to your
            balance immediately after payment and never expire.
          </span>
        </div>

        <div className="space-y-3">
          {packages.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                selected === p.id
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">{p.label}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {pricePerUnit(p.resource, p.units, p.priceKes)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-900">{formatKes(p.priceKes)}</span>
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                      selected === p.id ? "border-emerald-500 bg-emerald-500" : "border-slate-300"
                    }`}
                  >
                    {selected === p.id && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {chosen && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <div className="flex items-center justify-between font-semibold text-slate-900">
              <span>You pay today</span>
              <span>{formatKes(chosen.priceKes)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
              <span>You receive</span>
              <span>
                {formatUsageUnits(chosen.resource, chosen.units)} {meta.pluralLabel}
              </span>
            </div>
            <p className="mt-1.5 text-xs text-slate-400">
              Payment via Paystack (card, M-Pesa or bank). The exact units above are credited to
              your balance the moment payment confirms.
            </p>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 flex gap-3 border-t border-slate-100 bg-white p-5">
        <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button className="flex-1 gap-2" onClick={onBuy} disabled={!selected || loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Info className="h-4 w-4" />}
          {loading ? "Redirecting…" : "Pay via Paystack"}
        </Button>
      </div>
    </Dialog>
  );
}
