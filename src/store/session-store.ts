"use client";

import { create } from "zustand";
import type { UserProfile } from "@/types/domain";

interface SessionState {
  profile: UserProfile | null;
  loading: boolean;
  /** The business the user is currently working in (multi-business switching). */
  activeBusinessId: string | null;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setActiveBusinessId: (id: string | null) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  profile: null,
  loading: true,
  activeBusinessId: null,
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  setActiveBusinessId: (activeBusinessId) => set({ activeBusinessId }),
}));

// ── Active-business persistence (per login) ───────────────────────────────────
// Remembered across reloads so a user stays in the business they last chose.

const KEY_PREFIX = "fundiflow_active_business_";

export function readStoredActiveBusiness(uid: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(KEY_PREFIX + uid);
  } catch {
    return null;
  }
}

export function writeStoredActiveBusiness(uid: string, businessId: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (businessId) window.localStorage.setItem(KEY_PREFIX + uid, businessId);
    else window.localStorage.removeItem(KEY_PREFIX + uid);
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

// ── Active-branch persistence (per login + business) ──────────────────────────

const BRANCH_KEY_PREFIX = "fundiflow_active_branch_";

export function readStoredBranch(uid: string, businessId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(`${BRANCH_KEY_PREFIX}${uid}_${businessId}`);
  } catch {
    return null;
  }
}

export function writeStoredBranch(uid: string, businessId: string, branchId: string | null) {
  if (typeof window === "undefined") return;
  try {
    const key = `${BRANCH_KEY_PREFIX}${uid}_${businessId}`;
    if (branchId) window.localStorage.setItem(key, branchId);
    else window.localStorage.removeItem(key);
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}
