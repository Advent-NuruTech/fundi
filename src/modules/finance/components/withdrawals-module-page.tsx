"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, Wallet, Search, X } from "lucide-react";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import { listenWithdrawals, createWithdrawal, updateWithdrawal, deleteWithdrawal } from "@/services/withdrawals.service";
import { calculateWithdrawals, withdrawalsByCategory } from "@/services/finance.service";
import type { Withdrawal, WithdrawalCategory } from "@/types/domain";
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

const WITHDRAWAL_CATEGORIES: WithdrawalCategory[] = [
  "owner_drawings", "salary_advance", "business_expenses", "tax", "other",
];

const CATEGORY_LABELS: Record<WithdrawalCategory, string> = {
  owner_drawings: "Owner Drawings",
  salary_advance: "Salary Advance",
  business_expenses: "Business Expenses",
  tax: "Tax",
  other: "Other",
};

const CATEGORY_COLORS: Record<WithdrawalCategory, string> = {
  owner_drawings: "#f59e0b",
  salary_advance: "#3b82f6",
  business_expenses: "#8b5cf6",
  tax: "#ef4444",
  other: "#94a3b8",
};

export function WithdrawalsModulePage() {
  const { businessId, ready } = useBusinessContext();
  const { user } = useAuth();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Withdrawal | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [formCategory, setFormCategory] = useState<WithdrawalCategory>("owner_drawings");
  const [formAmount, setFormAmount] = useState("");
  const [formReason, setFormReason] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ready) return;
    return listenWithdrawals(businessId, setWithdrawals);
  }, [businessId, ready]);

  const filtered = useMemo(() => {
    let result = withdrawals;
    if (categoryFilter !== "all") {
      result = result.filter((w) => w.category === categoryFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((w) => w.reason.toLowerCase().includes(q) || w.withdrawnByName.toLowerCase().includes(q));
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
    return Object.entries(byCat).map(([name, value]) => ({
      name: CATEGORY_LABELS[name as WithdrawalCategory] || name,
      value,
      color: CATEGORY_COLORS[name as WithdrawalCategory],
    }));
  }, [withdrawals]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !formAmount || !formReason) return;
    setSaving(true);
    try {
      const amount = parseFloat(formAmount);
      if (editing) {
        await updateWithdrawal(businessId, editing.id, {
          amount,
          reason: formReason,
          category: formCategory,
          notes: formNotes,
          withdrawalDate: editing.withdrawalDate,
        });
      } else {
        await createWithdrawal(businessId, {
          amount,
          reason: formReason,
          category: formCategory,
          notes: formNotes,
          withdrawalDate: new Date(),
          actorUid: user.uid,
          actorName: user.displayName,
        });
      }
      resetForm();
    } catch (err) {
      console.error("Failed to save withdrawal:", err);
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setShowForm(false);
    setEditing(null);
    setFormCategory("owner_drawings");
    setFormAmount("");
    setFormReason("");
    setFormNotes("");
  }

  function handleEdit(w: Withdrawal) {
    setEditing(w);
    setFormCategory(w.category);
    setFormAmount(w.amount.toString());
    setFormReason(w.reason);
    setFormNotes(w.notes || "");
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this withdrawal?")) return;
    try {
      await deleteWithdrawal(businessId, id);
    } catch (err) {
      console.error("Failed to delete withdrawal:", err);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Withdrawals</h1>
          <p className="text-sm text-slate-500">Track money withdrawn from the business</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Record Withdrawal
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 text-sm">
        <Link className="rounded-xl px-3 py-2 font-medium text-slate-600 hover:bg-slate-100" href="/finance">Overview</Link>
        <Link className="rounded-xl px-3 py-2 font-medium text-slate-600 hover:bg-slate-100" href="/finance/expenses">Expenses</Link>
        <Link className="rounded-xl bg-slate-900 px-3 py-2 font-medium text-white" href="/finance/withdrawals">Withdrawals</Link>
        <Link className="rounded-xl px-3 py-2 font-medium text-slate-600 hover:bg-slate-100" href="/finance/transactions">Transactions</Link>
        <Link className="rounded-xl px-3 py-2 font-medium text-slate-600 hover:bg-slate-100" href="/finance/reports">Reports</Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard title="Total Withdrawn" value={formatKes(totalWithdrawals)} variant="warning" />
        <StatsCard title="This Month" value={formatKes(thisMonthWithdrawals)} variant="warning" />
        <StatsCard title="Withdrawals" value={`${withdrawals.length}`} variant="info" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input placeholder="Search withdrawals..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">All Categories</option>
              {WITHDRAWAL_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
              ))}
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <EmptyState
                  icon={<Wallet className="h-8 w-8" />}
                  title="No withdrawals recorded"
                  description="Record withdrawals to track money leaving the business."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Withdrawn By</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-20 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((w) => (
                      <TableRow key={w.id}>
                        <TableCell className="text-xs text-slate-500">
                          {w.withdrawalDate ? new Date(w.withdrawalDate).toLocaleDateString() : "-"}
                        </TableCell>
                        <TableCell className="font-medium">{w.reason}</TableCell>
                        <TableCell>
                          <Badge variant="default" className="text-xs">
                            {CATEGORY_LABELS[w.category] || w.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-500">{w.withdrawnByName}</TableCell>
                        <TableCell className="text-right font-semibold text-amber-600">
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
              )}
            </CardContent>
          </Card>
        </div>

        <ChartCard title="By Category">
          <FinancePieChart data={categoryData} height={300} />
        </ChartCard>
      </div>

      <Dialog open={showForm} onClose={() => setShowForm(false)}>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-slate-900">{editing ? "Edit Withdrawal" : "Record Withdrawal"}</h2>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={formCategory} onChange={(e) => setFormCategory(e.target.value as WithdrawalCategory)}>
                  {WITHDRAWAL_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Amount (KES)</Label>
                <Input type="number" min="0" step="0.01" placeholder="0" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Input placeholder="Why was this withdrawn?" value={formReason} onChange={(e) => setFormReason(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea placeholder="Additional details..." value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : editing ? "Update" : "Record Withdrawal"}</Button>
            </div>
          </form>
        </div>
      </Dialog>
    </div>
  );
}
