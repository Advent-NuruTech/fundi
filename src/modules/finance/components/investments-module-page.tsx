"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, TrendingUp, Search, X, CheckCircle, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import {
  listenInvestments,
  createInvestment,
  updateInvestment,
  deleteInvestment,
} from "@/lib/supabase.service";
import type { Investment } from "@/types/domain";
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
import { formatKes } from "@/lib/utils";
import { useAuth } from "@/features/auth/components/auth-context";

const INVESTMENT_TYPES = [
  "Equipment",
  "Stock / Inventory",
  "Training",
  "Technology",
  "Marketing",
  "Property",
  "Other",
];

const STATUS_CONFIG = {
  active: { label: "Active", icon: Clock, color: "text-blue-600 bg-blue-50" },
  completed: { label: "Completed", icon: CheckCircle, color: "text-emerald-600 bg-emerald-50" },
  cancelled: { label: "Cancelled", icon: XCircle, color: "text-slate-500 bg-slate-100" },
};

const NAV_LINKS = [
  { href: "/finance", label: "Overview" },
  { href: "/finance/expenses", label: "Expenses" },
  { href: "/finance/withdrawals", label: "Withdrawals" },
  { href: "/finance/investments", label: "Investments" },
  { href: "/finance/savings", label: "Savings" },
  { href: "/finance/transactions", label: "Transactions" },
  { href: "/finance/reports", label: "Reports" },
];

