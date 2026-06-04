"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { StockMovement } from "@/types/domain";

const PAGE_SIZE = 20;

const MOVEMENT_TYPES = [
  { label: "All Types", value: "" },
  { label: "Stock Added", value: "stock_in" },
  { label: "Material Used", value: "used_in_order" },
  { label: "Adjustment", value: "adjustment" },
  { label: "Wastage", value: "wastage" },
  { label: "Stock Out", value: "stock_out" },
  { label: "Return", value: "return" },
];

function movementColor(type: string): "success" | "warning" | "default" | "danger" {
  const t = type.toLowerCase();
  if (t === "stock_in" || t === "stock in") return "success";
  if (t === "used_in_order" || t === "used in order" || t === "consumption") return "warning";
  if (t === "wastage" || t === "stock_out") return "danger";
  return "default";
}

function movementTitle(type: string): string {
  const t = type.toLowerCase();
  if (t === "stock_in" || t === "stock in") return "Stock Added";
  if (t === "used_in_order" || t === "used in order") return "Material Used";
  if (t === "adjustment") return "Adjustment";
  if (t === "wastage") return "Wastage";
  if (t === "stock_out") return "Stock Out";
  if (t === "return") return "Return";
  return type.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(timestamp: unknown) {
  if (!timestamp) return "--";
  try {
    const date = typeof (timestamp as any)?.toDate === "function"
      ? (timestamp as any).toDate()
      : new Date(timestamp as string);
    return date.toLocaleString("en-KE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return "--"; }
}

export function StockMovementsSection({ movements }: { movements: StockMovement[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let result = movements;

    if (typeFilter) {
      // Normalise both sides: treat spaces and underscores as equivalent
      const normalise = (s: string) => s.toLowerCase().replace(/[\s_]+/g, "_");
      result = result.filter((m) => normalise(m.movementType) === normalise(typeFilter));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.materialName?.toLowerCase().includes(q) ||
          m.reason?.toLowerCase().includes(q) ||
          m.createdByName?.toLowerCase().includes(q) ||
          movementTitle(m.movementType).toLowerCase().includes(q)
      );
    }

    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      result = result.filter((m) => {
        const d = m.createdAt ? new Date(m.createdAt as string).getTime() : 0;
        return d >= from;
      });
    }

    if (dateTo) {
      const to = new Date(dateTo).getTime() + 86400000; // inclusive end of day
      result = result.filter((m) => {
        const d = m.createdAt ? new Date(m.createdAt as string).getTime() : 0;
        return d <= to;
      });
    }

    return result;
  }, [movements, searchQuery, typeFilter, dateFrom, dateTo]);

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const resetFilters = () => { setSearchQuery(""); setTypeFilter(""); setDateFrom(""); setDateTo(""); setPage(0); };
  const hasFilters = searchQuery || typeFilter || dateFrom || dateTo;

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-xl font-semibold">Stock Movement Report</CardTitle>
            <Badge variant="default" className="rounded-full px-3 py-1">
              {filtered.length}/{movements.length} Records
            </Badge>
          </div>
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">Search</label>
            <Input
              placeholder="Material, reason, staff..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              className="w-full sm:w-[220px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">Movement Type</label>
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {MOVEMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">From Date</label>
            <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(0); }} className="w-[145px]" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">To Date</label>
            <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(0); }} className="w-[145px]" />
          </div>
          {hasFilters && (
            <Button variant="outline" size="sm" onClick={resetFilters} className="self-end">
              Clear filters
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {paged.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center">
            <p className="text-sm text-slate-500">
              {hasFilters ? "No records match your filters." : "No stock activity recorded yet."}
            </p>
            {hasFilters && (
              <Button variant="ghost" size="sm" className="mt-2" onClick={resetFilters}>
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Table layout */}
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left font-medium">Material</th>
                    <th className="px-4 py-3 text-left font-medium">Type</th>
                    <th className="px-4 py-3 text-right font-medium">Change</th>
                    <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Reason</th>
                    <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">By</th>
                    <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paged.map((m) => {
                    const isPositive = m.quantityChange > 0;
                    return (
                      <tr key={m.id} className="bg-white hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{m.materialName}</p>
                          {m.orderId && (
                            <p className="text-xs text-blue-600">Order #{m.orderId.slice(-8)}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={movementColor(m.movementType)} className="rounded-full whitespace-nowrap">
                            {movementTitle(m.movementType)}
                          </Badge>
                        </td>
                        <td className={`px-4 py-3 text-right font-semibold ${isPositive ? "text-emerald-600" : "text-rose-600"}`}>
                          {isPositive ? "+" : ""}{m.quantityChange} {m.unit}
                        </td>
                        <td className="px-4 py-3 text-slate-600 hidden md:table-cell max-w-[200px]">
                          <p className="truncate">{m.reason || "—"}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600 hidden lg:table-cell whitespace-nowrap">
                          {m.createdByName || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-500 hidden lg:table-cell whitespace-nowrap text-xs">
                          {formatDate(m.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pageCount > 1 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-xs text-slate-500">
                  Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  {Array.from({ length: Math.min(pageCount, 5) }, (_, i) => {
                    const p = pageCount <= 5 ? i : Math.max(0, Math.min(page - 2, pageCount - 5)) + i;
                    return (
                      <Button key={p} variant={p === page ? "default" : "outline"} size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => setPage(p)}>
                        {p + 1}
                      </Button>
                    );
                  })}
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
