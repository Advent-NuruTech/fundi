import {
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { expensesCollection, transactionsCollection } from "@/services/collections";
import type { Expense, ExpenseCategory } from "@/types/domain";

export async function createExpense(
  businessId: string,
  payload: {
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
  }
) {
  const batch = writeBatch(db);
  const expenseRef = doc(expensesCollection(businessId));
  batch.set(expenseRef, {
    businessId,
    category: payload.category,
    amount: payload.amount,
    description: payload.description,
    notes: payload.notes ?? "",
    receiptUrl: payload.receiptUrl ?? "",
    supplierId: payload.supplierId ?? "",
    supplierName: payload.supplierName ?? "",
    expenseDate: Timestamp.fromDate(payload.expenseDate),
    createdByUid: payload.actorUid,
    createdByName: payload.actorName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const transactionRef = doc(transactionsCollection(businessId));
  batch.set(transactionRef, {
    businessId,
    type: "expense",
    amount: -Math.abs(payload.amount),
    description: `Expense: ${payload.description}`,
    referenceId: expenseRef.id,
    referenceType: "expense",
    referenceLabel: payload.category,
    linkedEntityId: payload.supplierId ?? "",
    linkedEntityType: payload.supplierId ? "supplier" : "",
    linkedEntityName: payload.supplierName ?? "",
    performedByUid: payload.actorUid,
    performedByName: payload.actorName,
    status: "completed",
    notes: payload.notes ?? "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
  return expenseRef.id;
}

export async function updateExpense(
  businessId: string,
  expenseId: string,
  payload: Partial<Omit<Expense, "id" | "businessId" | "createdAt" | "createdByUid" | "createdByName">>
) {
  const batch = writeBatch(db);
  batch.update(doc(expensesCollection(businessId), expenseId), {
    ...payload,
    updatedAt: serverTimestamp(),
  });
  const txSnapshot = await getDocs(query(transactionsCollection(businessId), where("referenceId", "==", expenseId)));
  txSnapshot.docs.forEach((tx) => {
    batch.update(tx.ref, {
      amount: payload.amount !== undefined ? -Math.abs(payload.amount) : tx.data().amount,
      description: payload.description ? `Expense: ${payload.description}` : tx.data().description,
      referenceLabel: payload.category ?? tx.data().referenceLabel,
      linkedEntityId: payload.supplierId ?? tx.data().linkedEntityId ?? "",
      linkedEntityName: payload.supplierName ?? tx.data().linkedEntityName ?? "",
      notes: payload.notes ?? tx.data().notes ?? "",
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
}

export async function deleteExpense(businessId: string, expenseId: string) {
  const batch = writeBatch(db);
  batch.delete(doc(expensesCollection(businessId), expenseId));
  const txSnapshot = await getDocs(query(transactionsCollection(businessId), where("referenceId", "==", expenseId)));
  txSnapshot.docs.forEach((tx) => batch.delete(tx.ref));
  await batch.commit();
}

export async function fetchExpenseById(businessId: string, expenseId: string): Promise<Expense | null> {
  const snapshot = await getDoc(doc(expensesCollection(businessId), expenseId));
  if (!snapshot.exists()) return null;
  return { ...snapshot.data(), id: snapshot.id } as Expense;
}

export function listenExpenses(businessId: string, callback: (rows: Expense[]) => void) {
  const q = query(expensesCollection(businessId), orderBy("expenseDate", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((docItem) => ({ ...docItem.data(), id: docItem.id })));
  });
}

export function listenExpensesByCategory(businessId: string, category: ExpenseCategory, callback: (rows: Expense[]) => void) {
  const q = query(expensesCollection(businessId), where("category", "==", category), orderBy("expenseDate", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((docItem) => ({ ...docItem.data(), id: docItem.id })));
  });
}

export async function fetchExpensesInRange(businessId: string, startDate: Date, endDate: Date): Promise<Expense[]> {
  const q = query(
    expensesCollection(businessId),
    where("expenseDate", ">=", startDate),
    where("expenseDate", "<=", endDate),
    orderBy("expenseDate", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docItem) => ({ ...docItem.data(), id: docItem.id })) as Expense[];
}
