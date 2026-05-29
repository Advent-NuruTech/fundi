import {
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  writeBatch,
  addDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  customersCollection,
  expensesCollection,
  materialsCollection,
  ordersCollection,
  paymentsCollection,
  purchaseOrdersCollection,
  stockMovementsCollection,
  transactionsCollection,
  withdrawalsCollection,
} from "@/services/collections";
import type {
  Customer,
  Expense,
  InventoryMaterial,
  Order,
  Payment,
  StockMovement,
  Transaction,
  Withdrawal,
} from "@/types/domain";

// ─── DATE HELPERS ───

function startOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfWeek(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfYear(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setMonth(0, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function previousPeriodStart(period: "daily" | "weekly" | "monthly" | "yearly", ref: Date = new Date()): Date {
  const d = new Date(ref);
  switch (period) {
    case "daily":
      d.setDate(d.getDate() - 1);
      return startOfDay(d);
    case "weekly":
      d.setDate(d.getDate() - 7);
      return startOfWeek(d);
    case "monthly": {
      const m = d.getMonth() - 1;
      d.setMonth(m < 0 ? 11 : m);
      d.setFullYear(d.getFullYear() + (m < 0 ? -1 : 0));
      return startOfMonth(d);
    }
    case "yearly":
      d.setFullYear(d.getFullYear() - 1);
      return startOfYear(d);
  }
}

function previousPeriodEnd(period: "daily" | "weekly" | "monthly" | "yearly", ref: Date = new Date()): Date {
  const d = new Date(ref);
  switch (period) {
    case "daily":
      d.setDate(d.getDate() - 1);
      return endOfDay(d);
    case "weekly":
      d.setDate(d.getDate() - 1);
      return endOfDay(d);
    case "monthly":
      return endOfDay(new Date(d.getFullYear(), d.getMonth(), 0));
    case "yearly":
      return endOfDay(new Date(d.getFullYear() - 1, 11, 31));
  }
}

export function filterByDateRange<T extends { createdAt: Timestamp }>(items: T[], start: Date, end: Date): T[] {
  return items.filter((item) => {
    const date = item.createdAt?.toDate ? item.createdAt.toDate() : new Date();
    return date >= start && date <= end;
  });
}

export function filterByDateField<T extends { expenseDate?: Timestamp }>(items: T[], start: Date, end: Date): T[] {
  return items.filter((item) => {
    if (!item.expenseDate) return false;
    const date = item.expenseDate.toDate ? item.expenseDate.toDate() : new Date();
    return date >= start && date <= end;
  });
}

export function filterByWithdrawalDate<T extends { withdrawalDate?: Timestamp }>(items: T[], start: Date, end: Date): T[] {
  return items.filter((item) => {
    if (!item.withdrawalDate) return false;
    const date = item.withdrawalDate.toDate ? item.withdrawalDate.toDate() : new Date();
    return date >= start && date <= end;
  });
}

// ─── REVENUE ───

export function calculateRevenue(payments: Payment[], start?: Date, end?: Date): number {
  let filtered = payments;
  if (start && end) {
    filtered = payments.filter((p) => {
      const d = p.recordedAt?.toDate ? p.recordedAt.toDate() : new Date();
      return d >= start && d <= end;
    });
  }
  return filtered.reduce((sum, p) => sum + p.amount, 0);
}

export function calculateRevenueFromOrders(orders: Order[]): number {
  return orders.reduce((sum, o) => sum + o.amountPaid, 0);
}

// ─── EXPENSES ───

export function calculateExpenses(expenses: Expense[], start?: Date, end?: Date): number {
  let filtered = expenses;
  if (start && end) {
    filtered = expenses.filter((e) => {
      const d = e.expenseDate?.toDate ? e.expenseDate.toDate() : new Date();
      return d >= start && d <= end;
    });
  }
  return filtered.reduce((sum, e) => sum + e.amount, 0);
}

export function expensesByCategory(expenses: Expense[], start?: Date, end?: Date): Record<string, number> {
  let filtered = expenses;
  if (start && end) {
    filtered = expenses.filter((e) => {
      const d = e.expenseDate?.toDate ? e.expenseDate.toDate() : new Date();
      return d >= start && d <= end;
    });
  }
  return filtered.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {});
}

// ─── WITHDRAWALS ───

export function calculateWithdrawals(withdrawals: Withdrawal[], start?: Date, end?: Date): number {
  let filtered = withdrawals;
  if (start && end) {
    filtered = withdrawals.filter((w) => {
      const d = w.withdrawalDate?.toDate ? w.withdrawalDate.toDate() : new Date();
      return d >= start && d <= end;
    });
  }
  return filtered.reduce((sum, w) => sum + w.amount, 0);
}

export function withdrawalsByCategory(withdrawals: Withdrawal[], start?: Date, end?: Date): Record<string, number> {
  let filtered = withdrawals;
  if (start && end) {
    filtered = withdrawals.filter((w) => {
      const d = w.withdrawalDate?.toDate ? w.withdrawalDate.toDate() : new Date();
      return d >= start && d <= end;
    });
  }
  return filtered.reduce<Record<string, number>>((acc, w) => {
    acc[w.category] = (acc[w.category] ?? 0) + w.amount;
    return acc;
  }, {});
}

// ─── INVENTORY VALUE ───

export function calculateInventoryValue(materials: InventoryMaterial[]): number {
  return materials.reduce((sum, m) => sum + m.quantity * m.averageUnitCost, 0);
}

// ─── OUTSTANDING BALANCES ───

export function calculateOutstandingBalances(orders: Order[]): number {
  return orders.reduce((sum, o) => sum + o.balanceAmount, 0);
}

export function calculateCustomerOutstandingBalances(customers: Customer[]): number {
  return customers.reduce((sum, c) => sum + (c.outstandingBalance ?? 0), 0);
}

// ─── CASH FLOW ───

export function calculateCashIn(payments: Payment[], start?: Date, end?: Date): number {
  return calculateRevenue(payments, start, end);
}

export function calculateCashOut(expenses: Expense[], withdrawals: Withdrawal[], purchaseOrders: any[], start?: Date, end?: Date): number {
  const expTotal = calculateExpenses(expenses, start, end);
  const withTotal = calculateWithdrawals(withdrawals, start, end);
  const poTotal = purchaseOrders
    .filter((po: any) => {
      if (!start || !end) return true;
      const d = po.createdAt?.toDate ? po.createdAt.toDate() : new Date();
      return d >= start && d <= end && po.status === "received";
    })
    .reduce((sum: number, po: any) => sum + (po.unitCost ?? 0) * (po.quantity ?? 0), 0);
  return expTotal + withTotal + poTotal;
}

// ─── PROFIT & LOSS ───

export function calculateGrossProfit(revenue: number, inventoryCosts: number): number {
  return revenue - inventoryCosts;
}

export function calculateNetProfit(
  revenue: number,
  expenses: number,
  withdrawals: number,
  inventoryCosts: number
): number {
  return revenue - expenses - withdrawals - inventoryCosts;
}

export function calculateProfitMargin(revenue: number, netProfit: number): number {
  if (revenue === 0) return 0;
  return (netProfit / revenue) * 100;
}

export function calculateExpenseRatio(expenses: number, revenue: number): number {
  if (revenue === 0) return 0;
  return (expenses / revenue) * 100;
}

// ─── INVENTORY COST OF GOODS SOLD ───

export function calculateInventoryCOGS(movements: StockMovement[], start?: Date, end?: Date): number {
  let filtered = movements.filter((m) => m.movementType === "consumption");
  if (start && end) {
    filtered = filtered.filter((m) => {
      const d = m.createdAt?.toDate ? m.createdAt.toDate() : new Date();
      return d >= start && d <= end;
    });
  }
  return filtered.reduce((sum, m) => sum + Math.abs(m.quantityChange), 0);
}

// ─── PERIOD COMPARISON ───

export function calculateTrend(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export function comparePeriods(
  period: "daily" | "weekly" | "monthly" | "yearly",
  revenue: number,
  expenses: number,
  withdrawals: number,
  payments: Payment[],
  expenseList: Expense[],
  withdrawalList: Withdrawal[]
): { revenueTrend: number; expenseTrend: number; withdrawalTrend: number; profitTrend: number } {
  const now = new Date();
  let currentStart: Date;
  let previousStart: Date;

  switch (period) {
    case "daily": {
      currentStart = startOfDay(now);
      previousStart = startOfDay(new Date(now.getTime() - 86400000));
      break;
    }
    case "weekly": {
      currentStart = startOfWeek(now);
      const prevWeek = new Date(now.getTime() - 7 * 86400000);
      previousStart = startOfWeek(prevWeek);
      break;
    }
    case "monthly": {
      currentStart = startOfMonth(now);
      previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      break;
    }
    case "yearly": {
      currentStart = startOfYear(now);
      previousStart = new Date(now.getFullYear() - 1, 0, 1);
      break;
    }
  }

  const prevRevenue = calculateRevenue(payments, previousStart, currentStart);
  const prevExpenses = calculateExpenses(expenseList, previousStart, currentStart);
  const prevWithdrawals = calculateWithdrawals(withdrawalList, previousStart, currentStart);
  const prevProfit = prevRevenue - prevExpenses - prevWithdrawals;
  const currentProfit = revenue - expenses - withdrawals;

  return {
    revenueTrend: calculateTrend(revenue, prevRevenue),
    expenseTrend: calculateTrend(expenses, prevExpenses),
    withdrawalTrend: calculateTrend(withdrawals, prevWithdrawals),
    profitTrend: calculateTrend(currentProfit, prevProfit),
  };
}

// ─── TRANSACTION LEDGER ───

export function listenTransactions(businessId: string, callback: (rows: Transaction[]) => void) {
  const q = query(transactionsCollection(businessId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((docItem) => ({ ...docItem.data(), id: docItem.id })));
  });
}

export async function recordTransaction(
  businessId: string,
  payload: {
    type: Transaction["type"];
    amount: number;
    description: string;
    referenceId?: string;
    referenceType?: string;
    referenceLabel?: string;
    linkedEntityId?: string;
    linkedEntityType?: string;
    linkedEntityName?: string;
    performedByUid: string;
    performedByName: string;
    status: Transaction["status"];
    notes?: string;
  }
) {
  const ref = await addDoc(transactionsCollection(businessId), {
    businessId,
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

// ─── REALTIME FINANCE WATCHERS ───

export interface FinanceData {
  payments: Payment[];
  orders: Order[];
  customers: Customer[];
  expenses: Expense[];
  withdrawals: Withdrawal[];
  materials: InventoryMaterial[];
  movements: StockMovement[];
  purchaseOrders: any[];
}

export function listenAllFinanceData(
  businessId: string,
  callback: (data: FinanceData) => void,
  onError?: (err: Error) => void
) {
  const data: Partial<FinanceData> = {};

  function checkReady() {
    if (
      data.payments &&
      data.orders &&
      data.customers &&
      data.expenses &&
      data.withdrawals &&
      data.materials &&
      data.movements &&
      data.purchaseOrders
    ) {
      callback(data as FinanceData);
    }
  }

  const unsub1 = onSnapshot(
    query(paymentsCollection(businessId), orderBy("recordedAt", "desc")),
    (snap) => {
      data.payments = snap.docs.map((d) => ({ ...d.data(), id: d.id })) as Payment[];
      checkReady();
    },
    onError
  );

  const unsub2 = onSnapshot(
    query(ordersCollection(businessId), orderBy("updatedAt", "desc")),
    (snap) => {
      data.orders = snap.docs.map((d) => ({ ...d.data(), id: d.id })) as Order[];
      checkReady();
    },
    onError
  );

  const unsub3 = onSnapshot(
    query(customersCollection(businessId), orderBy("createdAt", "desc")),
    (snap) => {
      data.customers = snap.docs.map((d) => ({ ...d.data(), id: d.id })) as Customer[];
      checkReady();
    },
    onError
  );

  const unsub4 = onSnapshot(
    query(expensesCollection(businessId), orderBy("expenseDate", "desc")),
    (snap) => {
      data.expenses = snap.docs.map((d) => ({ ...d.data(), id: d.id })) as Expense[];
      checkReady();
    },
    onError
  );

  const unsub5 = onSnapshot(
    query(withdrawalsCollection(businessId), orderBy("withdrawalDate", "desc")),
    (snap) => {
      data.withdrawals = snap.docs.map((d) => ({ ...d.data(), id: d.id })) as Withdrawal[];
      checkReady();
    },
    onError
  );

  const unsub6 = onSnapshot(
    query(materialsCollection(businessId), orderBy("updatedAt", "desc")),
    (snap) => {
      data.materials = snap.docs.map((d) => ({ ...d.data(), id: d.id })) as InventoryMaterial[];
      checkReady();
    },
    onError
  );

  const unsub7 = onSnapshot(
    query(stockMovementsCollection(businessId), orderBy("createdAt", "desc")),
    (snap) => {
      data.movements = snap.docs.map((d) => ({ ...d.data(), id: d.id })) as StockMovement[];
      checkReady();
    },
    onError
  );

  const unsub8 = onSnapshot(
    query(purchaseOrdersCollection(businessId), orderBy("createdAt", "desc")),
    (snap) => {
      data.purchaseOrders = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
      checkReady();
    },
    onError
  );

  return () => {
    unsub1();
    unsub2();
    unsub3();
    unsub4();
    unsub5();
    unsub6();
    unsub7();
    unsub8();
  };
}

// ─── BUSINESS HEALTH INDICATORS ───

export function calculateHealthScore(
  revenue: number,
  expenses: number,
  withdrawals: number,
  outstandingBalances: number,
  inventoryValue: number
): { score: number; label: string; color: string } {
  const expenseRatio = revenue > 0 ? expenses / revenue : 1;
  const withdrawalRatio = revenue > 0 ? withdrawals / revenue : 1;
  const debtRatio = revenue > 0 ? outstandingBalances / revenue : 1;

  let score = 100;
  if (expenseRatio > 0.5) score -= 20;
  if (expenseRatio > 0.7) score -= 15;
  if (withdrawalRatio > 0.3) score -= 15;
  if (withdrawalRatio > 0.5) score -= 10;
  if (debtRatio > 0.5) score -= 15;
  if (debtRatio > 1) score -= 10;
  if (revenue <= 0) score -= 10;
  if (expenses >= revenue && revenue > 0) score -= 15;

  score = Math.max(0, Math.min(100, score));

  let label: string;
  let color: string;
  if (score >= 80) {
    label = "Healthy";
    color = "text-emerald-600";
  } else if (score >= 60) {
    label = "Fair";
    color = "text-amber-600";
  } else if (score >= 40) {
    label = "At Risk";
    color = "text-orange-600";
  } else {
    label = "Critical";
    color = "text-rose-600";
  }

  return { score, label, color };
}

// ─── GENERATE FINANCIAL ALERTS ───

export function generateFinanceAlerts(
  revenue: number,
  expenses: number,
  withdrawals: number,
  expenseRatio: number,
  profitMargin: number,
  lowStockCount: number,
  overdueOrders: number,
  outstandingBalances: number,
  inventoryValue: number
): Array<{ type: "warning" | "danger" | "info" | "success"; title: string; message: string }> {
  const alerts: Array<{ type: "warning" | "danger" | "info" | "success"; title: string; message: string }> = [];

  if (expenseRatio > 0.7) {
    alerts.push({
      type: "danger",
      title: "High Expense Ratio",
      message: `Expenses are ${(expenseRatio * 100).toFixed(0)}% of revenue. Consider reducing costs.`,
    });
  } else if (expenseRatio > 0.5) {
    alerts.push({
      type: "warning",
      title: "Elevated Expenses",
      message: `Expenses are ${(expenseRatio * 100).toFixed(0)}% of revenue. Monitor closely.`,
    });
  }

  if (profitMargin < 0) {
    alerts.push({
      type: "danger",
      title: "Negative Profit Margin",
      message: `Business is operating at a loss (${profitMargin.toFixed(1)}% margin).`,
    });
  } else if (profitMargin < 10) {
    alerts.push({
      type: "warning",
      title: "Low Profit Margin",
      message: `Profit margin is only ${profitMargin.toFixed(1)}%. Aim for 20%+.`,
    });
  } else if (profitMargin > 30) {
    alerts.push({
      type: "success",
      title: "Healthy Profit Margin",
      message: `Profit margin is ${profitMargin.toFixed(1)}%. Excellent!`,
    });
  }

  if (outstandingBalances > revenue * 0.5 && revenue > 0) {
    alerts.push({
      type: "warning",
      title: "High Outstanding Balances",
      message: `Customers owe ${outstandingBalances.toFixed(0)} KES. Follow up on collections.`,
    });
  }

  if (overdueOrders > 0) {
    alerts.push({
      type: "danger",
      title: "Overdue Orders",
      message: `${overdueOrders} order(s) are past their due date.`,
    });
  }

  if (lowStockCount > 0) {
    alerts.push({
      type: "warning",
      title: "Low Stock Alert",
      message: `${lowStockCount} material(s) are below reorder level.`,
    });
  }

  if (withdrawals > revenue * 0.3 && revenue > 0) {
    alerts.push({
      type: "warning",
      title: "High Withdrawals",
      message: `Withdrawals are ${((withdrawals / revenue) * 100).toFixed(0)}% of revenue.`,
    });
  }

  return alerts;
}

// ─── DAILY REVENUE BREAKDOWN ───

export function dailyRevenueBreakdown(payments: Payment[], days: number = 30): Array<{ date: string; revenue: number }> {
  const breakdown: Record<string, number> = {};
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    breakdown[key] = 0;
  }
  payments.forEach((p) => {
    const d = p.recordedAt?.toDate ? p.recordedAt.toDate() : new Date();
    const key = d.toISOString().slice(0, 10);
    if (breakdown[key] !== undefined) {
      breakdown[key] += p.amount;
    }
  });
  return Object.entries(breakdown).map(([date, revenue]) => ({ date, revenue }));
}

export function dailyExpenseBreakdown(expenses: Expense[], days: number = 30): Array<{ date: string; amount: number }> {
  const breakdown: Record<string, number> = {};
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    breakdown[key] = 0;
  }
  expenses.forEach((e) => {
    const d = e.expenseDate?.toDate ? e.expenseDate.toDate() : new Date();
    const key = d.toISOString().slice(0, 10);
    if (breakdown[key] !== undefined) {
      breakdown[key] += e.amount;
    }
  });
  return Object.entries(breakdown).map(([date, amount]) => ({ date, amount }));
}

// ─── TOP EARNING SERVICES ───

export function topEarningServices(orders: Order[]): Array<{ name: string; revenue: number; count: number }> {
  const services: Record<string, { revenue: number; count: number }> = {};
  orders.forEach((order) => {
    order.garments.forEach((g) => {
      if (!services[g.name]) {
        services[g.name] = { revenue: 0, count: 0 };
      }
      services[g.name].revenue += g.agreedPrice * g.quantity;
      services[g.name].count += g.quantity;
    });
  });
  return Object.entries(services)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
}
