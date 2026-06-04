"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, Wallet, Search, X } from "lucide-react";
import { toast } from "sonner";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import { listenWithdrawals, createWithdrawal, updateWithdrawal, deleteWithdrawal } from "@/services/withdrawals.service";
import { calculateWithdrawals, withdrawalsByCategory } from "@/services/finance.service";
import type { Withdrawal } from "@/types/domain";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { StatsCard } from "@/components/ui/stats-card";
import { ChartCard, FinancePieChart } from "@/components/ui/finance-chart";
import { formatKes } from "@/lib/utils";
import { useAuth } from "@/features/auth/components/auth-context";

const PRESET_CATEGORIES = [
  "Owner Drawings",
  "Salary Advance",
  "Business Expenses",
  "Tax",
  "Emergency",
  "Other",
];

const CATEGORY_COLORS: Record<string, string> = {
  "Owner Drawings": "#f59e0b",
  "Salary Advance": "#3b82f6",
  "Business Expenses": "#8b5cf6",
  Tax: "#ef4444",
  Emergency: "#f97316",
  Other: "#94a3b8",
};

const FALLBACK_COLORS = ["#6366f1", "#ec4899", "#84cc16", "#0ea5e9", "#e879f9", "#fb923c"];

function getCategoryColor(category: string, index = 0): string {
  return CATEGORY_COLORS[category] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

const NAV_LINKS = [
  { href: "/finance", label: "Overview" },
  { href: "/finance/expenses", label: "Expenses" },
  { href: "/finance/withdrawals", label: "Withdrawals" },
  { href: "/finance/investments", label: "Investments" },
  { href: "/finance/savings", label: "Savings" },
  { href: "/finance/transactions", label: "Transactions" },
  { href: "/finance/reports", label: "Reports" },
];

export function WithdrawalsModulePage() {
  const { businessId, ready } = useBusinessContext();
  const { user } = useAuth();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Withdrawal | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [formCategory, setFormCategory] = useState("Owner Drawings");
  const [customCategory, setCustomCategory] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [formAmount, setFormAmount] = useState("");
  const [formReason, setFormReason] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ready) return;
    return listenWithdrawals(businessId, setWithdrawals);
  }, [businessId, ready]);

  const allCategories = useMemo(() => {
    const existing = new Set(withdrawals.map((w) => w.category));
    const merged = new Set([...PRESET_CATEGORIES, ...existing]);
    return Array.from(merged).sort();
  }, [withdrawals]);

  const filtered = useMemo(() => {
    let result = withdrawals;
    if (categoryFilter !== "all") {
      result = result.filter((w) => w.category === categoryFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (w) =>
          w.reason.toLowerCase().includes(q) ||
          w.category.toLowerCase().includes(q) ||
          w.withdrawnByName.toLowerCase().includes(q)
      );
    }
    return result;
  }, [withdrawals, categoryFilter, search]);

  const totalWithdrawals = useMemo(() => calculateWithdrawals(withdrawals), [withdrawals]);

  const thisMonthWithdrawals = useMemo(() => {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return calculateWithdrawals(withdrawals, start, new Date());
  }, [withdrawals]);

  const categoryData = useMemo(() => {
    const byCat = withdrawalsByCategory(withdrawals);
    return Object.entries(byCat).map(([name, value], i) => ({
      name,
      value,
      color: getCategoryColor(name, i),
    }));
  }, [withdrawals]);

  function getEffectiveCategory() {
    return isCustom ? customCategory.trim() : formCategory;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const category = getEffectiveCategory();
    if (!user || !formAmount || !formReason || !category) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    try {
      const amount = parseFloat(formAmount);
      if (isNaN(amount) || amount <= 0) {
        toast.error("Please enter a valid amount greater than zero.");
        return;
      }
      if (editing) {
        await updateWithdrawal(businessId, editing.id, {
          amount,
          reason: formReason,
          category,
          notes: formNotes,
          withdrawalDate: formDate,
        });
        toast.success("Withdrawal updated successfully.");
      } else {
        await createWithdrawal(businessId, {
          amount,
          reason: formReason,
          category,
          notes: formNotes,
          withdrawalDate: new Date(formDate),
          actorUid: user.uid,
          actorName: user.displayName,
        });
        toast.success("Withdrawal recorded successfully.");
      }
      resetForm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as any)?.message ?? "Something went wrong";
      toast.error(`Failed to save withdrawal: ${msg}`);
      console.error("Withdrawal save error:", err);
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setShowForm(false);
    setEditing(null);
    setFormCategory("Owner Drawings");
    setCustomCategory("");
    setIsCustom(false);
    setFormAmount("");
    setFormReason("");
    setFormNotes("");
    setFormDate(new Date().toISOString().slice(0, 10));
  }

  function handleEdit(w: Withdrawal) {
    setEditing(w);
    const isPreset = PRESET_CATEGORIES.includes(w.category);
    setIsCustom(!isPreset);
    setFormCategory(isPreset ? w.category : "Owner Drawings");
    setCustomCategory(isPreset ? "" : w.category);
    setFormAmount(w.amount.toString());
    setFormReason(w.reason);
    setFormNotes(w.notes || "");
    setFormDate(w.withdrawalDate ? w.withdrawalDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this withdrawal? This cannot be undone.")) return;
    try {
      await deleteWithdrawal(businessId, id);
      toast.success("Withdrawal deleted.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete";
      toast.error(msg);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Withdrawals</h1>
          <p className="text-sm text-slate-500">Track money taken out of the business</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Record Withdrawal
        </Button>
      </div>

      {/* Nav tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 text-sm overflow-x-auto">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            className={`rounded-xl px-3 py-2 font-medium whitespace-nowrap ${link.href === "/finance/withdrawals" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            href={link.href}
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Stats — 2 columns on mobile, 3 on sm+ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatsCard title="Total Withdrawn" value={formatKes(totalWithdrawals)} variant="warning" />
        <StatsCard title="This Month" value={formatKes(thisMonthWithdrawals)} variant="warning" />
        <StatsCard title="No. of Withdrawals" value={`${withdrawals.length}`} variant="info" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by reason, category or person…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="sm:w-48">
              <option value="all">All Categories</option>
              {allCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <EmptyState
                  icon={<Wallet className="h-8 w-8" />}
                  title="No withdrawals found"
                  description={search || categoryFilter !== "all" ? "Try changing your search or filter." : "Record your first withdrawal to start tracking."}
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead className="hidden sm:table-cell">Category</TableHead>
                        <TableHead className="hidden md:table-cell">By</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="w-16 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((w) => (
                        <TableRow key={w.id}>
                          <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                            {w.withdrawalDate ? new Date(w.withdrawalDate).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "2-digit" }) : "-"}
                          </TableCell>
                          <TableCell className="font-medium max-w-[160px] truncate">
                            {w.reason}
                            <div className="sm:hidden text-xs text-slate-400 mt-0.5">{w.category}</div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant="default" className="text-xs">{w.category}</Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-slate-500 text-sm">{w.withdrawnByName}</TableCell>
                          <TableCell className="text-right font-semibold text-amber-600 whitespace-nowrap">
                            -{formatKes(w.amount)}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleEdit(w)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(w.id)}>
                                <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <ChartCard title="By Category">
          <FinancePieChart data={categoryData} height={300} />
        </ChartCard>
      </div>

      <Dialog open={showForm} onClose={() => setShowForm(false)}>
        <div className="p-6 max-w-lg">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">
            {editing ? "Edit Withdrawal" : "Record Withdrawal"}
          </h2>
          <p className="text-sm text-slate-500 mb-5">
            {editing ? "Update the withdrawal details." : "Record money that has been taken out of the business."}
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Category */}
            <div className="space-y-1.5">
              <Label>Category <span className="text-rose-500">*</span></Label>
              <Select
                value={isCustom ? "__custom__" : formCategory}
                onChange={(e) => {
                  if (e.target.value === "__custom__") {
                    setIsCustom(true);
                  } else {
                    setIsCustom(false);
                    setFormCategory(e.target.value);
                  }
                }}
              >
                {PRESET_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="__custom__">+ Add custom category</option>
              </Select>
              {isCustom && (
                <Input
                  placeholder="Type your category name e.g. Medical Bills"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  autoFocus
                  required
                />
              )}
            </div>

            {/* Amount + Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount (KES) <span className="text-rose-500">*</span></Label>
                <Input
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="e.g. 10000"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                />
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <Label>Reason for withdrawal <span className="text-rose-500">*</span></Label>
              <Input
                placeholder="e.g. Took money to pay shop rent"
                value={formReason}
                onChange={(e) => setFormReason(e.target.value)}
                required
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Extra notes <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Textarea
                placeholder="Any extra details…"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : editing ? "Update" : "Record Withdrawal"}
              </Button>
            </div>
          </form>
        </div>
      </Dialog>
    </div>
  );
}
