"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { StatCard } from "@/components/admin/stat-card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  TrendingUp,
  Coins,
  Cpu,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatKes } from "@/lib/utils";
import type {
  AIAnalytics,
  AIAnalyticsBucket,
  AIAnalyticsDailyPoint,
  AIBillingRecord,
} from "@/types/ai-billing";

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 4,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 }).format(value);
}

function BucketTable({ rows, title }: { rows: AIAnalyticsBucket[]; title: string }) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-500">No data yet.</p>;
  }
  const max = Math.max(...rows.map((r) => r.totalCost), 1);
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.key}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="truncate text-slate-300">{row.key}</span>
              <span className="text-slate-500">
                {formatNumber(row.count)} req · {formatUsd(row.totalCost)}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-violet-500"
                style={{ width: `${Math.max(4, (row.totalCost / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RequestsTable({ records }: { records: AIBillingRecord[] }) {
  if (records.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-500">No data yet.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500">
            <th className="px-2 py-2">Feature</th>
            <th className="px-2 py-2">Model</th>
            <th className="px-2 py-2 text-right">Provider cost</th>
            <th className="px-2 py-2 text-right">Credits</th>
            <th className="px-2 py-2 text-left">When</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {records.map((r) => (
            <tr key={r.id} className="hover:bg-slate-800/40">
              <td className="px-2 py-2 text-xs text-slate-300">{r.feature}</td>
              <td className="px-2 py-2 font-mono text-xs text-slate-400">{r.model}</td>
              <td className="px-2 py-2 text-right font-mono text-xs text-slate-300">{formatUsd(r.providerCostUsd)}</td>
              <td className="px-2 py-2 text-right text-xs text-slate-300">{formatNumber(r.creditsCharged)}</td>
              <td className="px-2 py-2 text-xs text-slate-500">
                {new Date(r.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminAIBillingAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AIAnalytics | null>(null);
  const [days, setDays] = useState(30);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ffmanage/ai-billing/analytics?days=${days}`);
      const json = (await res.json()) as AIAnalytics;
      if (!res.ok) throw new Error("Failed to load");
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const chartData: AIAnalyticsDailyPoint[] = data
    ? [...data.daily].sort((a, b) => a.date.localeCompare(b.date))
    : [];

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-100">AI Billing Analytics</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Real-time economics derived from immutable billing records.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={d === days
                  ? "rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white"
                  : "rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800"}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {loading || !data ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
          </div>
        ) : (
          <>
            {/* Portfolio margin alert */}
            {data.summary.belowTargetMargin && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-600/50 bg-amber-950/40 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                <div>
                  <p className="font-semibold text-amber-200">AI margin below target</p>
                  <p className="mt-0.5 text-sm text-amber-300/80">
                    Portfolio margin is {data.summary.grossMarginPercent.toFixed(2)}% but the configured target is{" "}
                    {data.summary.targetMarginPercent}%. Margin is measured across ALL AI usage — small requests are never
                    distorted individually. Review pricing or the exchange rate.
                  </p>
                </div>
              </div>
            )}

            {!data.summary.belowTargetMargin && data.summary.requestCount > 0 && (
              <div className="flex items-start gap-3 rounded-xl border border-emerald-700/50 bg-emerald-950/40 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                <p className="text-sm text-emerald-300">
                  Portfolio margin {data.summary.grossMarginPercent.toFixed(2)}% meets the {data.summary.targetMarginPercent}% target.
                </p>
              </div>
            )}

            {/* Summary cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total Provider Cost"
                value={formatUsd(data.summary.totalProviderCost)}
                icon={Cpu}
                variant="warning"
              />
              <StatCard
                title="Total AI Revenue"
                value={formatKes(data.summary.totalRevenue)}
                icon={TrendingUp}
                variant="success"
              />
              <StatCard
                title="Portfolio Gross Margin"
                value={`${data.summary.grossMarginPercent.toFixed(2)}%`}
                icon={ArrowUpRight}
                variant={data.summary.belowTargetMargin ? "danger" : "success"}
              />
              <StatCard
                title="Avg Credits / Request"
                value={formatNumber(data.summary.averageCredits)}
                icon={Coins}
                variant="purple"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard title="Requests" value={formatNumber(data.summary.requestCount)} icon={Cpu} />
              <StatCard title="Avg Provider Cost" value={formatUsd(data.summary.averageProviderCost)} icon={Cpu} />
              <StatCard title="Avg Revenue / Request" value={formatKes(data.summary.averageRevenue)} icon={TrendingUp} />
            </div>

            {/* Daily spend chart */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="mb-3 font-semibold text-slate-100">Daily AI spend (last {days} days)</h2>
              {chartData.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-500">No billing records in this window.</p>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }} />
                      <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }}
                        labelStyle={{ color: "#e2e8f0" }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
                      <Bar dataKey="cost" name="Provider cost (USD)" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="revenue" name="Revenue (KES)" fill="#34d399" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <BucketTable rows={data.byFeature} title="Cost by feature" />
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <BucketTable rows={data.byProvider} title="Provider comparison" />
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <BucketTable rows={data.byModel} title="Model comparison" />
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <BucketTable rows={data.byCategory} title="Cost by category" />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <h2 className="mb-2 font-semibold text-slate-100">Top features</h2>
                <BucketTable rows={data.topFeatures} title="" />
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="font-semibold text-slate-100">Most expensive requests</h2>
                  <Badge variant="danger">Provider cost</Badge>
                </div>
                <RequestsTable records={data.mostExpensiveRequests} />
              </div>
            </div>
          </>
        )}
      </div>
    </AdminShell>
  );
}