export function InvestmentsModulePage() {
  const { businessId, ready } = useBusinessContext();
  const { user } = useAuth();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Investment | null>(null);
  const [search, setSearch] = useState("");

  const [formType, setFormType] = useState("Equipment");
  const [customType, setCustomType] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [formAmount, setFormAmount] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formReturnExpected, setFormReturnExpected] = useState("");
  const [formReturnActual, setFormReturnActual] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formStatus, setFormStatus] = useState<Investment["status"]>("active");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ready) return;
    return listenInvestments(businessId, setInvestments);
  }, [businessId, ready]);

  const filtered = useMemo(() => {
    if (!search) return investments;
    const q = search.toLowerCase();
    return investments.filter(
      (inv) =>
        inv.description.toLowerCase().includes(q) ||
        inv.type.toLowerCase().includes(q)
    );
  }, [investments, search]);

  const totalInvested = useMemo(() => investments.reduce((s, i) => s + i.amount, 0), [investments]);
  const totalReturns = useMemo(() => investments.reduce((s, i) => s + (i.returnActual ?? 0), 0), [investments]);
  const activeCount = useMemo(() => investments.filter((i) => i.status === "active").length, [investments]);

  function getEffectiveType() {
    return isCustom ? customType.trim() : formType;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const type = getEffectiveType();
    if (!user || !formAmount || !formDescription || !type) {
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
        await updateInvestment(businessId, editing.id, {
          type,
          amount,
          description: formDescription,
          notes: formNotes,
          investmentDate: formDate,
          returnExpected: formReturnExpected ? parseFloat(formReturnExpected) : 0,
          returnActual: formReturnActual ? parseFloat(formReturnActual) : 0,
          status: formStatus,
        });
        toast.success("Investment updated.");
      } else {
        await createInvestment(businessId, {
          type,
          amount,
          description: formDescription,
          notes: formNotes,
          investmentDate: new Date(formDate),
          returnExpected: formReturnExpected ? parseFloat(formReturnExpected) : 0,
          actorUid: user.uid,
          actorName: user.displayName,
        });
        toast.success("Investment recorded.");
      }
      resetForm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as any)?.message ?? "Something went wrong";
      toast.error(`Failed to save investment: ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setShowForm(false);
    setEditing(null);
    setFormType("Equipment");
    setCustomType("");
    setIsCustom(false);
    setFormAmount("");
    setFormDescription("");
    setFormNotes("");
    setFormReturnExpected("");
    setFormReturnActual("");
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormStatus("active");
  }

  function handleEdit(inv: Investment) {
    setEditing(inv);
    const isPreset = INVESTMENT_TYPES.includes(inv.type);
    setIsCustom(!isPreset);
    setFormType(isPreset ? inv.type : "Equipment");
    setCustomType(isPreset ? "" : inv.type);
    setFormAmount(inv.amount.toString());
    setFormDescription(inv.description);
    setFormNotes(inv.notes || "");
    setFormReturnExpected(inv.returnExpected?.toString() ?? "");
    setFormReturnActual(inv.returnActual?.toString() ?? "");
    setFormDate(inv.investmentDate ? inv.investmentDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setFormStatus(inv.status);
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this investment record? This cannot be undone.")) return;
    try {
      await deleteInvestment(businessId, id);
      toast.success("Investment deleted.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Investments</h1>
          <p className="text-sm text-slate-500">Track money put back into growing your business</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Record Investment
        </Button>
      </div>

      {/* Nav tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 text-sm overflow-x-auto">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            className={`rounded-xl px-3 py-2 font-medium whitespace-nowrap ${link.href === "/finance/investments" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            href={link.href}
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Stats — 2 columns on mobile, 3 on sm+ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatsCard title="Total Invested" value={formatKes(totalInvested)} variant="info" />
        <StatsCard title="Returns So Far" value={formatKes(totalReturns)} variant="success" />
        <StatsCard title="Active" value={`${activeCount}`} variant="info" />
      </div>

      {/* Return on investment card */}
      {totalInvested > 0 && (
        <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-700 font-medium">Return on Investment (ROI)</p>
                <p className="text-2xl font-bold text-emerald-800 mt-0.5">
                  {totalInvested > 0 ? ((totalReturns / totalInvested) * 100).toFixed(1) : "0.0"}%
                </p>
              </div>
              <TrendingUp className="h-10 w-10 text-emerald-400" />
            </div>
            <p className="text-xs text-emerald-600 mt-2">
              You invested {formatKes(totalInvested)} and got back {formatKes(totalReturns)} so far.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search investments…"
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

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<TrendingUp className="h-8 w-8" />}
              title="No investments recorded"
              description="Record investments to track how you are growing your business."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="hidden sm:table-cell">Type</TableHead>
                    <TableHead className="hidden md:table-cell">Status</TableHead>
                    <TableHead className="text-right">Invested</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Returns</TableHead>
                    <TableHead className="w-16 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((inv) => {
                    const statusCfg = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.active;
                    const roi = inv.amount > 0 ? ((inv.returnActual ?? 0) / inv.amount) * 100 : 0;
                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                          {inv.investmentDate ? new Date(inv.investmentDate).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "2-digit" }) : "-"}
                        </TableCell>
                        <TableCell className="font-medium max-w-[160px] truncate">
                          {inv.description}
                          <div className="sm:hidden text-xs text-slate-400 mt-0.5">{inv.type}</div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="default" className="text-xs">{inv.type}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.color}`}>
                            {statusCfg.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-blue-600 whitespace-nowrap">
                          {formatKes(inv.amount)}
                        </TableCell>
                        <TableCell className="text-right hidden sm:table-cell">
                          <div className="text-emerald-600 font-semibold">{formatKes(inv.returnActual ?? 0)}</div>
                          {roi !== 0 && (
                            <div className={`text-xs ${roi >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                              {roi >= 0 ? "+" : ""}{roi.toFixed(1)}%
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(inv)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(inv.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onClose={() => setShowForm(false)}>
        <div className="p-6 max-w-lg">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">
            {editing ? "Edit Investment" : "Record Investment"}
          </h2>
          <p className="text-sm text-slate-500 mb-5">
            Track money you put into the business to make it grow.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type */}
            <div className="space-y-1.5">
              <Label>Investment Type <span className="text-rose-500">*</span></Label>
              <Select
                value={isCustom ? "__custom__" : formType}
                onChange={(e) => {
                  if (e.target.value === "__custom__") {
                    setIsCustom(true);
                  } else {
                    setIsCustom(false);
                    setFormType(e.target.value);
                  }
                }}
              >
                {INVESTMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
                <option value="__custom__">+ Add custom type</option>
              </Select>
              {isCustom && (
                <Input
                  placeholder="e.g. Land purchase"
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  autoFocus
                  required
                />
              )}
            </div>

            {/* Amount + Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount Invested (KES) <span className="text-rose-500">*</span></Label>
                <Input
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="e.g. 50000"
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
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>What is this investment? <span className="text-rose-500">*</span></Label>
              <Input
                placeholder="e.g. Bought a new sewing machine"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                required
              />
            </div>

            {/* Expected return + Actual return */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Expected Return (KES) <span className="text-slate-400 font-normal">(optional)</span></Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 80000"
                  value={formReturnExpected}
                  onChange={(e) => setFormReturnExpected(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Actual Returns (KES)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 75000"
                  value={formReturnActual}
                  onChange={(e) => setFormReturnActual(e.target.value)}
                />
              </div>
            </div>

            {/* Status (only when editing) */}
            {editing && (
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={formStatus} onChange={(e) => setFormStatus(e.target.value as Investment["status"])}>
                  <option value="active">Active — still running</option>
                  <option value="completed">Completed — finished and returned</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Notes <span className="text-slate-400 font-normal">(optional)</span></Label>
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
                {saving ? "Saving…" : editing ? "Update" : "Record Investment"}
              </Button>
            </div>
          </form>
        </div>
      </Dialog>
    </div>
  );
}
