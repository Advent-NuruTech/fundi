"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, Receipt, Search, X } from "lucide-react";
import { toast } from "sonner";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import { listenExpenses, createExpense, updateExpense, deleteExpense } from "@/services/expenses.service";
import { calculateExpenses, expensesByCategory } from "@/services/finance.service";
import type { Expense } from "@/types/domain";
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
import { FinancePieChart, ChartCard } from "@/components/ui/finance-chart";
import { formatKes } from "@/lib/utils";
import { useAuth } from "@/features/auth/components/auth-context";

const PRESET_CATEGORIES = [
  "Rent",
  "Salaries",
  "Transport",
  "Utilities",
  "Inventory Purchases",
  "Marketing",
  "Maintenance",
  "Miscellaneous",
];

const CATEGORY_COLORS: Record<string, string> = {
  Rent: "#059669",
  Salaries: "#3b82f6",
  Transport: "#f59e0b",
  Utilities: "#8b5cf6",
  "Inventory Purchases": "#ef4444",
  Marketing: "#ec4899",
  Maintenance: "#14b8a6",
  Miscellaneous: "#94a3b8",
};

const FALLBACK_COLORS = ["#6366f1", "#f97316", "#84cc16", "#0ea5e9", "#e879f9", "#fb923c"];

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

export function ExpensesModulePage() {
  const { businessId, ready } = useBusinessContext();
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Form state
  const [formCategory, setFormCategory] = useState("Miscellaneous");
  const [customCategory, setCustomCategory] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [formAmount, setFormAmount] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formSupplier, setFormSupplier] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ready) return;
    return listenExpenses(businessId, setExpenses);
  }, [businessId, ready]);

  // Collect all categories (presets + any custom ones already in use)
  const allCategories = useMemo(() => {
    const existing = new Set(expenses.map((e) => e.category));
    const merged = new Set([...PRESET_CATEGORIES, ...existing]);
    return Array.from(merged).sort();
  }, [expenses]);

  const filtered = useMemo(() => {
    let result = expenses;
    if (categoryFilter !== "all") {
      result = result.filter((e) => e.category === categoryFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          (e.supplierName || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [expenses, categoryFilter, search]);

  const totalExpenses = useMemo(() => calculateExpenses(expenses), [expenses]);

  const thisMonthExpenses = useMemo(() => {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return calculateExpenses(expenses, start, new Date());
  }, [expenses]);

  const categoryData = useMemo(() => {
    const byCat = expensesByCategory(expenses);
    return Object.entries(byCat).map(([name, value], i) => ({
      name,
      value,
      color: getCategoryColor(name, i),
    }));
  }, [expenses]);

  function getEffectiveCategory() {
    return isCustom ? customCategory.trim() : formCategory;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const category = getEffectiveCategory();
    if (!user || !formAmount || !formDescription || !category) {
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
        await updateExpense(businessId, editing.id, {
          category,
          amount,
          description: formDescription,
          notes: formNotes,
          supplierName: formSupplier,
          expenseDate: formDate,
        });
        toast.success("Expense updated successfully.");
      } else {
        await createExpense(businessId, {
          category,
          amount,
          description: formDescription,
          notes: formNotes,
          supplierName: formSupplier,
          expenseDate: new Date(formDate),
          actorUid: user.uid,
          actorName: user.displayName,
        });
        toast.success("Expense added successfully.");
      }
      resetForm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as any)?.message ?? "Something went wrong";
      toast.error(`Failed to save expense: ${msg}`);
      console.error("Expense save error:", err);
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setShowForm(false);
    setEditing(null);
    setFormCategory("Miscellaneous");
    setCustomCategory("");
    setIsCustom(false);
    setFormAmount("");
    setFormDescription("");
    setFormNotes("");
    setFormSupplier("");
    setFormDate(new Date().toISOString().slice(0, 10));
  }

  function handleEdit(expense: Expense) {
    setEditing(expense);
    const isPreset = PRESET_CATEGORIES.includes(expense.category);
    setIsCustom(!isPreset);
    setFormCategory(isPreset ? expense.category : "Miscellaneous");
    setCustomCategory(isPreset ? "" : expense.category);
    setFormAmount(expense.amount.toString());
    setFormDescription(expense.description);
    setFormNotes(expense.notes || "");
    setFormSupplier(expense.supplierName || "");
    setFormDate(expense.expenseDate ? expense.expenseDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setShowForm(true);
  }

  async function handleDelete(expenseId: string) {
    if (!confirm("Delete this expense? This cannot be undone.")) return;
    try {
      await deleteExpense(businessId, expenseId);
      toast.success("Expense deleted.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete";
      toast.error(msg);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Expenses</h1>
          <p className="text-sm text-slate-500">Record and track all money spent by your business</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Add Expense
        </Button>
      </div>

      {/* Nav tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 text-sm overflow-x-auto">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            className={`rounded-xl px-3 py-2 font-medium whitespace-nowrap ${link.href === "/finance/expenses" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            href={link.href}
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Stats — 2 columns on mobile, 3 on sm+ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatsCard title="Total Expenses" value={formatKes(totalExpenses)} variant="danger" />
        <StatsCard title="This Month" value={formatKes(thisMonthExpenses)} variant="warning" />
        <StatsCard title="Categories Used" value={`${categoryData.length}`} variant="info" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {/* Search + filter */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by description, category or supplier…"
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
                  icon={<Receipt className="h-8 w-8" />}
                  title="No expenses found"
                  description={search || categoryFilter !== "all" ? "Try changing your search or filter." : "Add your first expense to start tracking."}
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="hidden sm:table-cell">Category</TableHead>
                        <TableHead className="hidden md:table-cell">Supplier</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="w-16 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                            {expense.expenseDate ? new Date(expense.expenseDate).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "2-digit" }) : "-"}
                          </TableCell>
                          <TableCell className="font-medium max-w-[160px] truncate">
                            {expense.description}
                            <div className="sm:hidden text-xs text-slate-400 mt-0.5">{expense.category}</div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant="default" className="text-xs">
                              {expense.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-slate-500 text-sm">{expense.supplierName || "—"}</TableCell>
                          <TableCell className="text-right font-semibold text-rose-600 whitespace-nowrap">
                            -{formatKes(expense.amount)}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleEdit(expense)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(expense.id)}>
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

      {/* Add / Edit Expense Dialog */}
      <Dialog open={showForm} onClose={() => setShowForm(false)}>
        <div className="p-6 max-w-lg">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">
            {editing ? "Edit Expense" : "Add New Expense"}
          </h2>
          <p className="text-sm text-slate-500 mb-5">
            {editing ? "Update the details for this expense." : "Record money your business has spent."}
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Category */}
            <div className="space-y-1.5">
              <Label>Category <span className="text-rose-500">*</span></Label>
              <div className="flex gap-2 items-start">
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
                  className="flex-1"
                >
                  {PRESET_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="__custom__">+ Add custom category</option>
                </Select>
              </div>
              {isCustom && (
                <Input
                  placeholder="Type your category name e.g. School Fees"
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
                  placeholder="e.g. 5000"
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

            {/* Description */}
            <div className="space-y-1.5">
              <Label>What was this expense for? <span className="text-rose-500">*</span></Label>
              <Input
                placeholder="e.g. Monthly rent payment for the shop"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                required
              />
            </div>

            {/* Supplier */}
            <div className="space-y-1.5">
              <Label>Supplier / Paid To <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Input
                placeholder="e.g. Nairobi Power"
                value={formSupplier}
                onChange={(e) => setFormSupplier(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Extra notes <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Textarea
                placeholder="Any extra details about this expense…"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : editing ? "Update Expense" : "Add Expense"}
              </Button>
            </div>
          </form>
        </div>
      </Dialog>
    </div>
  );
}
