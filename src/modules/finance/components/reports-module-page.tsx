"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Download, FileText, Calendar, TrendingUp, TrendingDown, Printer } from "lucide-react";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import { listenAllFinanceData, type FinanceData } from "@/services/finance.service";
import {
  calculateRevenue,
  calculateExpenses,
  calculateWithdrawals,
  calculateNetProfit,
  calculateProfitMargin,
  calculateExpenseRatio,
  dailyRevenueBreakdown,
  dailyExpenseBreakdown,
  expensesByCategory,
  topEarningServices,
  calculateOutstandingBalances,
  calculateInventoryValue,
} from "@/services/finance.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ChartCard, FinanceBarChart, FinanceAreaChart } from "@/components/ui/finance-chart";
import { formatKes, formatDateLabel } from "@/lib/utils";

type ReportPeriod = "daily" | "weekly" | "monthly" | "yearly";

export function ReportsModulePage() {
  const { businessId, ready } = useBusinessContext();
  const [data, setData] = useState<FinanceData | null>(null);
  const [period, setPeriod] = useState<ReportPeriod>("monthly");
  const [dateRange, setDateRange] = useState<"current" | "previous">("current");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!ready) return;
    return listenAllFinanceData(businessId, setData);
  }, [businessId, ready]);

  const report = useMemo(() => {
    if (!data) return null;

    const now = new Date();
    let start: Date;
    let prevStart: Date;

    switch (period) {
      case "daily": {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const prev = new Date(start);
        prev.setDate(prev.getDate() - 1);
        prevStart = prev;
        break;
      }
      case "weekly": {
        start = new Date(now);
        start.setDate(start.getDate() - start.getDay() + (start.getDay() === 0 ? -6 : 1));
        start.setHours(0, 0, 0, 0);
        const prev = new Date(start);
        prev.setDate(prev.getDate() - 7);
        prevStart = prev;
        break;
      }
      case "monthly": {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        break;
      }
      case "yearly": {
        start = new Date(now.getFullYear(), 0, 1);
        prevStart = new Date(now.getFullYear() - 1, 0, 1);
        break;
      }
    }

    const end = new Date();
    const prevEnd = start;

    const revenue = calculateRevenue(data.payments, start, end);
    const prevRevenue = calculateRevenue(data.payments, prevStart, prevEnd);

    const expenses = calculateExpenses(data.expenses, start, end);
    const prevExpenses = calculateExpenses(data.expenses, prevStart, prevEnd);

    const withdrawals = calculateWithdrawals(data.withdrawals, start, end);
    const prevWithdrawals = calculateWithdrawals(data.withdrawals, prevStart, prevEnd);

    const netProfit = calculateNetProfit(revenue, expenses, withdrawals, 0);
    const prevNetProfit = calculateNetProfit(prevRevenue, prevExpenses, prevWithdrawals, 0);

    const profitMargin = calculateProfitMargin(revenue, netProfit);
    const expenseRatio = calculateExpenseRatio(expenses, revenue);

    const outstandingBalances = calculateOutstandingBalances(data.orders);
    const inventoryValue = calculateInventoryValue(data.materials);

    const ordersInPeriod = data.orders.filter((o) => {
      const d = o.createdAt?.toDate?.() ?? new Date();
      return d >= start && d <= end;
    });

    const paymentsInPeriod = data.payments.filter((p) => {
      const d = p.recordedAt?.toDate?.() ?? new Date();
      return d >= start && d <= end;
    });

    const dailyRev = dailyRevenueBreakdown(data.payments, period === "daily" ? 7 : period === "weekly" ? 14 : period === "monthly" ? 30 : 365);
    const dailyExp = dailyExpenseBreakdown(data.expenses, period === "daily" ? 7 : period === "weekly" ? 14 : period === "monthly" ? 30 : 365);

    const topServices = topEarningServices(ordersInPeriod);

    const revenueTrend = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;
    const expenseTrend = prevExpenses > 0 ? ((expenses - prevExpenses) / prevExpenses) * 100 : 0;
    const profitTrend = prevNetProfit !== 0 ? ((netProfit - prevNetProfit) / Math.abs(prevNetProfit)) * 100 : 0;

    return {
      period,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      revenue,
      prevRevenue,
      expenses,
      prevExpenses,
      withdrawals,
      prevWithdrawals,
      netProfit,
      prevNetProfit,
      profitMargin,
      expenseRatio,
      revenueTrend,
      expenseTrend,
      profitTrend,
      orderCount: ordersInPeriod.length,
      paymentCount: paymentsInPeriod.length,
      outstandingBalances,
      inventoryValue,
      dailyRevenue: dailyRev,
      dailyExpenses: dailyExp,
      topServices,
      categoryBreakdown: Object.entries(expensesByCategory(data.expenses, start, end)).map(([name, value]) => ({
        name,
        value,
      })),
    };
  }, [data, period]);

  const handleExportCSV = useCallback(() => {
    if (!report) return;
    setExporting(true);
    try {
      const rows = [
        ["Metric", "Value", "Previous", "Change"],
        [`Revenue (${report.period})`, report.revenue.toString(), report.prevRevenue.toString(), `${report.revenueTrend.toFixed(1)}%`],
        [`Expenses (${report.period})`, report.expenses.toString(), report.prevExpenses.toString(), `${report.expenseTrend.toFixed(1)}%`],
        [`Withdrawals (${report.period})`, report.withdrawals.toString(), report.prevWithdrawals.toString(), ""],
        [`Net Profit`, report.netProfit.toString(), report.prevNetProfit.toString(), `${report.profitTrend.toFixed(1)}%`],
        ["Profit Margin", `${report.profitMargin.toFixed(1)}%`, "", ""],
        ["Expense Ratio", `${report.expenseRatio.toFixed(1)}%`, "", ""],
        ["Order Count", report.orderCount.toString(), "", ""],
        ["Payment Count", report.paymentCount.toString(), "", ""],
        ["Outstanding Balances", report.outstandingBalances.toString(), "", ""],
        ["Inventory Value", report.inventoryValue.toString(), "", ""],
      ];

      const csvContent = rows.map((row) => row.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `financial-report-${report.startDate}-to-${report.endDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }, [report]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  if (!data || !report) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Financial Reports</h1>
          <p className="text-sm text-slate-500">
            {report.startDate} to {report.endDate}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onChange={(e) => setPeriod(e.target.value as ReportPeriod)}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={exporting}>
            <Download className="mr-1.5 h-4 w-4" />
            {exporting ? "Exporting..." : "CSV"}
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="mr-1.5 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      {/* Summary Report Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Revenue</p>
            <p className="text-2xl font-bold text-emerald-600">{formatKes(report.revenue)}</p>
            <div className="mt-1 flex items-center gap-1">
              {report.revenueTrend >= 0 ? (
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
              )}
              <span className={`text-xs font-medium ${report.revenueTrend >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {report.revenueTrend >= 0 ? "+" : ""}{report.revenueTrend.toFixed(1)}%
              </span>
              <span className="text-xs text-slate-400">vs previous</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Expenses</p>
            <p className="text-2xl font-bold text-rose-600">{formatKes(report.expenses)}</p>
            <div className="mt-1 flex items-center gap-1">
              {report.expenseTrend <= 0 ? (
                <TrendingDown className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <TrendingUp className="h-3.5 w-3.5 text-rose-500" />
              )}
              <span className={`text-xs font-medium ${report.expenseTrend <= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {report.expenseTrend >= 0 ? "+" : ""}{report.expenseTrend.toFixed(1)}%
              </span>
              <span className="text-xs text-slate-400">vs previous</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Net Profit</p>
            <p className={`text-2xl font-bold ${report.netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {formatKes(report.netProfit)}
            </p>
            <div className="mt-1 flex items-center gap-1">
              {report.profitTrend >= 0 ? (
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
              )}
              <span className={`text-xs font-medium ${report.profitTrend >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {report.profitTrend >= 0 ? "+" : ""}{report.profitTrend.toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Profit Margin</p>
            <p className={`text-2xl font-bold ${report.profitMargin >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {report.profitMargin.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-400">Expense ratio: {report.expenseRatio.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Report */}
      <Card>
        <CardHeader>
          <CardTitle>Profit & Loss Statement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Revenue</span>
              <span className="font-semibold text-emerald-600">{formatKes(report.revenue)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Expenses</span>
              <span className="font-semibold text-rose-600">-{formatKes(report.expenses)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Withdrawals</span>
              <span className="font-semibold text-amber-600">-{formatKes(report.withdrawals)}</span>
            </div>
            <div className="border-t border-slate-200 pt-3">
              <div className="flex items-center justify-between text-sm font-bold">
                <span>Net Profit / Loss</span>
                <span className={report.netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}>
                  {report.netProfit >= 0 ? "+" : ""}{formatKes(report.netProfit)}
                </span>
              </div>
            </div>
            <div className="border-t border-slate-200 pt-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Profit Margin</span>
                  <p className="font-semibold">{report.profitMargin.toFixed(1)}%</p>
                </div>
                <div>
                  <span className="text-slate-500">Expense Ratio</span>
                  <p className="font-semibold">{report.expenseRatio.toFixed(1)}%</p>
                </div>
                <div>
                  <span className="text-slate-500">Orders</span>
                  <p className="font-semibold">{report.orderCount}</p>
                </div>
                <div>
                  <span className="text-slate-500">Payments</span>
                  <p className="font-semibold">{report.paymentCount}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Daily Revenue" loading={!data}>
          <FinanceAreaChart
            data={report.dailyRevenue.map((d) => ({ ...d, amount: d.revenue }))}
            dataKeys={[{ key: "amount", color: "#059669", name: "Revenue" }]}
          />
        </ChartCard>

        <ChartCard title="Daily Expenses" loading={!data}>
          <FinanceAreaChart
            data={report.dailyExpenses.map((d) => ({ ...d, amount: d.amount }))}
            dataKeys={[{ key: "amount", color: "#ef4444", name: "Expenses" }]}
          />
        </ChartCard>
      </div>

      {/* Top Services */}
      {report.topServices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Earning Services</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.topServices.map((service) => (
                  <TableRow key={service.name}>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell className="text-right">{service.count}</TableCell>
                    <TableCell className="text-right font-semibold text-emerald-600">
                      {formatKes(service.revenue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Category Breakdown */}
      {report.categoryBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Expense Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.categoryBreakdown.map((cat) => (
                  <TableRow key={cat.name}>
                    <TableCell className="font-medium capitalize">{cat.name.replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-right font-semibold text-rose-600">
                      {formatKes(cat.value)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
