"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  History,
  Loader2,
  MessageSquare,
  Plus,
  Save,
  Search,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/admin-shell";
import { SmsChart } from "@/components/admin/sms-chart";
import { StatCard } from "@/components/admin/stat-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  SmsBusinessStat,
  SmsDataPoint,
  SmsInventorySummary,
  SmsLedgerEntry,
} from "@/types/admin";
import type { SmsPack } from "@/types/billing";

type SmsTab = "overview" | "stock" | "usage";

interface SmsApiResponse {
  inventory: SmsInventorySummary;
  thisMonth: number;
  topBusinesses: SmsBusinessStat[];
  trend: SmsDataPoint[];
  logs: SmsLedgerEntry[];
  page: number;
  limit: number;
  totalLogs: number;
  error?: string;
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-sm text-slate-200 outline-none transition-colors focus:border-violet-500"
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
  onChange: (value: number) => void;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{label}</span>
      <input
        type="number"
        min={1}
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-sm text-slate-200 outline-none transition-colors focus:border-violet-500"
      />
    </label>
  );
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Nairobi",
  }).format(new Date(value));
}

function ledgerLabel(entryType: SmsLedgerEntry["entryType"]) {
  switch (entryType) {
    case "stock_addition":
      return "Stock added";
    case "usage":
      return "SMS used";
    case "refund":
      return "Refunded";
    case "adjustment":
      return "Adjustment";
  }
}

function ledgerVariant(entryType: SmsLedgerEntry["entryType"]) {
  if (entryType === "usage") return "warning" as const;
  if (entryType === "refund" || entryType === "stock_addition") return "success" as const;
  return "default" as const;
}

