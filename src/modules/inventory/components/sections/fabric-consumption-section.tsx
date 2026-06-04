"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { StockMovement } from "@/types/domain";

const PAGE_SIZE = 15;

function formatDate(timestamp: unknown) {
  if (!timestamp) return "--";
  try {
    const date = typeof (timestamp as any)?.toDate === "function"
      ? (timestamp as any).toDate()
      : new Date(timestamp as string);
    return date.toLocaleString("en-KE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return "--"; }
}

export function FabricConsumptionSection({
  consumption,
  movements,
}: {
  consumption: Record<string, number>;
  movements: StockMovement[];
}) {
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);

  const consumptionMovements = useMemo(
    () => movements.filter((m) => {
      const t = m.movementType?.toLowerCase().replace(/[\s_]+/g, "_");
      return t === "used_in_order";
    }),
    [movements]
  );

  const filteredMovements = useMemo(() => {
    let result = consumptionMovements;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.materialName?.toLowerCase().includes(q) ||
          m.reason?.toLowerCase().includes(q) ||
          m.orderId?.toLowerCase().includes(q)
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
      const to = new Date(dateTo).getTime() + 86400000;
      result = result.filter((m) => {
        const d = m.createdAt ? new Date(m.createdAt as string).getTime() : 0;
        return d <= to;
      });
    }
    return result;
  }, [consumptionMovements, search, dateFrom, dateTo]);

  const sorted = useMemo(() => Object.entries(consumption).sort(([, a], [, b]) => b - a), [consumption]);

  const filteredSorted = useMemo(() => {
    if (!search.trim()) return sorted;
    const q = search.toLowerCase();
    return sorted.filter(([name]) => name.toLowerCase().includes(q));
  }, [sorted, search]);

  const totalConsumed = sorted.reduce((s, [, v]) => s + v, 0);

  const pageCount = Math.ceil(filteredMovements.length / PAGE_SIZE);
  const paged = filteredMovements.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const hasFilters = search || dateFrom || dateTo;
  const resetFilters = () => { setSearch(""); setDateFrom(""); setDateTo(""); setPage(0); };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Total Material Used</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{totalConsumed.toFixed(1)}</p>
            <p className="text-xs text-slate-400 mt-1">across all orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Materials Tracked</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{sorted.length}</p>
            <p className="text-xs text-slate-400 mt-1">unique materials used</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Usage Records</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{consumptionMovements.length}</p>
            <p className="text-xs text-slate-400 mt-1">total consumption entries</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500">Search material / order</label>
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full sm:w-[220px]"
          />
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
            Clear
          </Button>
        )}
      </div>

      {/* Usage by material bar chart */}
      {filteredSorted.length === 0 ? (
        <Card>
          <CardHeader><CardTitle>Material Usage</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">
              {search ? "No materials match your search." : "No usage data yet. Usage is tracked when orders are completed and materials are recorded."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Usage by Material</CardTitle>
              <span className="text-xs text-slate-400">{filteredSorted.length} material{filteredSorted.length !== 1 ? "s" : ""}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredSorted.map(([name, total]) => {
                const percentage = totalConsumed > 0 ? (total / totalConsumed) * 100 : 0;
                return (
                  <div key={name}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-900">{name}</span>
                      <span className="text-slate-600">{total.toFixed(1)} ({percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage records table */}
      {consumptionMovements.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Usage Records</CardTitle>
              <span className="text-xs text-slate-400">{filteredMovements.length} records</span>
            </div>
          </CardHeader>
          <CardContent>
            {paged.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 py-8 text-center">
                <p className="text-sm text-slate-500">No records match your filters.</p>
                {hasFilters && <Button variant="ghost" size="sm" className="mt-2" onClick={resetFilters}>Clear filters</Button>}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                        <th className="px-4 py-3 text-left font-medium">Material</th>
                        <th className="px-4 py-3 text-right font-medium">Used</th>
                        <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Order Ref</th>
                        <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Reason</th>
                        <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paged.map((m) => (
                        <tr key={m.id} className="bg-white hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-900">{m.materialName}</td>
                          <td className="px-4 py-3 text-right font-semibold text-amber-600">
                            -{Math.abs(m.quantityChange)}{m.unit ? ` ${m.unit}` : ""}
                          </td>
                          <td className="px-4 py-3 text-blue-600 hidden md:table-cell text-xs">
                            {m.orderId ? `#${m.orderId.slice(-8)}` : "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-500 hidden md:table-cell max-w-[200px]">
                            <p className="truncate">{m.reason || "—"}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-400 hidden lg:table-cell text-xs whitespace-nowrap">
                            {formatDate(m.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {pageCount > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <p className="text-xs text-slate-500">
                      Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredMovements.length)} of {filteredMovements.length}
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
      )}
    </div>
  );
}
