import { Timestamp } from "firebase/firestore";
import { notificationsCollection } from "@/services/collections";
import { calculateRevenue, calculateExpenses, calculateWithdrawals, calculateNetProfit } from "@/services/finance.service";
import { addDoc, serverTimestamp } from "firebase/firestore";
import type { Payment, Expense, Withdrawal } from "@/types/domain";

export function shouldGenerateWeeklyReport(): boolean {
  const now = new Date();
  const day = now.getDay();
  const hours = now.getHours();
  const minutes = now.getMinutes();

  // Friday (day 5) at 5:00 PM (17:00)
  if (day !== 5) return false;
  if (hours < 17 || (hours === 17 && minutes < 0)) return false;
  if (hours > 17 || (hours === 17 && minutes > 5)) return false;

  return true;
}

export function getLastFridayDate(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day <= 5 ? day + 2 : day - 5;
  const lastFriday = new Date(now);
  lastFriday.setDate(now.getDate() - diff);
  lastFriday.setHours(0, 0, 0, 0);
  return lastFriday;
}

export function getWeekStartDate(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(now);
  weekStart.setDate(diff);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

export interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  revenue: number;
  expenses: number;
  withdrawals: number;
  netProfit: number;
  profitMargin: number;
  orderCount: number;
  paymentCount: number;
  topExpenseCategory: string;
  generatedAt: string;
}

export function generateWeeklyReportData(
  payments: Payment[],
  expenses: Expense[],
  withdrawals: Withdrawal[],
  orderCount: number
): WeeklyReport {
  const weekStart = getWeekStartDate();
  const weekEnd = new Date();

  const revenue = calculateRevenue(payments, weekStart, weekEnd);
  const totalExpenses = calculateExpenses(expenses, weekStart, weekEnd);
  const totalWithdrawals = calculateWithdrawals(withdrawals, weekStart, weekEnd);
  const netProfit = calculateNetProfit(revenue, totalExpenses, totalWithdrawals, 0);
  const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  const expenseCategories: Record<string, number> = {};
  expenses.forEach((e) => {
    const d = e.expenseDate?.toDate?.() ?? new Date();
    if (d >= weekStart && d <= weekEnd) {
      expenseCategories[e.category] = (expenseCategories[e.category] ?? 0) + e.amount;
    }
  });
  const topExpenseCategory = Object.entries(expenseCategories).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "none";

  return {
    weekStart: weekStart.toISOString().slice(0, 10),
    weekEnd: weekEnd.toISOString().slice(0, 10),
    revenue,
    expenses: totalExpenses,
    withdrawals: totalWithdrawals,
    netProfit,
    profitMargin,
    orderCount,
    paymentCount: payments.length,
    topExpenseCategory,
    generatedAt: new Date().toISOString(),
  };
}

export async function storeWeeklyReportNotification(
  businessId: string,
  report: WeeklyReport,
  actorUid: string
) {
  const profitLabel = report.netProfit >= 0 ? "profit" : "loss";
  await addDoc(notificationsCollection(businessId), {
    businessId,
    recipientUid: actorUid,
    type: "system",
    title: `Weekly Financial Report - ${report.weekStart}`,
    message: `Week ending ${report.weekEnd}: Revenue ${report.revenue.toFixed(0)} KES, ${profitLabel} of ${Math.abs(report.netProfit).toFixed(0)} KES. Margin: ${report.profitMargin.toFixed(1)}%.`,
    link: "/finance/reports",
    read: false,
    archived: false,
    createdAt: serverTimestamp(),
    metadata: {
      reportType: "weekly",
      weekStart: report.weekStart,
      weekEnd: report.weekEnd,
      revenue: report.revenue.toString(),
      netProfit: report.netProfit.toString(),
    },
  });
}
