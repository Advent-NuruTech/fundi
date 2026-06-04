import {
  createExpense as supabaseCreateExpense,
  updateExpense as supabaseUpdateExpense,
  deleteExpense as supabaseDeleteExpense,
  fetchExpenseById as supabaseFetchExpenseById,
  listenExpenses as supabaseListenExpenses,
  listenExpensesByCategory as supabaseListenExpensesByCategory,
  fetchExpensesInRange as supabaseFetchExpensesInRange,
} from "@/lib/supabase.service";
import type { Expense, ExpenseCategory } from "@/types/domain";

export async function createExpense(businessId: string, payload: {
  category: ExpenseCategory;
  amount: number;
  description: string;
  notes?: string;
  receiptUrl?: string;
  supplierId?: string;
  supplierName?: string;
  expenseDate: Date;
  actorUid: string;
  actorName: string;
}) {
  return supabaseCreateExpense(businessId, payload);
}

export async function updateExpense(
  businessId: string,
  expenseId: string,
  payload: Partial<Omit<Expense, "id" | "businessId" | "createdAt" | "createdByUid" | "createdByName">>
) {
  return supabaseUpdateExpense(businessId, expenseId, payload);
}

export async function deleteExpense(businessId: string, expenseId: string) {
  return supabaseDeleteExpense(businessId, expenseId);
}

export async function fetchExpenseById(businessId: string, expenseId: string): Promise<Expense | null> {
  return supabaseFetchExpenseById(businessId, expenseId);
}

export function listenExpenses(businessId: string, callback: (rows: Expense[]) => void) {
  return supabaseListenExpenses(businessId, callback);
}

export function listenExpensesByCategory(businessId: string, category: ExpenseCategory, callback: (rows: Expense[]) => void) {
  return supabaseListenExpensesByCategory(businessId, category, callback);
}

export async function fetchExpensesInRange(businessId: string, startDate: Date, endDate: Date): Promise<Expense[]> {
  return supabaseFetchExpensesInRange(businessId, startDate, endDate);
}
