"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Lock,
  ShieldCheck,
} from "lucide-react";
import type { AIBillingRecord } from "@/types/ai-billing";

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 6,
  }).format(value);
}

function formatKes(value: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function AdminAIBillingRecordsPage() {
  const [records, setRecords] = useState<AIBillingRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [providerFilter, setProviderFilter] = useState("");
  const [featureFilter, setFeatureFilter] = useState("");
  const [featureInput, setFeatureInput] = useState("");
  const [loading, setLoading] = useState(true);
  const LIMIT = 25;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(LIMIT),
      provider: providerFilter,
      feature: featureFilter,
    });
    try {
      const res = await fetch(`/api/ffmanage/ai-billing/records?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error("Failed to load");
      setRecords(json.records ?? []);
      setTotal(json.total ?? 0);
    } catch {
      setRecords([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, providerFilter, featureFilter]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <AdminShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100">AI Billing Records</h1>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Immutable, append-only audit trail. Records are never deleted or modified.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Filter by feature key…"
              value={featureInput}
              onChange={(e) => setFeatureInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setFeatureFilter(featureInput)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-9 pr-4 text-sm text-slate-200 placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
            />
          </div>
          <select
            value={providerFilter}
            onChange={(e) => { setProviderFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-violet-500 focus:outline-none"
          >
            <option value="">All providers</option>
            <option value="openai">OpenAI</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Feature</th>
                  <th className="px-4 py-3">Model</th>
                  <th className="px-4 py-3 text-right">Tokens</th>
                  <th className="px-4 py-3 text-right">Provider cost</th>
                  <th className="px-4 py-3 text-right">Rate</th>
                  <th className="px-4 py-3 text-right">Cost (KES)</th>
                  <th className="px-4 py-3 text-right">Credits</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900">
                {loading ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}><td colSpan={9} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-slate-800" /></td></tr>
                )) : records.length === 0 ? (
                  <tr><td colSpan={9} className="py-12 text-center text-sm text-slate-500">No billing records yet.</td></tr>
                ) : records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40">
                    <td className="px-4 py-2.5 text-xs text-slate-500">
                      {new Date(r.createdAt).toLocaleString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="text-xs font-medium text-slate-300">{r.feature}</p>
                      <p className="text-[10px] text-slate-500">{r.featureCategory ?? "uncategorized"}</p>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{r.model}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-400">
                      {r.inputTokens.toLocaleString()} in
                      <span className="text-slate-600"> / </span>
                      {r.outputTokens.toLocaleString()} out
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-300">{formatUsd(r.providerCostUsd)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-500">{r.exchangeRate}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-300">{formatKes(r.costKes)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-300">{r.creditsCharged.toLocaleString()}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant={r.status === "charged" ? "success" : r.status === "refunded" ? "warning" : "danger"}>
                        {r.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <Lock className="h-3 w-3" /> {total.toLocaleString()} immutable records
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <p className="text-xs text-slate-500">Page {page} of {totalPages}</p>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-400 hover:text-white disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-400 hover:text-white disabled:opacity-40">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
