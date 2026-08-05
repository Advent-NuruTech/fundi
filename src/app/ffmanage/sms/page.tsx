"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/admin-shell";
import { StatCard } from "@/components/admin/stat-card";
import { SmsChart } from "@/components/admin/sms-chart";
import { Badge } from "@/components/ui/badge";
import { formatDateLabel } from "@/lib/utils";
import {
  MessageSquare,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Wallet,
  Plus,
  Trash2,
  Save,
  Loader2,
} from "lucide-react";import type { SmsBusinessStat, SmsDataPoint } from "@/types/admin";
import type { SmsPack } from "@/types/billing";

interface SmsLog {
  id: string;
  business_id: string;
  recipient_phone: string;
  message_type: string;
  status: string;
  created_at: string;
  businessName: string | null;
}

// ─── Inline form helpers ─────────────────────────────────────────────────────

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-sm text-slate-200 outline-none transition-colors focus:border-violet-500"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{label}</span>
      <input
        type="number"
        step={step}
        min={1}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-sm text-slate-200 outline-none transition-colors focus:border-violet-500"
      />
    </label>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function AdminSmsPage() {
  const [total, setTotal] = useState(0);
  const [thisMonth, setThisMonth] = useState(0);
  const [topBusinesses, setTopBusinesses] = useState<SmsBusinessStat[]>([]);
  const [trend, setTrend] = useState<SmsDataPoint[]>([]);
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [packs, setPacks] = useState<SmsPack[]>([]);
  const [packsLoading, setPacksLoading] = useState(true);
  const [packsSaving, setPacksSaving] = useState(false);

  useEffect(() => {
    fetch("/api/ffmanage/sms")
      .then((r) => r.json())
      .then((d) => {
        setTotal(d.total ?? 0);
        setThisMonth(d.thisMonth ?? 0);
        setTopBusinesses(d.topBusinesses ?? []);
        setTrend(d.trend ?? []);
        setLogs(d.logs ?? []);
      })
      .finally(() => setLoading(false));

    fetch("/api/ffmanage/sms/packs")
      .then((r) => r.json())
      .then((d) => {
        if (d?.packs) setPacks(d.packs);
      })
      .catch(() => toast.error("Could not load SMS packs"))
      .finally(() => setPacksLoading(false));
  }, []);

  const delivered = topBusinesses.reduce((s, b) => s + b.delivered, 0);
  const failed = topBusinesses.reduce((s, b) => s + b.failed, 0);

  async function handleSavePacks() {
    setPacksSaving(true);
    try {
      const res = await fetch("/api/ffmanage/sms/packs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packs }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Could not save SMS packs");
      setPacks(json.packs);
      toast.success("SMS packs updated. Live across the platform.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPacksSaving(false);
    }
  }

  return (
    <AdminShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100">SMS & Packs</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Platform-wide SMS usage, delivery tracking and the top-up packs customers buy — all
            configurable live, no redeploy.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard title="Total SMS Sent" value={total.toLocaleString()} icon={MessageSquare} variant="purple" loading={loading} />
          <StatCard title="This Month" value={thisMonth.toLocaleString()} icon={TrendingUp} loading={loading} />
          <StatCard title="Delivered" value={delivered.toLocaleString()} icon={CheckCircle2} variant="success" loading={loading} />
          <StatCard title="Failed" value={failed.toLocaleString()} icon={AlertCircle} variant="danger" loading={loading} />
        </div>

        {/* SMS packs — admin-managed, DB-backed */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400">
              <Wallet className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-100">SMS Packs</h2>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                Stored in the database — no hardcoded values. Changes go live instantly: deactivate
                a pack and it disappears from every customer&apos;s top-up screen; edit a price and
                the next purchase bills at that price.
              </p>
            </div>
          </div>

          {packsLoading ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
            </div>
          ) : (
            <div className="space-y-2">
              {packs.map((pack, index) => (
                <div key={pack.id} className="grid grid-cols-2 items-center gap-2 sm:grid-cols-5">
                  <TextField
                    label="Label"
                    value={pack.label}
                    onChange={(v) =>
                      setPacks((prev) => prev.map((p, i) => (i === index ? { ...p, label: v } : p)))
                    }
                  />
                  <NumberField
                    label="Units (SMS)"
                    value={pack.units}
                    onChange={(v) =>
                      setPacks((prev) => prev.map((p, i) => (i === index ? { ...p, units: v } : p)))
                    }
                  />
                  <NumberField
                    label="Price (KES)"
                    value={pack.priceKes}
                    onChange={(v) =>
                      setPacks((prev) => prev.map((p, i) => (i === index ? { ...p, priceKes: v } : p)))
                    }
                    step={50}
                  />
                  <label className="flex items-center gap-2 pt-5 text-xs text-slate-400">
                    <input
                      type="checkbox"
                      checked={pack.active}
                      onChange={(e) =>
                        setPacks((prev) => prev.map((p, i) => (i === index ? { ...p, active: e.target.checked } : p)))
                      }
                      className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-violet-500"
                    />
                    Active
                  </label>
                  <div className="pt-4 flex items-center justify-start">
                    <button
                      type="button"
                      onClick={() => setPacks((prev) => prev.filter((_, i) => i !== index))}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-900/30 hover:text-rose-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setPacks((prev) => [
                      ...prev,
                      { id: `pack_${Date.now()}`, label: "New pack", units: 100, priceKes: 300, active: true, sortOrder: prev.length + 1, updatedAt: null, createdAt: new Date().toISOString() },
                    ])
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                >
                  <Plus className="h-3.5 w-3.5" /> Add pack
                </button>
                <button
                  type="button"
                  onClick={handleSavePacks}
                  disabled={packsSaving}
                  className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
                >
                  {packsSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {packsSaving ? "Saving…" : "Save SMS packs"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="font-semibold text-slate-200 mb-4">Daily SMS Volume (last 30 days)</h3>
          <SmsChart data={trend} loading={loading} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Top businesses */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="font-semibold text-slate-200 mb-4">Top Businesses by SMS</h3>
            {loading ? (
              <div className="space-y-2">
                {[1,2,3,4,5].map(i => <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-800" />)}
              </div>
            ) : topBusinesses.length === 0 ? (
              <p className="text-sm text-slate-500">No SMS data</p>
            ) : (
              <div className="space-y-2">
                {topBusinesses.map((biz, i) => (
                  <div key={biz.businessId} className="flex items-center gap-3 rounded-lg bg-slate-800/60 px-3 py-2">
                    <span className="text-xs font-bold text-slate-600 w-5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{biz.businessName}</p>
                      <p className="text-xs text-slate-500">{biz.delivered} delivered • {biz.failed} failed</p>
                    </div>
                    <span className="text-sm font-bold text-violet-300">{biz.sent.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent logs */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800">
              <h3 className="font-semibold text-slate-200">Recent SMS Logs</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60">
                    <th className="px-4 py-2.5 text-left text-xs uppercase tracking-wider text-slate-500">Business</th>
                    <th className="px-4 py-2.5 text-left text-xs uppercase tracking-wider text-slate-500">Type</th>
                    <th className="px-4 py-2.5 text-left text-xs uppercase tracking-wider text-slate-500">Status</th>
                    <th className="px-4 py-2.5 text-left text-xs uppercase tracking-wider text-slate-500">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {loading ? Array.from({length: 6}).map((_,i) => (
                    <tr key={i}><td colSpan={4} className="px-4 py-2"><div className="h-4 animate-pulse rounded bg-slate-800" /></td></tr>
                  )) : logs.length === 0 ? (
                    <tr><td colSpan={4} className="py-8 text-center text-sm text-slate-500">No logs</td></tr>
                  ) : logs.slice(0, 15).map((log) => (
                    <tr key={log.id}>
                      <td className="px-4 py-2.5 text-xs text-slate-300 truncate max-w-[100px]">{log.businessName ?? "—"}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-400">{log.message_type}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant={
                          log.status === "delivered" || log.status === "success" ? "success" :
                          log.status === "failed" ? "danger" : "default"
                        }>
                          {log.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{formatDateLabel(log.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
