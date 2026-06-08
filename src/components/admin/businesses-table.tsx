"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn, formatKes, formatDateLabel } from "@/lib/utils";
import { Search, Building2, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AdminBusinessSummary } from "@/types/admin";

const PLAN_LABELS: Record<string, string> = {
  sindano: "Sindano",
  fundi: "Fundi",
  dhahabu: "Dhahabu",
  custom: "Custom",
  none: "None",
};

export function BusinessesTable() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<AdminBusinessSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const LIMIT = 20;

  const fetchBusinesses = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(LIMIT),
      search,
      plan: planFilter,
      status: statusFilter,
    });
    const res = await fetch(`/api/ffmanage/businesses?${params}`);
    const data = await res.json();
    setBusinesses(data.businesses ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [page, search, planFilter, statusFilter]);

  useEffect(() => { fetchBusinesses(); }, [fetchBusinesses]);

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") setSearch(searchInput);
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name, email, or phone…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-9 pr-4 text-sm text-slate-200 placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          <select
            value={planFilter}
            onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-violet-500 focus:outline-none"
          >
            <option value="">All plans</option>
            <option value="sindano">Sindano</option>
            <option value="fundi">Fundi</option>
            <option value="dhahabu">Dhahabu</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-violet-500 focus:outline-none"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Business</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 md:table-cell">Plan</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 lg:table-cell">Subscription</th>
                <th className="hidden px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500 xl:table-cell">Revenue</th>
                <th className="hidden px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500 xl:table-cell">Employees</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 sm:table-cell">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="bg-slate-900">
                      <td colSpan={7} className="px-4 py-3">
                        <div className="h-4 animate-pulse rounded bg-slate-800" />
                      </td>
                    </tr>
                  ))
                : businesses.length === 0
                ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center">
                        <Building2 className="mx-auto h-8 w-8 text-slate-700" />
                        <p className="mt-2 text-sm text-slate-500">No businesses found</p>
                      </td>
                    </tr>
                  )
                : businesses.map((biz) => (
                    <tr
                      key={biz.id}
                      className="cursor-pointer bg-slate-900 transition-colors hover:bg-slate-800"
                      onClick={() => router.push(`/ffmanage/businesses/${biz.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-200">{biz.name}</p>
                          <p className="text-xs text-slate-500">{biz.ownerEmail ?? biz.email ?? "—"}</p>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        <span className="rounded-md bg-violet-900/30 px-2 py-0.5 text-xs font-medium text-violet-300">
                          {PLAN_LABELS[biz.plan] ?? biz.plan}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 lg:table-cell">
                        <SubscriptionBadge status={biz.subscriptionStatus} />
                      </td>
                      <td className="hidden px-4 py-3 text-right text-slate-300 xl:table-cell">
                        {formatKes(biz.totalRevenue)}
                      </td>
                      <td className="hidden px-4 py-3 text-right text-slate-400 xl:table-cell">
                        {biz.employeeCount}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={biz.isActive ? "success" : "danger"}>
                          {biz.isActive ? "Active" : "Suspended"}
                        </Badge>
                      </td>
                      <td className="hidden px-4 py-3 text-xs text-slate-500 sm:table-cell">
                        {formatDateLabel(biz.createdAt)}
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
          <p className="text-xs text-slate-500">
            Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-200 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-slate-400">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-200 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SubscriptionBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-xs text-slate-600">—</span>;
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: "Active", cls: "text-emerald-400 bg-emerald-900/30" },
    past_due: { label: "Past Due", cls: "text-amber-400 bg-amber-900/30" },
    cancelled: { label: "Cancelled", cls: "text-rose-400 bg-rose-900/30" },
    suspended: { label: "Suspended", cls: "text-rose-400 bg-rose-900/30" },
    pending_payment: { label: "Pending", cls: "text-amber-400 bg-amber-900/30" },
  };
  const style = map[status] ?? { label: status, cls: "text-slate-400 bg-slate-800" };
  return (
    <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", style.cls)}>
      {style.label}
    </span>
  );
}
