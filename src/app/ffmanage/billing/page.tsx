"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { StatCard } from "@/components/admin/stat-card";
import { Badge } from "@/components/ui/badge";
import { formatKes, formatDateLabel, cn } from "@/lib/utils";
import { PLAN_CONFIGS } from "@/lib/billing/constants";
import { CreditCard, TrendingUp, Clock, AlertCircle, ChevronLeft, ChevronRight, Search, Building2 } from "lucide-react";

interface Payment {
  id: string;
  workspace_id: string;
  paystack_reference: string;
  amount: number;
  payment_status: string;
  payment_type: string;
  paid_at: string | null;
  created_at: string;
  businessName: string | null;
  businessEmail: string | null;
}

interface Summary {
  totalRevenue: number;
  pendingCount: number;
  failedCount: number;
}

export default function AdminBillingPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<Summary>({ totalRevenue: 0, pendingCount: 0, failedCount: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const LIMIT = 25;

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT), status: statusFilter, search });
    const res = await fetch(`/api/ffmanage/billing?${params}`);
    const data = await res.json();
    setPayments(data.payments ?? []);
    setTotal(data.total ?? 0);
    setSummary(data.summary ?? { totalRevenue: 0, pendingCount: 0, failedCount: 0 });
    setLoading(false);
  }, [page, statusFilter, search]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <AdminShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Billing & Payments</h1>
          <p className="mt-0.5 text-sm text-slate-500">All platform payments and subscription revenue</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard title="Total Revenue" value={formatKes(summary.totalRevenue)} icon={TrendingUp} variant="success" loading={loading} />
          <StatCard title="Pending Payments" value={summary.pendingCount} icon={Clock} variant="warning" loading={loading} />
          <StatCard title="Failed Payments" value={summary.failedCount} icon={AlertCircle} variant="danger" loading={loading} />
        </div>

        {/* Plan branch limits reference */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-300">Plan branch limits</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.values(PLAN_CONFIGS).map((p) => (
              <div key={p.slug} className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{p.name}</p>
                <p className="mt-1 text-sm font-bold text-slate-200">
                  {p.limits.maxBranches == null ? "Unlimited" : `${p.limits.maxBranches} branch${p.limits.maxBranches === 1 ? "" : "es"}`}
                </p>
              </div>
            ))}
            <div className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Custom</p>
              <p className="mt-1 text-sm font-bold text-slate-200">Unlimited</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by reference…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setSearch(searchInput)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-9 pr-4 text-sm text-slate-200 placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-violet-500 focus:outline-none"
          >
            <option value="">All statuses</option>
            <option value="success">Success</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="abandoned">Abandoned</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Business</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Reference</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900">
                {loading ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-slate-800" /></td></tr>
                )) : payments.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-sm text-slate-500">No payments found</td></tr>
                ) : payments.map((p) => (
                  <tr key={p.id} className="bg-slate-900 hover:bg-slate-800 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-200 truncate max-w-[160px]">{p.businessName ?? "—"}</p>
                      <p className="text-xs text-slate-500 truncate max-w-[160px]">{p.businessEmail ?? ""}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{p.paystack_reference}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{p.payment_type.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-300">{formatKes(p.amount)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={
                        p.payment_status === "success" ? "success" :
                        p.payment_status === "pending" ? "warning" : "danger"
                      }>
                        {p.payment_status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {p.paid_at ? formatDateLabel(p.paid_at) : formatDateLabel(p.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">Page {page} of {totalPages} ({total} total)</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-400 hover:text-white disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-400 hover:text-white disabled:opacity-40">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
