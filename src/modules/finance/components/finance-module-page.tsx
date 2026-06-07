"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  Package,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Calendar,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import { useFinancePermissions } from "@/modules/shared/use-finance-permissions";
import { listenAllFinanceData, type FinanceData } from "@/services/finance.service";
import { useWeeklyReport } from "./use-weekly-report";
import {
  calculateRevenue,
  calculateExpenses,
  calculateWithdrawals,
  calculateInventoryValue,
  calculateOutstandingBalances,
  calculateCashIn,
  calculateCashOut,
  calculateNetProfit,
  calculateProfitMargin,
  calculateExpenseRatio,
  comparePeriods,
  dailyRevenueBreakdown,
  dailyExpenseBreakdown,
  expensesByCategory,
  generateFinanceAlerts,
  calculateHealthScore,
  calculateTrend,
  calculatePayrollLiability,
  payrollAlerts,
} from "@/services/finance.service";
import { lowStockMaterials, dueTodayOrders } from "@/services/firestore.service";
import { StatsCard } from "@/components/ui/stats-card";
import { ChartCard, FinanceAreaChart, FinancePieChart } from "@/components/ui/finance-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatKes } from "@/lib/utils";

// ─── NAV LINKS (access gates applied per-render via useFinancePermissions) ───
const ALL_NAV_LINKS = [
  { href: "/finance", label: "Overview", ownerOnly: false },
  { href: "/finance/expenses", label: "Expenses", ownerOnly: false },
  { href: "/finance/withdrawals", label: "Withdrawals", ownerOnly: false },
  { href: "/finance/investments", label: "Investments", ownerOnly: true, permKey: "canSeeInvestments" as const },
  { href: "/finance/savings", label: "Savings", ownerOnly: true, permKey: "canSeeSavings" as const },
  { href: "/finance/transactions", label: "Transactions", ownerOnly: false },
  { href: "/finance/reports", label: "Reports", ownerOnly: true, permKey: "canSeeFinancialReports" as const },
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ─── HELPERS ───
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}
function startOfWeek(d: Date) {
  const day = d.getDay();
  const diff = d.getDate() - day;
  return startOfDay(new Date(d.getFullYear(), d.getMonth(), diff));
}
function addDays(d: Date, n: number) {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

function getPaymentsForRange(payments: FinanceData["payments"], start: Date, end: Date) {
  return payments.filter((p) => {
    const d = p.recordedAt ? new Date(p.recordedAt) : null;
    return d && d >= start && d <= end;
  });
}
function getExpensesForRange(expenses: FinanceData["expenses"], start: Date, end: Date) {
  return expenses.filter((e) => {
    const d = e.expenseDate ? new Date(e.expenseDate) : null;
    return d && d >= start && d <= end;
  });
}
function getWithdrawalsForRange(withdrawals: FinanceData["withdrawals"], start: Date, end: Date) {
  return withdrawals.filter((w) => {
    const d = w.withdrawalDate ? new Date(w.withdrawalDate) : null;
    return d && d >= start && d <= end;
  });
}

// ─── WEEK CALENDAR COMPONENT ───
function WeekCalendar({ data, weekStart }: { data: FinanceData; weekStart: Date }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  const dayData = days.map((day) => {
    const start = startOfDay(day);
    const end = endOfDay(day);
    const rev = getPaymentsForRange(data.payments, start, end).reduce((s, p) => s + p.amount, 0);
    const exp = getExpensesForRange(data.expenses, start, end).reduce((s, e) => s + e.amount, 0);
    const wdl = getWithdrawalsForRange(data.withdrawals, start, end).reduce((s, w) => s + w.amount, 0);
    return { day, rev, exp: exp + wdl, net: rev - exp - wdl };
  });

  const weekRev = dayData.reduce((s, d) => s + d.rev, 0);
  const weekExp = dayData.reduce((s, d) => s + d.exp, 0);
  const weekNet = weekRev - weekExp;
  const maxVal = Math.max(...dayData.map((d) => Math.max(d.rev, d.exp)), 1);

  return (
    <div className="space-y-4">
      {/* Week totals */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
          <p className="text-xs text-emerald-600 font-medium">Week Earnings</p>
          <p className="text-xl font-bold text-emerald-700 mt-0.5">{formatKes(weekRev)}</p>
        </div>
        <div className="rounded-xl bg-rose-50 border border-rose-100 p-3">
          <p className="text-xs text-rose-600 font-medium">Week Spending</p>
          <p className="text-xl font-bold text-rose-700 mt-0.5">{formatKes(weekExp)}</p>
        </div>
        <div className={`rounded-xl border p-3 ${weekNet >= 0 ? "bg-blue-50 border-blue-100" : "bg-orange-50 border-orange-100"}`}>
          <p className={`text-xs font-medium ${weekNet >= 0 ? "text-blue-600" : "text-orange-600"}`}>Week Profit</p>
          <p className={`text-xl font-bold mt-0.5 ${weekNet >= 0 ? "text-blue-700" : "text-orange-700"}`}>{formatKes(weekNet)}</p>
        </div>
      </div>

      {/* Day columns */}
      <div className="grid grid-cols-7 gap-1.5">
        {dayData.map(({ day, rev, exp, net }, i) => {
          const isToday = day.toDateString() === today.toDateString();
          const isFuture = day > today;
          const revPct = (rev / maxVal) * 100;
          const expPct = (exp / maxVal) * 100;
          return (
            <div
              key={i}
              className={`rounded-xl border p-2 text-center flex flex-col gap-1.5 transition-all ${isToday ? "border-emerald-400 bg-emerald-50 ring-1 ring-emerald-300" : isFuture ? "border-slate-100 bg-slate-50 opacity-40" : "border-slate-200 bg-white hover:border-slate-300"}`}
            >
              <div>
                <p className={`text-[10px] font-medium ${isToday ? "text-emerald-700" : "text-slate-500"}`}>{DAYS[day.getDay()]}</p>
                <p className={`text-sm font-bold ${isToday ? "text-emerald-800" : "text-slate-700"}`}>{day.getDate()}</p>
              </div>

              {/* Mini bars */}
              {!isFuture && (
                <div className="space-y-0.5 px-0.5">
                  <div className="relative h-1.5 w-full rounded-full bg-slate-100">
                    <div className="absolute left-0 top-0 h-full rounded-full bg-emerald-500" style={{ width: `${revPct}%` }} />
                  </div>
                  <div className="relative h-1.5 w-full rounded-full bg-slate-100">
                    <div className="absolute left-0 top-0 h-full rounded-full bg-rose-400" style={{ width: `${expPct}%` }} />
                  </div>
                </div>
              )}

              {!isFuture && (rev > 0 || exp > 0) ? (
                <div>
                  {rev > 0 && <p className="text-[9px] font-semibold text-emerald-600 leading-tight">{formatKes(rev)}</p>}
                  {exp > 0 && <p className="text-[9px] text-rose-500 leading-tight">-{formatKes(exp)}</p>}
                  <p className={`text-[9px] font-bold leading-tight ${net >= 0 ? "text-blue-600" : "text-orange-600"}`}>{net >= 0 ? "+" : ""}{formatKes(net)}</p>
                </div>
              ) : !isFuture ? (
                <p className="text-[9px] text-slate-300">—</p>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-slate-500 justify-center">
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />Earnings</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-rose-400" />Spending</span>
      </div>
    </div>
  );
}

// ─── MONTH CALENDAR COMPONENT ───
function MonthCalendar({ data, year, month }: { data: FinanceData; year: number; month: number }) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const today = new Date();

  // Build weeks (each starting Sunday)
  const startPad = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const totalCells = Math.ceil((startPad + daysInMonth) / 7) * 7;

  const cells = Array.from({ length: totalCells }, (_, i) => {
    const dayNum = i - startPad + 1;
    if (dayNum < 1 || dayNum > daysInMonth) return null;
    return new Date(year, month, dayNum);
  });

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <div className="space-y-3">
      {/* Day header */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {DAYS.map((d) => (
          <p key={d} className="text-[10px] font-semibold text-slate-400 uppercase">{d}</p>
        ))}
      </div>
      {weeks.map((week, wi) => {
        const weekDays = week.filter(Boolean) as Date[];
        if (weekDays.length === 0) return null;
        const weekStart2 = startOfDay(weekDays[0]);
        const weekEnd2 = endOfDay(weekDays[weekDays.length - 1]);
        const wRev = getPaymentsForRange(data.payments, weekStart2, weekEnd2).reduce((s, p) => s + p.amount, 0);
        const wExp = getExpensesForRange(data.expenses, weekStart2, weekEnd2).reduce((s, e) => s + e.amount, 0);
        const wWdl = getWithdrawalsForRange(data.withdrawals, weekStart2, weekEnd2).reduce((s, w) => s + w.amount, 0);
        const wNet = wRev - wExp - wWdl;

        return (
          <div key={wi} className="rounded-xl border border-slate-100 p-2 bg-white">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Week {wi + 1}</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-emerald-600 font-medium">{formatKes(wRev)}</span>
                <span className="text-slate-300">|</span>
                <span className="text-rose-500">{formatKes(wExp + wWdl)}</span>
                <span className="text-slate-300">|</span>
                <span className={`font-bold ${wNet >= 0 ? "text-blue-600" : "text-orange-600"}`}>{wNet >= 0 ? "+" : ""}{formatKes(wNet)}</span>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {week.map((day, di) => {
                if (!day) return <div key={di} />;
                const isToday = day.toDateString() === today.toDateString();
                const isFuture = day > today;
                const dRev = isFuture ? 0 : getPaymentsForRange(data.payments, startOfDay(day), endOfDay(day)).reduce((s, p) => s + p.amount, 0);
                const hasActivity = dRev > 0;
                return (
                  <div
                    key={di}
                    className={`rounded-lg text-center py-1.5 text-sm font-medium ${isToday ? "bg-emerald-600 text-white" : hasActivity ? "bg-emerald-50 text-emerald-800" : isFuture ? "text-slate-300" : "text-slate-600"}`}
                  >
                    {day.getDate()}
                    {hasActivity && !isToday && (
                      <div className="mx-auto mt-0.5 h-1 w-1 rounded-full bg-emerald-500" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── YEAR CALENDAR COMPONENT ───
function YearCalendar({ data, year }: { data: FinanceData; year: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {MONTHS.map((monthName, month) => {
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
        const rev = getPaymentsForRange(data.payments, start, end).reduce((s, p) => s + p.amount, 0);
        const exp = getExpensesForRange(data.expenses, start, end).reduce((s, e) => s + e.amount, 0);
        const wdl = getWithdrawalsForRange(data.withdrawals, start, end).reduce((s, w) => s + w.amount, 0);
        const net = rev - exp - wdl;
        const now = new Date();
        const isCurrent = now.getFullYear() === year && now.getMonth() === month;
        const isFuture = start > now;

        return (
          <div
            key={month}
            className={`rounded-xl border p-3 ${isCurrent ? "border-emerald-400 bg-emerald-50" : isFuture ? "border-slate-100 bg-slate-50 opacity-50" : "border-slate-200 bg-white"}`}
          >
            <p className={`text-sm font-bold ${isCurrent ? "text-emerald-800" : "text-slate-700"}`}>{monthName}</p>
            {!isFuture ? (
              <div className="mt-1.5 space-y-0.5">
                <p className="text-xs text-emerald-600">{formatKes(rev)}</p>
                <p className="text-xs text-rose-500">-{formatKes(exp + wdl)}</p>
                <p className={`text-xs font-bold ${net >= 0 ? "text-blue-600" : "text-orange-600"}`}>{net >= 0 ? "+" : ""}{formatKes(net)}</p>
              </div>
            ) : (
              <p className="text-xs text-slate-300 mt-1">—</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── MAIN COMPONENT ───
export function FinanceModulePage() {
  const { businessId, ready } = useBusinessContext();
  const finPerms = useFinancePermissions();
  const [data, setData] = useState<FinanceData | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "week" | "month" | "year">("overview");

  // ─── RESOLVED VISIBILITY FLAGS ───
  const canViewAsOwner = finPerms.hasOwnerAccess;
  const canSeeWeekHistory = canViewAsOwner || finPerms.canSeeWeekEarnings;
  const canSeeMonthHistory = canViewAsOwner || finPerms.canSeeMonthEarnings;
  const canSeeYearHistory = canViewAsOwner || finPerms.canSeeYearEarnings;
  const canSeeOwnerKpis = canViewAsOwner || finPerms.canSeeProfitMargins;
  const canSeeTotalRevenue = canViewAsOwner || finPerms.canSeeTotalRevenue;

  // Filter nav links based on permissions
  const NAV_LINKS = ALL_NAV_LINKS.filter((link) => {
    if (!link.ownerOnly) return true;
    if (canViewAsOwner) return true;
    if (link.permKey) return finPerms[link.permKey] === true;
    return false;
  });

  // Calendar navigation state
  const [calWeekStart, setCalWeekStart] = useState(() => startOfWeek(new Date()));
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());

  useEffect(() => {
    if (!ready) return;
    return listenAllFinanceData(businessId, setData);
  }, [businessId, ready]);

  useWeeklyReport(businessId, data);

  // ─── COMPUTED METRICS ───
  const metrics = useMemo(() => {
    if (!data) return null;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86400000);

    const weekStart = startOfWeek(now);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const todayRevenue = calculateRevenue(data.payments, todayStart, todayEnd);
    const weekRevenue = calculateRevenue(data.payments, weekStart, todayEnd);
    const monthRevenue = calculateRevenue(data.payments, monthStart, todayEnd);
    const yearRevenue = calculateRevenue(data.payments, yearStart, todayEnd);

    const monthExpenses = calculateExpenses(data.expenses, monthStart, todayEnd);
    const monthWithdrawals = calculateWithdrawals(data.withdrawals, monthStart, todayEnd);
    const payrollLiability = calculatePayrollLiability(data.members);
    const totalExpenses = calculateExpenses(data.expenses);
    const totalWithdrawals = calculateWithdrawals(data.withdrawals);

    const inventoryValue = calculateInventoryValue(data.materials);
    const outstandingBalances = calculateOutstandingBalances(data.orders);

    const cashIn = calculateCashIn(data.payments);
    const cashOut = calculateCashOut(data.expenses, data.withdrawals, data.purchaseOrders);

    const monthInventoryCost = 0;
    const netProfit = calculateNetProfit(monthRevenue, monthExpenses + payrollLiability, monthWithdrawals, monthInventoryCost);
    const profitMargin = calculateProfitMargin(monthRevenue, netProfit);
    const expenseRatio = calculateExpenseRatio(monthExpenses + payrollLiability, monthRevenue);

    const trends = comparePeriods("monthly", monthRevenue, monthExpenses, monthWithdrawals, data.payments, data.expenses, data.withdrawals);

    const lowStock = lowStockMaterials(data.materials);
    const overdue = dueTodayOrders(data.orders);

    const alerts = generateFinanceAlerts(
      monthRevenue,
      monthExpenses,
      monthWithdrawals,
      expenseRatio,
      profitMargin,
      lowStock.length,
      overdue.length,
      outstandingBalances,
      inventoryValue
    ).concat(payrollAlerts(data.members));

    const health = calculateHealthScore(monthRevenue, monthExpenses, monthWithdrawals, outstandingBalances, inventoryValue);

    return {
      todayRevenue, weekRevenue, monthRevenue, yearRevenue,
      monthExpenses, monthWithdrawals, payrollLiability, totalExpenses, totalWithdrawals,
      inventoryValue, outstandingBalances, cashIn, cashOut,
      netProfit, profitMargin, expenseRatio, trends,
      lowStockCount: lowStock.length, overdueCount: overdue.length, alerts, health,
    };
  }, [data]);

  const combinedDaily = useMemo(() => {
    if (!data) return [];
    const dailyRevenue = dailyRevenueBreakdown(data.payments, 14);
    const dailyExpenses = dailyExpenseBreakdown(data.expenses, 14);
    const revMap = new Map(dailyRevenue.map((r) => [r.date, r.revenue]));
    const expMap = new Map(dailyExpenses.map((e) => [e.date, e.amount]));
    const allDates = [...new Set([...revMap.keys(), ...expMap.keys()])].sort();
    return allDates.reduce<Array<{ date: string; revenue: number; expenses: number; profit: number }>>((rows, date) => {
      const revenue = revMap.get(date) ?? 0;
      const expenses = expMap.get(date) ?? 0;
      rows.push({ date, revenue, expenses, profit: revenue - expenses });
      return rows;
    }, []);
  }, [data]);

  const expenseCategoryData = useMemo(() => {
    if (!data) return [];
    const byCat = expensesByCategory(data.expenses);
    return Object.entries(byCat)
      .map(([name, value]) => ({ name: name.replace(/_/g, " "), value }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const recentTransactions = useMemo(() => {
    if (!data) return [];
    const paymentTx = data.payments.slice(0, 15).map((p) => ({
      date: p.recordedAt ? new Date(p.recordedAt) : new Date(),
      description: `Payment – ${p.customerName}`,
      amount: p.amount,
    }));
    const expenseTx = data.expenses.slice(0, 15).map((e) => ({
      date: e.expenseDate ? new Date(e.expenseDate) : new Date(),
      description: e.description,
      amount: -e.amount,
    }));
    const withdrawalTx = data.withdrawals.slice(0, 15).map((w) => ({
      date: w.withdrawalDate ? new Date(w.withdrawalDate) : new Date(),
      description: w.reason,
      amount: -w.amount,
    }));
    return [...paymentTx, ...expenseTx, ...withdrawalTx]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 15);
  }, [data]);

  if (!ready || !data || !metrics) {
    return <LoadingSkeleton />;
  }

  const calWeekEnd = addDays(calWeekStart, 6);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Financial Dashboard</h1>
          <p className="text-sm text-slate-500">See exactly how your money is moving — every day</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={metrics.health.score >= 60 ? "success" : "warning"} className="text-xs">
            Health: {metrics.health.label} ({metrics.health.score}/100)
          </Badge>
          <Link
            href="/finance/expenses"
            className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Expense
          </Link>
          <Link
            href="/finance/withdrawals"
            className="inline-flex h-9 items-center justify-center rounded-xl bg-emerald-600 px-3 text-sm font-medium text-white transition hover:bg-emerald-500"
          >
            <Wallet className="mr-1.5 h-4 w-4" />
            Withdrawal
          </Link>
        </div>
      </div>

      {/* Nav tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 text-sm overflow-x-auto">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            className={`rounded-xl px-3 py-2 font-medium whitespace-nowrap ${link.href === "/finance" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            href={link.href}
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Sub-tabs: Overview / Week / Month / Year — history tabs hidden unless permitted */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 w-full sm:w-auto sm:inline-flex">
        {(
          [
            ["overview", "Overview", true],
            ["week", "This Week", canSeeWeekHistory],
            ["month", "This Month", canSeeMonthHistory],
            ["year", "This Year", canSeeYearHistory],
          ] as const
        )
          .filter(([, , allowed]) => allowed)
          .map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 sm:flex-none rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${activeTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              {label}
            </button>
          ))}
      </div>

      {/* Access restriction notice for non-owners */}
      {!canViewAsOwner && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
          <p>
            You are viewing <strong>today&apos;s finance data</strong> only. Full financial history,
            net profit and business insights are visible to the business owner.
            {!canSeeWeekHistory && !canSeeMonthHistory && !canSeeYearHistory && " Your owner can unlock additional periods for you in Settings."}
          </p>
        </div>
      )}

      {/* ─── OVERVIEW TAB ─── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Alerts — owner-only (include payroll & business insights) */}
          {canSeeOwnerKpis && metrics.alerts.length > 0 && (
            <div className="space-y-2">
              {metrics.alerts.slice(0, 3).map((alert, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm
                    ${alert.type === "danger" ? "border-rose-200 bg-rose-50 text-rose-800" : ""}
                    ${alert.type === "warning" ? "border-amber-200 bg-amber-50 text-amber-800" : ""}
                    ${alert.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : ""}
                    ${alert.type === "info" ? "border-blue-200 bg-blue-50 text-blue-800" : ""}
                  `}
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-medium">{alert.title}</p>
                    <p className="text-xs opacity-80">{alert.message}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Revenue cards — history periods and total revenue gated by permission */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard title="Today's Earnings" value={formatKes(metrics.todayRevenue)} variant="success" icon={<DollarSign className="h-4 w-4" />} />
            {canSeeWeekHistory && (
              <StatsCard title="This Week" value={formatKes(metrics.weekRevenue)} variant="success" icon={<TrendingUp className="h-4 w-4" />} />
            )}
            {canSeeMonthHistory && (
              <StatsCard title="This Month" value={formatKes(metrics.monthRevenue)} trend={metrics.trends.revenueTrend} variant="success" icon={<Calendar className="h-4 w-4" />} />
            )}
            {canSeeYearHistory && (
              <StatsCard title="This Year" value={formatKes(metrics.yearRevenue)} variant="success" icon={<TrendingUp className="h-4 w-4" />} />
            )}
            {canSeeTotalRevenue && (
              <StatsCard title="Total Revenue" value={formatKes(metrics.cashIn)} variant="success" icon={<ArrowUpRight className="h-4 w-4" />} />
            )}
          </div>

          {/* Profit & spending — Net Profit is owner-only KPI */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {canSeeOwnerKpis && (
              <StatsCard
                title="Net Profit"
                value={formatKes(metrics.netProfit)}
                trend={metrics.trends.profitTrend}
                trendLabel="vs last month"
                variant={metrics.netProfit >= 0 ? "success" : "danger"}
                icon={metrics.netProfit >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              />
            )}
            <StatsCard title="Today's Expenses" value={formatKes(metrics.monthExpenses)} trend={metrics.trends.expenseTrend} trendLabel="vs last month" variant="danger" icon={<ArrowDownRight className="h-4 w-4" />} />
            <StatsCard title="Pending Payments" value={formatKes(metrics.outstandingBalances)} variant="warning" icon={<CreditCard className="h-4 w-4" />} />
            <StatsCard title="Withdrawals" value={formatKes(metrics.monthWithdrawals)} trend={metrics.trends.withdrawalTrend} trendLabel="vs last month" variant="warning" icon={<Wallet className="h-4 w-4" />} />
          </div>

          {/* Secondary stats — Payroll Due and Inventory Value are owner-only KPIs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {canSeeOwnerKpis && (
              <StatsCard title="Payroll Due" value={formatKes(metrics.payrollLiability)} variant="warning" icon={<Users className="h-4 w-4" />} />
            )}
            {canSeeOwnerKpis && (
              <StatsCard title="Inventory Value" value={formatKes(metrics.inventoryValue)} variant="info" icon={<Package className="h-4 w-4" />} />
            )}
            <StatsCard title="Total Cash In" value={formatKes(metrics.cashIn)} variant="success" icon={<ArrowUpRight className="h-4 w-4" />} />
            <StatsCard title="Total Cash Out" value={formatKes(metrics.cashOut)} variant="danger" icon={<ArrowDownRight className="h-4 w-4" />} />
          </div>

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Earnings vs Spending (14 days)" loading={!data}>
              <FinanceAreaChart
                data={combinedDaily}
                dataKeys={[
                  { key: "revenue", color: "#059669", name: "Earnings" },
                  { key: "expenses", color: "#ef4444", name: "Spending" },
                ]}
              />
            </ChartCard>
            <ChartCard title="Daily Profit (14 days)" loading={!data}>
              <FinanceAreaChart
                data={combinedDaily.map((d) => ({ date: d.date, profit: d.profit }))}
                dataKeys={[{ key: "profit", color: "#8b5cf6", name: "Profit" }]}
              />
            </ChartCard>
          </div>

          {/* Bottom section */}
          <div className="grid gap-6 lg:grid-cols-3">
            <ChartCard title="Expenses by Category" loading={!data}>
              <FinancePieChart data={expenseCategoryData} height={260} />
            </ChartCard>

            {/* P&L Summary — owner-only section */}
            {canSeeOwnerKpis && <Card>
              <CardHeader>
                <CardTitle>Profit & Loss (This Month)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Money Earned</span>
                    <span className="font-medium text-emerald-600">{formatKes(metrics.monthRevenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Money Spent (Expenses)</span>
                    <span className="font-medium text-rose-600">-{formatKes(metrics.monthExpenses)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Withdrawn</span>
                    <span className="font-medium text-amber-600">-{formatKes(metrics.monthWithdrawals)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Payroll Owed</span>
                    <span className="font-medium text-blue-600">-{formatKes(metrics.payrollLiability)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-semibold">What's Left (Net Profit)</span>
                    <span className={`font-bold text-base ${metrics.netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {formatKes(metrics.netProfit)}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border p-3 text-center">
                    <p className="text-xs text-slate-500">Profit Margin</p>
                    <p className={`text-lg font-bold ${metrics.profitMargin >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{metrics.profitMargin.toFixed(1)}%</p>
                  </div>
                  <div className="rounded-xl border p-3 text-center">
                    <p className="text-xs text-slate-500">Expense Ratio</p>
                    <p className={`text-lg font-bold ${metrics.expenseRatio <= 50 ? "text-emerald-600" : "text-rose-600"}`}>{metrics.expenseRatio.toFixed(1)}%</p>
                  </div>
                </div>
                {/* Health bar */}
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-slate-500">Business Health</span>
                    <span className={`font-bold ${metrics.health.color}`}>{metrics.health.label}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full transition-all ${metrics.health.score >= 80 ? "bg-emerald-500" : metrics.health.score >= 60 ? "bg-amber-500" : metrics.health.score >= 40 ? "bg-orange-500" : "bg-rose-500"}`}
                      style={{ width: `${metrics.health.score}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{metrics.health.score}/100 — {metrics.health.score >= 80 ? "Your business is doing great!" : metrics.health.score >= 60 ? "Things are going well, keep it up." : metrics.health.score >= 40 ? "Some areas need attention." : "Your business needs urgent attention."}</p>
                </div>
              </CardContent>
            </Card>}

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="max-h-[380px] space-y-1.5 overflow-y-auto">
                {recentTransactions.length === 0 ? (
                  <p className="text-sm text-slate-400">No activity yet</p>
                ) : (
                  recentTransactions.map((tx, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-800">{tx.description}</p>
                        <p className="text-xs text-slate-400">{tx.date.toLocaleDateString("en-KE", { day: "2-digit", month: "short" })}</p>
                      </div>
                      <span className={`ml-3 shrink-0 font-semibold text-sm ${tx.amount > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {tx.amount > 0 ? "+" : ""}{formatKes(Math.abs(tx.amount))}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick metric cards — 2 cols on mobile */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-slate-500">Low Stock Items</p>
                <p className={`text-2xl font-bold mt-0.5 ${metrics.lowStockCount > 0 ? "text-amber-600" : "text-slate-900"}`}>{metrics.lowStockCount}</p>
                <p className="text-xs text-slate-400 mt-0.5">items need restocking</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-slate-500">Overdue Orders</p>
                <p className={`text-2xl font-bold mt-0.5 ${metrics.overdueCount > 0 ? "text-rose-600" : "text-slate-900"}`}>{metrics.overdueCount}</p>
                <p className="text-xs text-slate-400 mt-0.5">orders past due date</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-slate-500">Total Payments</p>
                <p className="text-2xl font-bold mt-0.5 text-slate-900">{data.payments.length}</p>
                <p className="text-xs text-slate-400 mt-0.5">payments recorded</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-slate-500">Active Orders</p>
                <p className="text-2xl font-bold mt-0.5 text-slate-900">{data.orders.filter((o) => o.stage !== "delivered").length}</p>
                <p className="text-xs text-slate-400 mt-0.5">orders in progress</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ─── WEEK VIEW TAB ─── */}
      {activeTab === "week" && (
        <div className="space-y-4">
          {/* Week navigator */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCalWeekStart(addDays(calWeekStart, -7))}
              className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous Week
            </button>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-800">
                {calWeekStart.toLocaleDateString("en-KE", { day: "numeric", month: "short" })} — {calWeekEnd.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
              </p>
              {calWeekStart.toDateString() === startOfWeek(new Date()).toDateString() && (
                <p className="text-xs text-emerald-600 font-medium">Current Week</p>
              )}
            </div>
            <button
              onClick={() => setCalWeekStart(addDays(calWeekStart, 7))}
              disabled={addDays(calWeekStart, 7) > new Date()}
              className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              Next Week
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <Card>
            <CardContent className="pt-5">
              <WeekCalendar data={data} weekStart={calWeekStart} />
            </CardContent>
          </Card>

          {/* Day breakdown table */}
          <Card>
            <CardHeader>
              <CardTitle>Day-by-Day Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left px-4 py-3 text-slate-500 font-medium">Day</th>
                      <th className="text-right px-4 py-3 text-emerald-600 font-medium">Earnings</th>
                      <th className="text-right px-4 py-3 text-rose-500 font-medium">Spending</th>
                      <th className="text-right px-4 py-3 text-blue-600 font-medium">Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 7 }, (_, i) => {
                      const day = addDays(calWeekStart, i);
                      const isToday = day.toDateString() === new Date().toDateString();
                      const isFuture = day > new Date();
                      const start = startOfDay(day);
                      const end = endOfDay(day);
                      const rev = isFuture ? 0 : getPaymentsForRange(data.payments, start, end).reduce((s, p) => s + p.amount, 0);
                      const exp = isFuture ? 0 : (
                        getExpensesForRange(data.expenses, start, end).reduce((s, e) => s + e.amount, 0) +
                        getWithdrawalsForRange(data.withdrawals, start, end).reduce((s, w) => s + w.amount, 0)
                      );
                      const net = rev - exp;
                      return (
                        <tr key={i} className={`border-b border-slate-50 ${isToday ? "bg-emerald-50" : ""} ${isFuture ? "opacity-40" : ""}`}>
                          <td className="px-4 py-3 font-medium text-slate-700">
                            {day.toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "short" })}
                            {isToday && <span className="ml-2 text-xs text-emerald-600 font-semibold">Today</span>}
                          </td>
                          <td className="px-4 py-3 text-right text-emerald-600 font-semibold">{rev > 0 ? formatKes(rev) : "—"}</td>
                          <td className="px-4 py-3 text-right text-rose-500">{exp > 0 ? formatKes(exp) : "—"}</td>
                          <td className={`px-4 py-3 text-right font-bold ${net > 0 ? "text-blue-600" : net < 0 ? "text-orange-600" : "text-slate-400"}`}>
                            {rev > 0 || exp > 0 ? (net >= 0 ? "+" : "") + formatKes(net) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── MONTH VIEW TAB ─── */}
      {activeTab === "month" && (
        <div className="space-y-4">
          {/* Month navigator */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
                else setCalMonth(calMonth - 1);
              }}
              className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>
            <p className="text-base font-bold text-slate-800">{MONTHS[calMonth]} {calYear}</p>
            <button
              onClick={() => {
                const now = new Date();
                if (calYear > now.getFullYear() || (calYear === now.getFullYear() && calMonth >= now.getMonth())) return;
                if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
                else setCalMonth(calMonth + 1);
              }}
              className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <Card>
            <CardContent className="pt-5">
              <MonthCalendar data={data} year={calYear} month={calMonth} />
            </CardContent>
          </Card>

          {/* Month stats */}
          {(() => {
            const start = new Date(calYear, calMonth, 1);
            const end = new Date(calYear, calMonth + 1, 0, 23, 59, 59, 999);
            const rev = getPaymentsForRange(data.payments, start, end).reduce((s, p) => s + p.amount, 0);
            const exp = getExpensesForRange(data.expenses, start, end).reduce((s, e) => s + e.amount, 0);
            const wdl = getWithdrawalsForRange(data.withdrawals, start, end).reduce((s, w) => s + w.amount, 0);
            const net = rev - exp - wdl;
            return (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-center">
                  <p className="text-xs text-emerald-600 font-medium">Total Earned</p>
                  <p className="text-xl font-bold text-emerald-700 mt-1">{formatKes(rev)}</p>
                </div>
                <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-center">
                  <p className="text-xs text-rose-600 font-medium">Total Spent</p>
                  <p className="text-xl font-bold text-rose-700 mt-1">{formatKes(exp)}</p>
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-center">
                  <p className="text-xs text-amber-600 font-medium">Withdrawn</p>
                  <p className="text-xl font-bold text-amber-700 mt-1">{formatKes(wdl)}</p>
                </div>
                <div className={`rounded-xl border p-4 text-center ${net >= 0 ? "border-blue-100 bg-blue-50" : "border-orange-100 bg-orange-50"}`}>
                  <p className={`text-xs font-medium ${net >= 0 ? "text-blue-600" : "text-orange-600"}`}>Net Profit</p>
                  <p className={`text-xl font-bold mt-1 ${net >= 0 ? "text-blue-700" : "text-orange-700"}`}>{formatKes(net)}</p>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ─── YEAR VIEW TAB ─── */}
      {activeTab === "year" && (
        <div className="space-y-4">
          {/* Year navigator */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCalYear(calYear - 1)}
              className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <ChevronLeft className="h-4 w-4" />
              {calYear - 1}
            </button>
            <p className="text-xl font-bold text-slate-900">{calYear}</p>
            <button
              onClick={() => { if (calYear < new Date().getFullYear()) setCalYear(calYear + 1); }}
              disabled={calYear >= new Date().getFullYear()}
              className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              {calYear + 1}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <Card>
            <CardContent className="pt-5">
              <YearCalendar data={data} year={calYear} />
            </CardContent>
          </Card>

          {/* Year totals */}
          {(() => {
            const start = new Date(calYear, 0, 1);
            const end = new Date(calYear, 11, 31, 23, 59, 59, 999);
            const rev = getPaymentsForRange(data.payments, start, end).reduce((s, p) => s + p.amount, 0);
            const exp = getExpensesForRange(data.expenses, start, end).reduce((s, e) => s + e.amount, 0);
            const wdl = getWithdrawalsForRange(data.withdrawals, start, end).reduce((s, w) => s + w.amount, 0);
            const net = rev - exp - wdl;
            return (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-center">
                  <p className="text-xs text-emerald-600 font-medium">{calYear} Earnings</p>
                  <p className="text-xl font-bold text-emerald-700 mt-1">{formatKes(rev)}</p>
                </div>
                <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-center">
                  <p className="text-xs text-rose-600 font-medium">{calYear} Spending</p>
                  <p className="text-xl font-bold text-rose-700 mt-1">{formatKes(exp)}</p>
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-center">
                  <p className="text-xs text-amber-600 font-medium">{calYear} Withdrawn</p>
                  <p className="text-xl font-bold text-amber-700 mt-1">{formatKes(wdl)}</p>
                </div>
                <div className={`rounded-xl border p-4 text-center ${net >= 0 ? "border-blue-100 bg-blue-50" : "border-orange-100 bg-orange-50"}`}>
                  <p className={`text-xs font-medium ${net >= 0 ? "text-blue-600" : "text-orange-600"}`}>{calYear} Net Profit</p>
                  <p className={`text-xl font-bold mt-1 ${net >= 0 ? "text-blue-700" : "text-orange-700"}`}>{formatKes(net)}</p>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 rounded-xl bg-slate-100 animate-pulse" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-100 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
