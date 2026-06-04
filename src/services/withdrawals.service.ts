import {
  createWithdrawal as supabaseCreateWithdrawal,
  updateWithdrawal as supabaseUpdateWithdrawal,
  deleteWithdrawal as supabaseDeleteWithdrawal,
  fetchWithdrawalById as supabaseFetchWithdrawalById,
  listenWithdrawals as supabaseListenWithdrawals,
  listenWithdrawalsByCategory as supabaseListenWithdrawalsByCategory,
  fetchWithdrawalsInRange as supabaseFetchWithdrawalsInRange,
} from "@/lib/supabase.service";
import type { Withdrawal, WithdrawalCategory } from "@/types/domain";

export async function createWithdrawal(businessId: string, payload: {
  amount: number;
  reason: string;
  category: WithdrawalCategory;
  withdrawalDate: Date;
  notes?: string;
  actorUid: string;
  actorName: string;
}) {
  return supabaseCreateWithdrawal(businessId, payload);
}

export async function updateWithdrawal(
  businessId: string,
  withdrawalId: string,
  payload: Partial<Omit<Withdrawal, "id" | "businessId" | "createdAt" | "withdrawnByUid" | "withdrawnByName">>
) {
  return supabaseUpdateWithdrawal(businessId, withdrawalId, payload);
}

export async function deleteWithdrawal(businessId: string, withdrawalId: string) {
  return supabaseDeleteWithdrawal(businessId, withdrawalId);
}

export async function fetchWithdrawalById(businessId: string, withdrawalId: string): Promise<Withdrawal | null> {
  return supabaseFetchWithdrawalById(businessId, withdrawalId);
}

export function listenWithdrawals(businessId: string, callback: (rows: Withdrawal[]) => void) {
  return supabaseListenWithdrawals(businessId, callback);
}

export function listenWithdrawalsByCategory(businessId: string, category: WithdrawalCategory, callback: (rows: Withdrawal[]) => void) {
  return supabaseListenWithdrawalsByCategory(businessId, category, callback);
}

export async function fetchWithdrawalsInRange(businessId: string, startDate: Date, endDate: Date): Promise<Withdrawal[]> {
  return supabaseFetchWithdrawalsInRange(businessId, startDate, endDate);
}
