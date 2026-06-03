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
  Download,
  Calendar,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useBusinessContext } from "@/modules/shared/use-business-context";
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

export function FinanceModulePage() {
  const { businessId, ready } = useBusinessContext();
  const [data, setData] = useState<FinanceData | null>(null);

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

    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + (weekStart.getDay() === 0 ? -6 : 1));
    weekStart.setHours(0, 0, 0, 0);

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

    const monthInventoryCost = 0; // Simplified - would need cost tracking per order
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
      todayRevenue,
      weekRevenue,
      monthRevenue,
      yearRevenue,
      monthExpenses,
      monthWithdrawals,
      payrollLiability,
      totalExpenses,
      totalWithdrawals,
      inventoryValue,
      outstandingBalances,
      cashIn,
      cashOut,
      netProfit,
      profitMargin,
      expenseRatio,
      trends,
      lowStockCount: lowStock.length,
      overdueCount: overdue.length,
      alerts,
      health,
    };
  }, [data]);

  const dailyRevenue = useMemo(() => {
    if (!data) return [];
    return dailyRevenueBreakdown(data.payments, 14);
  }, [data]);

  const dailyExpenses = useMemo(() => {
    if (!data) return [];
    return dailyExpenseBreakdown(data.expenses, 14);
  }, [data]);

  const combinedDaily = useMemo(() => {
    const revMap = new Map(dailyRevenue.map((r) => [r.date, r.revenue]));
    const expMap = new Map(dailyExpenses.map((e) => [e.date, e.amount]));
    const allDates = [...new Set([...revMap.keys(), ...expMap.keys()])].sort();

    return allDates.reduce<Array<{ date: string; revenue: number; expenses: number; profit: number; cumulativeProfit: number }>>((rows, date) => {
      const revenue = revMap.get(date) ?? 0;
      const expenses = expMap.get(date) ?? 0;
      const profit = revenue - expenses;
      const previous = rows.at(-1)?.cumulativeProfit ?? 0;
      rows.push({ date, revenue, expenses, profit, cumulativeProfit: previous + profit });
      return rows;
    }, []);
  }, [dailyRevenue, dailyExpenses]);

  const expenseCategoryData = useMemo(() => {
    if (!data) return [];
    const byCat = expensesByCategory(data.expenses);
    return Object.entries(byCat)
      .map(([name, value]) => ({ name: name.replace(/_/g, " "), value }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const recentTransactions = useMemo(() => {
    if (!data) return [];
    const maxTransactions = 20;

    const paymentTx = data.payments.slice(0, 20).map((p) => ({
      date: p.recordedAt ? new Date(p.recordedAt) : new Date(),
      description: `Payment from ${p.customerName} - ${p.orderNumber}`,
      amount: p.amount,
      type: "payment_received" as const,
      reference: p.orderNumber,
      entity: p.customerName,
    }));

    const expenseTx = data.expenses.slice(0, 20).map((e) => ({
      date: e.expenseDate ? new Date(e.expenseDate) : new Date(),
      description: e.description,
      amount: -e.amount,
      type: "expense" as const,
      reference: e.category,
      entity: e.supplierName || "",
    }));

    const withdrawalTx = data.withdrawals.slice(0, 20).map((w) => ({
      date: w.withdrawalDate ? new Date(w.withdrawalDate) : new Date(),
      description: w.reason,
      amount: -w.amount,
      type: "withdrawal" as const,
      reference: w.category,
      entity: w.withdrawnByName,
    }));

    return [...paymentTx, ...expenseTx, ...withdrawalTx]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, maxTransactions);
  }, [data]);

  if (!ready || !data || !metrics) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Financial Dashboard</h1>
          <p className="text-sm text-slate-500">Real-time business financial overview</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={metrics.health.score >= 60 ? "success" : "warning"} className="text-xs">
            Health: {metrics.health.label} ({metrics.health.score}/100)
          </Badge>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Download className="mr-1.5 h-4 w-4" />
            Export
          </Button>
          <Link
            href="/finance/expenses"
            className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add Expense
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

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 text-sm">
        <Link className="rounded-xl bg-slate-900 px-3 py-2 font-medium text-white" href="/finance">Overview</Link>
        <Link className="rounded-xl px-3 py-2 font-medium text-slate-600 hover:bg-slate-100" href="/finance/expenses">Expenses</Link>
        <Link className="rounded-xl px-3 py-2 font-medium text-slate-600 hover:bg-slate-100" href="/finance/withdrawals">Withdrawals</Link>
        <Link className="rounded-xl px-3 py-2 font-medium text-slate-600 hover:bg-slate-100" href="/finance/transactions">Transactions</Link>
        <Link className="rounded-xl px-3 py-2 font-medium text-slate-600 hover:bg-slate-100" href="/finance/reports">Reports</Link>
      </div>

      {/* Alerts */}
      {metrics.alerts.length > 0 && (
        <div className="space-y-2">
          {metrics.alerts.slice(0, 3).map((alert, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`
                flex items-start gap-3 rounded-xl border px-4 py-3 text-sm
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

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatsCard
          title="Today's Revenue"
          value={formatKes(metrics.todayRevenue)}
          trend={metrics.trends.revenueTrend}
          trendLabel="vs last period"
          variant="success"
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatsCard
          title="This Week"
          value={formatKes(metrics.weekRevenue)}
          trend={calculateTrend(metrics.weekRevenue, metrics.todayRevenue * 7)}
          variant="success"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatsCard
          title="This Month"
          value={formatKes(metrics.monthRevenue)}
          trend={metrics.trends.revenueTrend}
          variant="success"
          icon={<Calendar className="h-4 w-4" />}
        />
        <StatsCard
          title="This Year"
          value={formatKes(metrics.yearRevenue)}
          variant="success"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatsCard
          title="Net Profit"
          value={formatKes(metrics.netProfit)}
          trend={metrics.trends.profitTrend}
          trendLabel="vs last month"
          variant={metrics.netProfit >= 0 ? "success" : "danger"}
          icon={metrics.netProfit >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
        />
        <StatsCard
          title="Total Expenses"
          value={formatKes(metrics.monthExpenses)}
          trend={metrics.trends.expenseTrend}
          trendLabel="vs last month"
          variant="danger"
          icon={<ArrowDownRight className="h-4 w-4" />}
        />
        <StatsCard
          title="Pending Payments"
          value={formatKes(metrics.outstandingBalances)}
          variant="warning"
          icon={<CreditCard className="h-4 w-4" />}
        />
        <StatsCard
          title="Withdrawals"
          value={formatKes(metrics.monthWithdrawals)}
          trend={metrics.trends.withdrawalTrend}
          trendLabel="vs last month"
          variant="warning"
          icon={<Wallet className="h-4 w-4" />}
        />
        <StatsCard
          title="Payroll Due"
          value={formatKes(metrics.payrollLiability)}
          variant="warning"
          icon={<Users className="h-4 w-4" />}
        />
      </div>

      {/* Secondary Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatsCard
          title="Inventory Value"
          value={formatKes(metrics.inventoryValue)}
          variant="info"
          icon={<Package className="h-4 w-4" />}
        />
        <StatsCard
          title="Outstanding Balances"
          value={formatKes(metrics.outstandingBalances)}
          variant="danger"
          icon={<Users className="h-4 w-4" />}
        />
        <StatsCard
          title="Cash In (Total)"
          value={formatKes(metrics.cashIn)}
          variant="success"
          icon={<ArrowUpRight className="h-4 w-4" />}
        />
        <StatsCard
          title="Cash Out (Total)"
          value={formatKes(metrics.cashOut)}
          variant="danger"
          icon={<ArrowDownRight className="h-4 w-4" />}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Revenue vs Expenses (14 days)" loading={!data}>
          <FinanceAreaChart
            data={combinedDaily}
            dataKeys={[
              { key: "revenue", color: "#059669", name: "Revenue" },
              { key: "expenses", color: "#ef4444", name: "Expenses" },
            ]}
          />
        </ChartCard>

        <ChartCard title="Net Profit Trend (14 days)" loading={!data}>
          <FinanceAreaChart
            data={combinedDaily.map((d) => ({ date: d.date, profit: d.profit }))}
            dataKeys={[
              { key: "profit", color: "#8b5cf6", name: "Profit/Loss" },
            ]}
          />
        </ChartCard>
      </div>

      {/* Bottom Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Expense Categories */}
        <ChartCard title="Expenses by Category" loading={!data} className="lg:col-span-1">
          <FinancePieChart data={expenseCategoryData} height={280} />
        </ChartCard>

        {/* Profit Metrics */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Profit & Loss Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Gross Revenue</span>
                <span className="font-medium text-emerald-600">{formatKes(metrics.monthRevenue)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Total Expenses</span>
                <span className="font-medium text-rose-600">{formatKes(metrics.monthExpenses)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Withdrawals</span>
                <span className="font-medium text-amber-600">{formatKes(metrics.monthWithdrawals)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Payroll Due</span>
                <span className="font-medium text-blue-600">{formatKes(metrics.payrollLiability)}</span>
              </div>
              <div className="border-t border-slate-200 pt-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Net Profit</span>
                  <span className={`font-bold ${metrics.netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {formatKes(metrics.netProfit)}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 p-3 text-center">
                <p className="text-xs text-slate-500">Profit Margin</p>
                <p className={`text-lg font-bold ${metrics.profitMargin >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {metrics.profitMargin.toFixed(1)}%
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3 text-center">
                <p className="text-xs text-slate-500">Expense Ratio</p>
                <p className={`text-lg font-bold ${metrics.expenseRatio <= 50 ? "text-emerald-600" : "text-rose-600"}`}>
                  {metrics.expenseRatio.toFixed(1)}%
                </p>
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Business Health</span>
                <span className={`font-bold ${metrics.health.color}`}>{metrics.health.label}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full transition-all ${
                    metrics.health.score >= 80
                      ? "bg-emerald-500"
                      : metrics.health.score >= 60
                      ? "bg-amber-500"
                      : metrics.health.score >= 40
                      ? "bg-orange-500"
                      : "bg-rose-500"
                  }`}
                  style={{ width: `${metrics.health.score}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[400px] space-y-2 overflow-y-auto">
            {recentTransactions.length === 0 ? (
              <p className="text-sm text-slate-400">No transactions yet</p>
            ) : (
              recentTransactions.map((tx, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-800">{tx.description}</p>
                    <p className="text-xs text-slate-400">
                      {tx.date.toLocaleDateString()} {tx.entity && `- ${tx.entity}`}
                    </p>
                  </div>
                  <span
                    className={`ml-3 shrink-0 font-semibold ${
                      tx.amount > 0 ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {tx.amount > 0 ? "+" : ""}{formatKes(tx.amount)}
                  </span>
                </motion.div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Low Stock Items</p>
            <p className={`text-2xl font-bold ${metrics.lowStockCount > 0 ? "text-amber-600" : "text-slate-900"}`}>
              {metrics.lowStockCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Overdue Orders</p>
            <p className={`text-2xl font-bold ${metrics.overdueCount > 0 ? "text-rose-600" : "text-slate-900"}`}>
              {metrics.overdueCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Total Payments</p>
            <p className="text-2xl font-bold text-slate-900">{data.payments.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Active Orders</p>
            <p className="text-2xl font-bold text-slate-900">
              {data.orders.filter((o) => o.stage !== "delivered").length}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <StatsCard key={i} title="" value="" loading />
        ))}
      </div>
    </div>
  );
}
