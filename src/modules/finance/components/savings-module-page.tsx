"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, PiggyBank, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import {
  listenSavingsGoals,
  listenSavingsDeposits,
  createSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
  createSavingsDeposit,
  deleteSavingsDeposit,
} from "@/lib/supabase.service";
import type { SavingsGoal, SavingsDeposit } from "@/types/domain";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { StatsCard } from "@/components/ui/stats-card";
import { formatKes } from "@/lib/utils";
import { useAuth } from "@/features/auth/components/auth-context";

const GOAL_COLORS = ["#059669", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#ec4899", "#14b8a6", "#f97316"];

const NAV_LINKS = [
  { href: "/finance", label: "Overview" },
  { href: "/finance/expenses", label: "Expenses" },
  { href: "/finance/withdrawals", label: "Withdrawals" },
  { href: "/finance/investments", label: "Investments" },
  { href: "/finance/savings", label: "Savings" },
  { href: "/finance/transactions", label: "Transactions" },
  { href: "/finance/reports", label: "Reports" },
];

function ProgressBar({ current, target, color }: { current: number; target: number; color: string }) {
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  return (
    <div className="relative h-3 w-full rounded-full bg-slate-100 overflow-hidden">
      <div
        className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

function GoalCard({
  goal,
  onDeposit,
  onEdit,
  onDelete,
}: {
  goal: SavingsGoal;
  onDeposit: (goal: SavingsGoal) => void;
  onEdit: (goal: SavingsGoal) => void;
  onDelete: (goalId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deposits, setDeposits] = useState<SavingsDeposit[]>([]);
  const { businessId } = useBusinessContext();
  const pct = goal.targetAmount > 0 ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : 0;
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  const isComplete = goal.status === "completed" || pct >= 100;

  useEffect(() => {
    if (!expanded) return;
    return listenSavingsDeposits(businessId, goal.id, setDeposits);
  }, [expanded, businessId, goal.id]);

  return (
    <Card className={`border-l-4 transition-all`} style={{ borderLeftColor: goal.color }}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 truncate">{goal.name}</h3>
              {isComplete && (
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium shrink-0">
                  Done!
                </span>
              )}
            </div>
            {goal.description && (
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{goal.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!isComplete && (
              <Button size="sm" variant="outline" onClick={() => onDeposit(goal)} className="text-xs h-7 px-2">
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => onEdit(goal)} className="h-7 w-7 p-0">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(goal.id)} className="h-7 w-7 p-0">
              <Trash2 className="h-3.5 w-3.5 text-rose-500" />
            </Button>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-3 space-y-1.5">
          <ProgressBar current={goal.currentAmount} target={goal.targetAmount} color={goal.color} />
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold" style={{ color: goal.color }}>
              {formatKes(goal.currentAmount)} saved
            </span>
            <span className="text-slate-500">Target: {formatKes(goal.targetAmount)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{pct.toFixed(1)}% complete</span>
            {remaining > 0 && <span>{formatKes(remaining)} to go</span>}
            {goal.deadline && (
              <span>Deadline: {new Date(goal.deadline).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })}</span>
            )}
          </div>
        </div>

        {/* Expand deposits */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {expanded ? "Hide deposit history" : "View deposit history"}
        </button>

        {expanded && (
          <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
            {deposits.length === 0 ? (
              <p className="text-xs text-slate-400">No deposits yet.</p>
            ) : (
              deposits.map((dep) => (
                <div key={dep.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium text-emerald-600">+{formatKes(dep.amount)}</span>
                    {dep.notes && <span className="text-slate-500 ml-2 text-xs">{dep.notes}</span>}
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(dep.depositDate).toLocaleDateString("en-KE", { day: "2-digit", month: "short" })}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SavingsModulePage() {
  const { businessId, ready } = useBusinessContext();
  const { user } = useAuth();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);

  // Goal form
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalDeadline, setGoalDeadline] = useState("");
  const [goalDescription, setGoalDescription] = useState("");
  const [goalColor, setGoalColor] = useState(GOAL_COLORS[0]);
  const [savingGoal, setSavingGoal] = useState(false);

  // Deposit form
  const [depositGoal, setDepositGoal] = useState<SavingsGoal | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositNotes, setDepositNotes] = useState("");
  const [depositDate, setDepositDate] = useState(new Date().toISOString().slice(0, 10));
  const [savingDeposit, setSavingDeposit] = useState(false);

  useEffect(() => {
    if (!ready) return;
    return listenSavingsGoals(businessId, setGoals);
  }, [businessId, ready]);

  const totalTargeted = useMemo(() => goals.reduce((s, g) => s + g.targetAmount, 0), [goals]);
  const totalSaved = useMemo(() => goals.reduce((s, g) => s + g.currentAmount, 0), [goals]);
  const completedGoals = useMemo(() => goals.filter((g) => g.status === "completed").length, [goals]);

  function resetGoalForm() {
    setShowGoalForm(false);
    setEditingGoal(null);
    setGoalName("");
    setGoalTarget("");
    setGoalDeadline("");
    setGoalDescription("");
    setGoalColor(GOAL_COLORS[0]);
  }

  function handleEditGoal(goal: SavingsGoal) {
    setEditingGoal(goal);
    setGoalName(goal.name);
    setGoalTarget(goal.targetAmount.toString());
    setGoalDeadline(goal.deadline ?? "");
    setGoalDescription(goal.description ?? "");
    setGoalColor(goal.color);
    setShowGoalForm(true);
  }

  async function handleGoalSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !goalName || !goalTarget) {
      toast.error("Please fill in all required fields.");
      return;
    }
    const target = parseFloat(goalTarget);
    if (isNaN(target) || target <= 0) {
      toast.error("Please enter a valid target amount.");
      return;
    }
    setSavingGoal(true);
    try {
      if (editingGoal) {
        await updateSavingsGoal(businessId, editingGoal.id, {
          name: goalName,
          targetAmount: target,
          deadline: goalDeadline || undefined,
          description: goalDescription,
          color: goalColor,
        });
        toast.success("Savings goal updated.");
      } else {
        await createSavingsGoal(businessId, {
          name: goalName,
          targetAmount: target,
          deadline: goalDeadline || undefined,
          description: goalDescription,
          color: goalColor,
          actorUid: user.uid,
          actorName: user.displayName,
        });
        toast.success("Savings goal created!");
      }
      resetGoalForm();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save goal");
    } finally {
      setSavingGoal(false);
    }
  }

  async function handleDeleteGoal(goalId: string) {
    if (!confirm("Delete this savings goal and all its deposits? This cannot be undone.")) return;
    try {
      await deleteSavingsGoal(businessId, goalId);
      toast.success("Goal deleted.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  async function handleDepositSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!depositGoal || !user || !depositAmount) {
      toast.error("Please fill in all required fields.");
      return;
    }
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }
    setSavingDeposit(true);
    try {
      await createSavingsDeposit(businessId, {
        goalId: depositGoal.id,
        amount,
        notes: depositNotes,
        depositDate: new Date(depositDate),
        actorUid: user.uid,
        actorName: user.displayName,
      });
      toast.success(`${formatKes(amount)} added to "${depositGoal.name}"!`);
      setDepositGoal(null);
      setDepositAmount("");
      setDepositNotes("");
      setDepositDate(new Date().toISOString().slice(0, 10));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to record deposit");
    } finally {
      setSavingDeposit(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Savings</h1>
          <p className="text-sm text-slate-500">Set saving goals and track your progress</p>
        </div>
        <Button onClick={() => { resetGoalForm(); setShowGoalForm(true); }} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          New Goal
        </Button>
      </div>

      {/* Nav tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 text-sm overflow-x-auto">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            className={`rounded-xl px-3 py-2 font-medium whitespace-nowrap ${link.href === "/finance/savings" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            href={link.href}
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Stats — 2 columns on mobile, 3 on sm+ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatsCard title="Total Targeted" value={formatKes(totalTargeted)} variant="info" />
        <StatsCard title="Total Saved" value={formatKes(totalSaved)} variant="success" />
        <StatsCard title="Goals Completed" value={`${completedGoals}`} variant="success" />
      </div>

      {/* Goals grid */}
      {goals.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={<PiggyBank className="h-8 w-8" />}
              title="No savings goals yet"
              description="Create a savings goal to start building your business financial cushion."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onDeposit={setDepositGoal}
              onEdit={handleEditGoal}
              onDelete={handleDeleteGoal}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Goal Dialog */}
      <Dialog open={showGoalForm} onClose={() => setShowGoalForm(false)}>
        <div className="p-6 max-w-md">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">
            {editingGoal ? "Edit Savings Goal" : "Create Savings Goal"}
          </h2>
          <p className="text-sm text-slate-500 mb-5">
            Set a clear target to help you save money step by step.
          </p>
          <form onSubmit={handleGoalSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Goal Name <span className="text-rose-500">*</span></Label>
              <Input
                placeholder="e.g. New sewing machine fund"
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Target Amount (KES) <span className="text-rose-500">*</span></Label>
                <Input
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="e.g. 100000"
                  value={goalTarget}
                  onChange={(e) => setGoalTarget(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Deadline <span className="text-slate-400 font-normal">(optional)</span></Label>
                <Input
                  type="date"
                  value={goalDeadline}
                  onChange={(e) => setGoalDeadline(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Input
                placeholder="What are you saving for?"
                value={goalDescription}
                onChange={(e) => setGoalDescription(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {GOAL_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setGoalColor(color)}
                    className={`h-7 w-7 rounded-full border-2 transition-all ${goalColor === color ? "border-slate-700 scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setShowGoalForm(false)}>Cancel</Button>
              <Button type="submit" disabled={savingGoal}>
                {savingGoal ? "Saving…" : editingGoal ? "Update Goal" : "Create Goal"}
              </Button>
            </div>
          </form>
        </div>
      </Dialog>

      {/* Deposit Dialog */}
      <Dialog open={!!depositGoal} onClose={() => setDepositGoal(null)}>
        <div className="p-6 max-w-md">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">
            Add Money to "{depositGoal?.name}"
          </h2>
          <div className="mb-4 p-3 rounded-lg bg-slate-50">
            <ProgressBar
              current={depositGoal?.currentAmount ?? 0}
              target={depositGoal?.targetAmount ?? 0}
              color={depositGoal?.color ?? "#059669"}
            />
            <div className="flex justify-between text-sm mt-1.5">
              <span className="font-medium">{formatKes(depositGoal?.currentAmount ?? 0)} saved</span>
              <span className="text-slate-500">of {formatKes(depositGoal?.targetAmount ?? 0)}</span>
            </div>
          </div>
          <form onSubmit={handleDepositSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount to Add (KES) <span className="text-rose-500">*</span></Label>
                <Input
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="e.g. 5000"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={depositDate}
                  onChange={(e) => setDepositDate(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Input
                placeholder="e.g. Week 3 savings"
                value={depositNotes}
                onChange={(e) => setDepositNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setDepositGoal(null)}>Cancel</Button>
              <Button type="submit" disabled={savingDeposit}>
                {savingDeposit ? "Adding…" : "Add Money"}
              </Button>
            </div>
          </form>
        </div>
      </Dialog>
    </div>
  );
}
