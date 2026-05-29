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
import { withdrawalsCollection, transactionsCollection } from "@/services/collections";
import type { Withdrawal, WithdrawalCategory } from "@/types/domain";

export async function createWithdrawal(
  businessId: string,
  payload: {
    amount: number;
    reason: string;
    category: WithdrawalCategory;
    withdrawalDate: Date;
    notes?: string;
    actorUid: string;
    actorName: string;
  }
) {
  const batch = writeBatch(db);
  const withdrawalRef = doc(withdrawalsCollection(businessId));
  batch.set(withdrawalRef, {
    businessId,
    amount: payload.amount,
    reason: payload.reason,
    category: payload.category,
    withdrawnByUid: payload.actorUid,
    withdrawnByName: payload.actorName,
    withdrawalDate: Timestamp.fromDate(payload.withdrawalDate),
    notes: payload.notes ?? "",
    createdAt: serverTimestamp(),
  });

  const transactionRef = doc(transactionsCollection(businessId));
  batch.set(transactionRef, {
    businessId,
    type: "withdrawal",
    amount: -Math.abs(payload.amount),
    description: `Withdrawal: ${payload.reason}`,
    referenceId: withdrawalRef.id,
    referenceType: "withdrawal",
    referenceLabel: payload.category,
    performedByUid: payload.actorUid,
    performedByName: payload.actorName,
    status: "completed",
    notes: payload.notes ?? "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
  return withdrawalRef.id;
}

export async function updateWithdrawal(
  businessId: string,
  withdrawalId: string,
  payload: Partial<Omit<Withdrawal, "id" | "businessId" | "createdAt" | "withdrawnByUid" | "withdrawnByName">>
) {
  const batch = writeBatch(db);
  batch.update(doc(withdrawalsCollection(businessId), withdrawalId), { ...payload });
  const txSnapshot = await getDocs(query(transactionsCollection(businessId), where("referenceId", "==", withdrawalId)));
  txSnapshot.docs.forEach((tx) => {
    batch.update(tx.ref, {
      amount: payload.amount !== undefined ? -Math.abs(payload.amount) : tx.data().amount,
      description: payload.reason ? `Withdrawal: ${payload.reason}` : tx.data().description,
      referenceLabel: payload.category ?? tx.data().referenceLabel,
      notes: payload.notes ?? tx.data().notes ?? "",
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
}

export async function deleteWithdrawal(businessId: string, withdrawalId: string) {
  const batch = writeBatch(db);
  batch.delete(doc(withdrawalsCollection(businessId), withdrawalId));
  const txSnapshot = await getDocs(query(transactionsCollection(businessId), where("referenceId", "==", withdrawalId)));
  txSnapshot.docs.forEach((tx) => batch.delete(tx.ref));
  await batch.commit();
}

export async function fetchWithdrawalById(businessId: string, withdrawalId: string): Promise<Withdrawal | null> {
  const snapshot = await getDoc(doc(withdrawalsCollection(businessId), withdrawalId));
  if (!snapshot.exists()) return null;
  return { ...snapshot.data(), id: snapshot.id } as Withdrawal;
}

export function listenWithdrawals(businessId: string, callback: (rows: Withdrawal[]) => void) {
  const q = query(withdrawalsCollection(businessId), orderBy("withdrawalDate", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((docItem) => ({ ...docItem.data(), id: docItem.id })));
  });
}

export function listenWithdrawalsByCategory(businessId: string, category: WithdrawalCategory, callback: (rows: Withdrawal[]) => void) {
  const q = query(withdrawalsCollection(businessId), where("category", "==", category), orderBy("withdrawalDate", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((docItem) => ({ ...docItem.data(), id: docItem.id })));
  });
}

export async function fetchWithdrawalsInRange(businessId: string, startDate: Date, endDate: Date): Promise<Withdrawal[]> {
  const q = query(
    withdrawalsCollection(businessId),
    where("withdrawalDate", ">=", startDate),
    where("withdrawalDate", "<=", endDate),
    orderBy("withdrawalDate", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docItem) => ({ ...docItem.data(), id: docItem.id })) as Withdrawal[];
}
