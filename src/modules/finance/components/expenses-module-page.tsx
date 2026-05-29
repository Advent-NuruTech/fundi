"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, Receipt, Search, X } from "lucide-react";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import { listenExpenses, createExpense, updateExpense, deleteExpense } from "@/services/expenses.service";
import { calculateExpenses, expensesByCategory } from "@/services/finance.service";
import type { Expense, ExpenseCategory } from "@/types/domain";
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

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "rent", "salaries", "transport", "utilities", "inventory_purchases", "marketing", "maintenance", "miscellaneous",
];

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  rent: "Rent",
  salaries: "Salaries",
  transport: "Transport",
  utilities: "Utilities",
  inventory_purchases: "Inventory Purchases",
  marketing: "Marketing",
  maintenance: "Maintenance",
  miscellaneous: "Miscellaneous",
};

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  rent: "#059669",
  salaries: "#3b82f6",
  transport: "#f59e0b",
  utilities: "#8b5cf6",
  inventory_purchases: "#ef4444",
  marketing: "#ec4899",
  maintenance: "#14b8a6",
  miscellaneous: "#94a3b8",
};

export function ExpensesModulePage() {
  const { businessId, ready } = useBusinessContext();
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Form state
  const [formCategory, setFormCategory] = useState<ExpenseCategory>("miscellaneous");
  const [formAmount, setFormAmount] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formSupplier, setFormSupplier] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ready) return;
    return listenExpenses(businessId, setExpenses);
  }, [businessId, ready]);

  const filtered = useMemo(() => {
    let result = expenses;
    if (categoryFilter !== "all") {
      result = result.filter((e) => e.category === categoryFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((e) => e.description.toLowerCase().includes(q) || (e.supplierName || "").toLowerCase().includes(q));
    }
    return result;
  }, [expenses, categoryFilter, search]);

  const totalExpenses = useMemo(() => calculateExpenses(expenses), [expenses]);
  const categoryData = useMemo(() => {
    const byCat = expensesByCategory(expenses);
    return Object.entries(byCat).map(([name, value]) => ({
      name: CATEGORY_LABELS[name as ExpenseCategory] || name,
      value,
      color: CATEGORY_COLORS[name as ExpenseCategory],
    }));
  }, [expenses]);

  const thisMonthExpenses = useMemo(() => {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return calculateExpenses(expenses, start, new Date());
  }, [expenses]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !formAmount || !formDescription) return;
    setSaving(true);

    try {
      const amount = parseFloat(formAmount);
      if (editing) {
        await updateExpense(businessId, editing.id, {
          category: formCategory,
          amount,
          description: formDescription,
          notes: formNotes,
          supplierName: formSupplier,
          expenseDate: editing.expenseDate,
        });
      } else {
        await createExpense(businessId, {
          category: formCategory,
          amount,
          description: formDescription,
          notes: formNotes,
          supplierName: formSupplier,
          expenseDate: new Date(),
          actorUid: user.uid,
          actorName: user.displayName,
        });
      }
      resetForm();
    } catch (err) {
      console.error("Failed to save expense:", err);
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setShowForm(false);
    setEditing(null);
    setFormCategory("miscellaneous");
    setFormAmount("");
    setFormDescription("");
    setFormNotes("");
    setFormSupplier("");
  }

  function handleEdit(expense: Expense) {
    setEditing(expense);
    setFormCategory(expense.category);
    setFormAmount(expense.amount.toString());
    setFormDescription(expense.description);
    setFormNotes(expense.notes || "");
    setFormSupplier(expense.supplierName || "");
    setShowForm(true);
  }

  async function handleDelete(expenseId: string) {
    if (!confirm("Delete this expense?")) return;
    try {
      await deleteExpense(businessId, expenseId);
    } catch (err) {
      console.error("Failed to delete expense:", err);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Expenses</h1>
          <p className="text-sm text-slate-500">Track and manage business expenses</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Add Expense
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 text-sm">
        <Link className="rounded-xl px-3 py-2 font-medium text-slate-600 hover:bg-slate-100" href="/finance">Overview</Link>
        <Link className="rounded-xl bg-slate-900 px-3 py-2 font-medium text-white" href="/finance/expenses">Expenses</Link>
        <Link className="rounded-xl px-3 py-2 font-medium text-slate-600 hover:bg-slate-100" href="/finance/withdrawals">Withdrawals</Link>
        <Link className="rounded-xl px-3 py-2 font-medium text-slate-600 hover:bg-slate-100" href="/finance/transactions">Transactions</Link>
        <Link className="rounded-xl px-3 py-2 font-medium text-slate-600 hover:bg-slate-100" href="/finance/reports">Reports</Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard title="Total Expenses" value={formatKes(totalExpenses)} variant="danger" />
        <StatsCard title="This Month" value={formatKes(thisMonthExpenses)} variant="warning" />
        <StatsCard title="Categories" value={`${categoryData.length}`} variant="info" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search expenses..."
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
            <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">All Categories</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
              ))}
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <EmptyState
                  icon={<Receipt className="h-8 w-8" />}
                  title="No expenses recorded"
                  description="Add your first expense to start tracking."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-20 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell className="text-xs text-slate-500">
                          {expense.expenseDate?.toDate?.().toLocaleDateString() ?? "-"}
                        </TableCell>
                        <TableCell className="font-medium">{expense.description}</TableCell>
                        <TableCell>
                          <Badge variant="default" className="text-xs">
                            {CATEGORY_LABELS[expense.category] || expense.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-500">{expense.supplierName || "-"}</TableCell>
                        <TableCell className="text-right font-semibold text-rose-600">
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
              )}
            </CardContent>
          </Card>
        </div>

        <ChartCard title="By Category">
          <FinancePieChart data={categoryData} height={300} />
        </ChartCard>
      </div>

      {/* Add/Edit Expense Dialog */}
      <Dialog open={showForm} onClose={() => setShowForm(false)}>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-slate-900">{editing ? "Edit Expense" : "Add Expense"}</h2>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={formCategory} onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)}>
                  {EXPENSE_CATEGORIES.map((cat) => (
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
              <Label>Description</Label>
              <Input placeholder="What was this expense for?" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Supplier (optional)</Label>
              <Input placeholder="Supplier name" value={formSupplier} onChange={(e) => setFormSupplier(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea placeholder="Additional details..." value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : editing ? "Update" : "Add Expense"}</Button>
            </div>
          </form>
        </div>
      </Dialog>
    </div>
  );
}