export default function AdminSmsPage() {
  const [activeTab, setActiveTab] = useState<SmsTab>("overview");
  const [inventory, setInventory] = useState<SmsInventorySummary>({
    available: 0,
    totalAdded: 0,
    totalUsed: 0,
    updatedAt: null,
  });
  const [thisMonth, setThisMonth] = useState(0);
  const [topBusinesses, setTopBusinesses] = useState<SmsBusinessStat[]>([]);
  const [trend, setTrend] = useState<SmsDataPoint[]>([]);
  const [logs, setLogs] = useState<SmsLedgerEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [stockUnits, setStockUnits] = useState(1000);
  const [stockNote, setStockNote] = useState("");
  const [addingStock, setAddingStock] = useState(false);

  const [packs, setPacks] = useState<SmsPack[]>([]);
  const [packsLoading, setPacksLoading] = useState(true);
  const [packsSaving, setPacksSaving] = useState(false);

  const loadSmsData = useCallback(async (requestedPage = 1) => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch(`/api/ffmanage/sms?page=${requestedPage}&limit=50`);
      const data = (await response.json()) as SmsApiResponse;
      if (!response.ok) throw new Error(data.error ?? "Could not load SMS data");
      setInventory(data.inventory);
      setThisMonth(data.thisMonth);
      setTopBusinesses(data.topBusinesses);
      setTrend(data.trend);
      setLogs(data.logs);
      setPage(data.page);
      setTotalLogs(data.totalLogs);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load SMS data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSmsData(1);
    fetch("/api/ffmanage/sms/packs")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not load SMS packs");
        setPacks(data.packs ?? []);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Could not load SMS packs"))
      .finally(() => setPacksLoading(false));
  }, [loadSmsData]);

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return logs;
    return logs.filter((log) =>
      [log.businessName, log.recipient, log.reference, ledgerLabel(log.entryType)]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query))
    );
  }, [logs, search]);

  async function handleAddStock() {
    if (!Number.isInteger(stockUnits) || stockUnits <= 0) {
      toast.error("Enter a positive whole number of SMS units");
      return;
    }
    setAddingStock(true);
    try {
      const response = await fetch("/api/ffmanage/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ units: stockUnits, note: stockNote }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not add SMS stock");
      toast.success(`${stockUnits.toLocaleString()} SMS units added to platform stock`);
      setStockNote("");
      await loadSmsData(1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add SMS stock");
    } finally {
      setAddingStock(false);
    }
  }

  async function handleSavePacks() {
    setPacksSaving(true);
    try {
      const response = await fetch("/api/ffmanage/sms/packs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packs }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save SMS packs");
      setPacks(data.packs);
      toast.success("SMS packs updated across the platform");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save SMS packs");
    } finally {
      setPacksSaving(false);
    }
  }

  const tabs: Array<{ id: SmsTab; label: string; icon: typeof MessageSquare }> = [
    { id: "overview", label: "Analytics", icon: TrendingUp },
    { id: "stock", label: "SMS stock", icon: Wallet },
    { id: "usage", label: "Usage ledger", icon: History },
  ];

  return (
    <AdminShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100">SMS accountability</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Provider stock, canonical business usage, audit history, and customer pack pricing.
          </p>
        </div>

        {loadError && (
          <div className="rounded-xl border border-rose-900/60 bg-rose-950/30 px-4 py-3 text-sm text-rose-300">
            {loadError}
          </div>
        )}

        <div className="flex gap-1 overflow-x-auto border-b border-slate-800">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "-mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "border-violet-500 text-violet-300"
                    : "border-transparent text-slate-500 hover:text-slate-300"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard
                title="SMS available"
                value={inventory.available.toLocaleString()}
                subtitle="Current provider stock"
                icon={MessageSquare}
                variant={inventory.available < 100 ? "danger" : "success"}
                loading={loading}
              />
              <StatCard
                title="Lifetime used"
                value={inventory.totalUsed.toLocaleString()}
                subtitle="Accepted provider sends"
                icon={CheckCircle2}
                variant="purple"
                loading={loading}
              />
              <StatCard
                title="This month"
                value={thisMonth.toLocaleString()}
                subtitle="Africa/Nairobi calendar month"
                icon={TrendingUp}
                loading={loading}
              />
              <StatCard
                title="Total stock added"
                value={inventory.totalAdded.toLocaleString()}
                subtitle="All recorded replenishments"
                icon={Wallet}
                loading={loading}
              />
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold text-slate-200">Daily SMS usage</h2>
                <span className="text-xs text-slate-500">Last 30 days · successful sends only</span>
              </div>
              <SmsChart data={trend} loading={loading} />
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-200">Usage by business</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Every business with usage, ranked by lifetime provider SMS consumed
                  </p>
                </div>
                <Building2 className="h-5 w-5 text-slate-600" />
              </div>
              {loading ? (
                <div className="max-h-[34rem] space-y-2 overflow-y-auto pr-1">
                  {[1, 2, 3, 4, 5].map((item) => (
                    <div key={item} className="h-12 animate-pulse rounded-lg bg-slate-800" />
                  ))}
                </div>
              ) : topBusinesses.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">No accounted SMS usage yet</p>
              ) : (
                <div className="space-y-2">
                  {topBusinesses.map((business, index) => {
                    const share = inventory.totalUsed
                      ? Math.round((business.sent / inventory.totalUsed) * 100)
                      : 0;
                    return (
                      <div key={business.businessId} className="rounded-lg bg-slate-800/60 px-3 py-3">
                        <div className="flex items-center gap-3">
                          <span className="w-5 text-xs font-bold text-slate-600">{index + 1}</span>
                          <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-200">
                            {business.businessName}
                          </p>
                          <span className="text-sm font-bold tabular-nums text-violet-300">
                            {business.sent.toLocaleString()}
                          </span>
                          <span className="w-10 text-right text-xs text-slate-500">{share}%</span>
                        </div>
                        <div className="ml-8 mt-2 h-1.5 overflow-hidden rounded-full bg-slate-950">
                          <div
                            className="h-full rounded-full bg-violet-500"
                            style={{ width: `${Math.max(2, share)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "stock" && (
          <div className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
              <div className="rounded-xl border border-violet-900/60 bg-violet-950/20 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400">
                    <Plus className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-100">Add provider SMS stock</h2>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      Record units purchased from the provider. Every addition is permanent and audited.
                    </p>
                  </div>
                </div>
                <div className="mt-5 space-y-4">
                  <NumberField label="Units to add" value={stockUnits} onChange={setStockUnits} step={100} />
                  <TextField label="Purchase reference or note" value={stockNote} onChange={setStockNote} />
                  <button
                    type="button"
                    disabled={addingStock}
                    onClick={handleAddStock}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
                  >
                    {addingStock ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {addingStock ? "Adding stock…" : "Add SMS stock"}
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <h2 className="font-semibold text-slate-200">Stock reconciliation</h2>
                <p className="mt-1 text-xs text-slate-500">The platform balance always follows this equation.</p>
                <div className="mt-6 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 text-center">
                  <div className="rounded-lg bg-slate-950 p-4">
                    <p className="text-xs uppercase tracking-wider text-slate-600">Added</p>
                    <p className="mt-1 text-xl font-bold text-slate-200">{inventory.totalAdded.toLocaleString()}</p>
                  </div>
                  <span className="text-slate-600">−</span>
                  <div className="rounded-lg bg-slate-950 p-4">
                    <p className="text-xs uppercase tracking-wider text-slate-600">Used</p>
                    <p className="mt-1 text-xl font-bold text-amber-300">{inventory.totalUsed.toLocaleString()}</p>
                  </div>
                  <span className="text-slate-600">=</span>
                  <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/20 p-4">
                    <p className="text-xs uppercase tracking-wider text-emerald-700">Available</p>
                    <p className="mt-1 text-xl font-bold text-emerald-300">{inventory.available.toLocaleString()}</p>
                  </div>
                </div>
                <p className="mt-4 text-xs text-slate-600">
                  Provider rejections are refunded to both the business and platform ledgers automatically.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400">
                  <Wallet className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-100">Customer top-up packs</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    These are products businesses can buy; they are separate from provider stock above.
                  </p>
                </div>
              </div>

              {packsLoading ? (
                <div className="flex h-24 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
                </div>
              ) : (
                <div className="space-y-3">
                  {packs.map((pack, index) => (
                    <div key={pack.id} className="grid grid-cols-2 items-center gap-3 sm:grid-cols-5">
                      <TextField
                        label="Label"
                        value={pack.label}
                        onChange={(value) =>
                          setPacks((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, label: value } : item
                            )
                          )
                        }
                      />
                      <NumberField
                        label="Units"
                        value={pack.units}
                        onChange={(value) =>
                          setPacks((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, units: value } : item
                            )
                          )
                        }
                      />
                      <NumberField
                        label="Price (KES)"
                        value={pack.priceKes}
                        step={50}
                        onChange={(value) =>
                          setPacks((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, priceKes: value } : item
                            )
                          )
                        }
                      />
                      <label className="flex items-center gap-2 pt-5 text-xs text-slate-400">
                        <input
                          type="checkbox"
                          checked={pack.active}
                          onChange={(event) =>
                            setPacks((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, active: event.target.checked } : item
                              )
                            )
                          }
                          className="h-4 w-4 accent-violet-500"
                        />
                        Active
                      </label>
                      <button
                        type="button"
                        aria-label={`Delete ${pack.label}`}
                        onClick={() => setPacks((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                        className="mt-4 w-fit rounded-lg p-2 text-slate-500 hover:bg-rose-900/30 hover:text-rose-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() =>
                        setPacks((current) => [
                          ...current,
                          {
                            id: `pack_${Date.now()}`,
                            label: "New pack",
                            units: 100,
                            priceKes: 300,
                            active: true,
                            sortOrder: current.length + 1,
                            updatedAt: null,
                            createdAt: new Date().toISOString(),
                          },
                        ])
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add pack
                    </button>
                    <button
                      type="button"
                      onClick={handleSavePacks}
                      disabled={packsSaving || packs.length === 0}
                      className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
                    >
                      {packsSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {packsSaving ? "Saving…" : "Save packs"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "usage" && (
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
              <div>
                <h2 className="font-semibold text-slate-200">SMS usage ledger</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Append-only record of every stock addition, business use, and refund.
                </p>
              </div>
              <label className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-600" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search this page"
                  className="w-64 rounded-lg border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-sm text-slate-300 outline-none focus:border-violet-500"
                />
              </label>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40">
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-500">Business</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-500">Event</th>
                    <th className="px-4 py-3 text-right text-xs uppercase tracking-wider text-slate-500">Units</th>
                    <th className="px-4 py-3 text-right text-xs uppercase tracking-wider text-slate-500">Balance after</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-500">Recipient / note</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-500">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {loading ? (
                    Array.from({ length: 8 }).map((_, index) => (
                      <tr key={index}>
                        <td colSpan={6} className="px-4 py-3">
                          <div className="h-4 animate-pulse rounded bg-slate-800" />
                        </td>
                      </tr>
                    ))
                  ) : filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-sm text-slate-500">
                        No matching ledger entries
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/30">
                        <td className="max-w-48 truncate px-4 py-3 text-xs font-medium text-slate-300">
                          {log.businessName}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={ledgerVariant(log.entryType)} className="whitespace-nowrap">
                            {ledgerLabel(log.entryType)}
                          </Badge>
                        </td>
                        <td
                          className={cn(
                            "px-4 py-3 text-right text-xs font-bold tabular-nums",
                            log.units > 0 ? "text-emerald-400" : "text-amber-400"
                          )}
                        >
                          {log.units > 0 ? "+" : ""}{log.units.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-xs tabular-nums text-slate-400">
                          {log.balanceAfter.toLocaleString()}
                        </td>
                        <td className="max-w-56 truncate px-4 py-3 text-xs text-slate-500">
                          {log.recipient ?? log.note ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                          {formatTimestamp(log.createdAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-slate-800 px-5 py-3">
              <span className="text-xs text-slate-500">
                Page {page} · {totalLogs.toLocaleString()} total entries
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => void loadSmsData(page - 1)}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page * 50 >= totalLogs || loading}
                  onClick={() => void loadSmsData(page + 1)}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
