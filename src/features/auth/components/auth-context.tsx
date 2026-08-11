"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Branch, Business, BusinessMembership, UserProfile } from "@/types/domain";
import { canAccessRoute } from "@/lib/permissions";
import {
  authStateListener,
  ensureProfileExists,
  loginWithEmail,
  loginWithGoogle,
  logoutUser,
  registerAdditionalBusiness,
  registerOwner,
  resolveProfile,
} from "@/services/auth.service";
import {
  fetchBusinessProfile,
  fetchBranches,
  fetchUserMemberships,
  fetchUserProfile,
  createBranch,
  setActiveBranch,
} from "@/services/firestore.service";
import { supabase } from "@/lib/supabase";
import {
  useSessionStore,
  readStoredActiveBusiness,
  writeStoredActiveBusiness,
  readStoredBranch,
  writeStoredBranch,
} from "@/store/session-store";
import { getAppState, setAppState } from "@/lib/local-db";
import { isOffline } from "@/lib/offline-write";
import type { BusinessType } from "@/lib/business-types";

export type OnboardingStep = "idle" | "authenticating" | "setting_up" | "redirecting" | "complete" | "error";

interface AuthContextValue {
  user: (UserProfile & { name: string }) | null;
  business: Business | null;
  loading: boolean;
  onboardingStep: OnboardingStep;
  setOnboardingStep: (step: OnboardingStep) => void;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (redirect?: string) => Promise<void>;
  registerOwner: (input: {
    email: string;
    password: string;
    displayName: string;
    phone: string;
    businessName: string;
    location: string;
    businessType?: import("@/lib/business-types").BusinessType;
  }) => Promise<void>;
  logout: () => Promise<void>;
  isOwner: boolean;
  isTailor: boolean;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
  /** Every business this login can access, with the role held in each. */
  memberships: BusinessMembership[];
  /** The currently active business id (drives the whole app's scope). */
  activeBusinessId: string | null;
  /** Switch the active business. No-op if the id isn't one the user belongs to. */
  switchBusiness: (businessId: string) => Promise<void>;
  /** Create a new business for this login and switch to it. Returns its id. */
  addBusiness: (input: {
    businessName: string;
    location?: string;
    phone?: string;
    businessType: BusinessType;
  }) => Promise<string>;
  /** Branches (outlets) within the active business. */
  branches: Branch[];
  /** The active branch id (scopes transactional data inside the business). */
  activeBranchId: string | null;
  /** Switch the active branch. Reloads to re-scope all data cleanly. */
  switchBranch: (branchId: string) => void;
  /** Create a new branch in the active business and switch to it. */
  addBranch: (input: { name: string; location?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { profile, loading, setLoading, setProfile, activeBusinessId, setActiveBusinessId } = useSessionStore();
  const [business, setBusiness] = useState<Business | null>(null);
  const [memberships, setMemberships] = useState<BusinessMembership[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranchId, setActiveBranchIdState] = useState<string | null>(null);
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>("idle");

  // Resolve the active branch for a business: last chosen (if still present) →
  // the default branch → the first branch. Pushes it to the service layer so
  // every query scopes to it, and persists the choice per (user, business).
  const loadBranches = useCallback(async (uid: string, businessId: string) => {
    const rows = isOffline() ? [] : await fetchBranches(businessId).catch(() => []);
    setBranches(rows);
    const stored = readStoredBranch(uid, businessId);
    const ids = new Set(rows.map((r) => r.id));
    const active =
      (stored && ids.has(stored) && stored) ||
      rows.find((r) => r.isDefault)?.id ||
      rows[0]?.id ||
      null;
    setActiveBranchIdState(active);
    setActiveBranch(active);
    writeStoredBranch(uid, businessId, active);
    return active;
  }, []);

  // Load the business profile for a given id (+ its branches), falling back to
  // the offline cache for the business profile.
  const loadBusiness = useCallback(
    async (uid: string, businessId: string) => {
      let businessProfile = await fetchBusinessProfile(businessId).catch(() => null);
      if (!businessProfile) {
        businessProfile = await getAppState<Business>(`cached_business_${businessId}`).catch(() => null);
      }
      setBusiness(businessProfile);
      if (businessProfile && !isOffline()) {
        setAppState(`cached_business_${businessId}`, businessProfile).catch(() => {});
      }
      await loadBranches(uid, businessId);
      return businessProfile;
    },
    [loadBranches],
  );

  // Resolve memberships + decide which business is active, then load it.
  // Active business = last chosen (if still a member) → primary profile
  // business → first membership. Synthesizes a membership from the profile
  // when business_members is empty, so single-business accounts keep working.
  const resolveActiveContext = useCallback(
    async (uid: string, resolved: UserProfile) => {
      let rows: BusinessMembership[] = [];
      if (!isOffline()) {
        rows = await fetchUserMemberships(uid).catch(() => []);
      }
      if (!rows.length && resolved.businessId) {
        rows = [
          {
            businessId: resolved.businessId,
            businessName: "My Business",
            role: resolved.role,
            roles: resolved.roles?.length ? resolved.roles : resolved.role ? [resolved.role] : [],
          },
        ];
      }
      setMemberships(rows);

      const stored = readStoredActiveBusiness(uid);
      const ids = new Set(rows.map((r) => r.businessId));
      const active =
        (stored && ids.has(stored) && stored) ||
        (resolved.businessId && ids.has(resolved.businessId) && resolved.businessId) ||
        rows[0]?.businessId ||
        resolved.businessId ||
        null;

      setActiveBusinessId(active);
      writeStoredActiveBusiness(uid, active);
      if (active) await loadBusiness(uid, active);
      else {
        setBusiness(null);
        setBranches([]);
        setActiveBranchIdState(null);
        setActiveBranch(null);
      }
    },
    [loadBusiness, setActiveBusinessId],
  );

  useEffect(() => {
    const unsub = authStateListener(async (authUser, event) => {
      if (!authUser) {
        setProfile(null);
        setBusiness(null);
        setMemberships([]);
        setActiveBusinessId(null);
        setBranches([]);
        setActiveBranchIdState(null);
        setActiveBranch(null);
        setLoading(false);
        return;
      }

      let resolved = await resolveProfile(authUser);

      // Offline (or flaky network): restore the last known profile from the
      // local cache so the app keeps working without a connection. The
      // Supabase session itself is restored from local storage, so a cached
      // profile only ever applies to the same signed-in user.
      if (!resolved && isOffline()) {
        resolved = await getAppState<UserProfile>(`cached_profile_${authUser.id}`).catch(() => null);
      }

      // If no profile exists, attempt to create one via the onboard API.
      // Covers SIGNED_IN (active login) and INITIAL_SESSION (page reload
      // after email-confirmation or a failed first-time setup), so a user
      // with a valid Supabase session but missing DB records never gets
      // stuck in a redirect loop back to login.
      if (!resolved && !isOffline() && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        const fixed = await ensureProfileExists(authUser);
        if (fixed) {
          resolved = await fetchUserProfile(authUser.id);
        }
      }

      setProfile(resolved);
      if (resolved?.businessId || resolved) {
        if (!isOffline() && resolved) {
          setAppState(`cached_profile_${authUser.id}`, resolved).catch(() => {});
        }
        if (resolved) await resolveActiveContext(authUser.id, resolved);
      } else {
        setBusiness(null);
        setMemberships([]);
        setActiveBusinessId(null);
      }
      setLoading(false);
    });

    return unsub;
  }, [setLoading, setProfile, setActiveBusinessId, resolveActiveContext]);

  const refreshProfile = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const resolved = await resolveProfile(data.user);
    if (resolved) {
      setProfile(resolved);
      await resolveActiveContext(data.user.id, resolved);
    }
  }, [setProfile, resolveActiveContext]);

  const switchBusiness = useCallback(
    async (businessId: string) => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid || !memberships.some((m) => m.businessId === businessId)) return;
      // Persist and hard-reload: on boot, resolveActiveContext sets the active
      // business + branch (and the service-layer scope) before any data
      // listener mounts, so there's no window where queries run with a stale
      // branch from the previous business.
      writeStoredActiveBusiness(uid, businessId);
      if (typeof window !== "undefined") window.location.reload();
    },
    [memberships],
  );

  const switchBranch = useCallback(
    (branchId: string) => {
      if (!branches.some((b) => b.id === branchId) || branchId === activeBranchId) return;
      // Persist for the active business, then hard-reload so every listener
      // re-subscribes under the new branch scope (same business id, so a soft
      // re-render wouldn't re-run the data effects).
      const uid = profile?.uid;
      const bizId = activeBusinessId;
      if (uid && bizId) writeStoredBranch(uid, bizId, branchId);
      setActiveBranch(branchId);
      if (typeof window !== "undefined") window.location.reload();
    },
    [branches, activeBranchId, profile?.uid, activeBusinessId],
  );

  const addBranch = useCallback(
    async (input: { name: string; location?: string }) => {
      if (!activeBusinessId) return;
      const branch = await createBranch(activeBusinessId, input);
      const uid = profile?.uid;
      if (uid) writeStoredBranch(uid, activeBusinessId, branch.id);
      setActiveBranch(branch.id);
      if (typeof window !== "undefined") window.location.reload();
    },
    [activeBusinessId, profile?.uid],
  );

  const addBusiness = useCallback(
    async (input: { businessName: string; location?: string; phone?: string; businessType: BusinessType }) => {
      const newId = await registerAdditionalBusiness(input);
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        // Make the new business active, then hard-reload so the whole app
        // (scope, branches, navigation) re-resolves cleanly to it.
        writeStoredActiveBusiness(data.user.id, newId);
        if (typeof window !== "undefined") window.location.reload();
      }
      return newId;
    },
    [],
  );

  // The active membership overrides the raw profile's businessId/role/roles so
  // a user who is, say, owner of shop A and cashier of shop B sees the correct
  // scope and permissions for whichever business is currently active.
  const activeMembership = useMemo(
    () => memberships.find((m) => m.businessId === activeBusinessId) ?? null,
    [memberships, activeBusinessId],
  );

  const effectiveUser = useMemo(() => {
    if (!profile) return null;
    return {
      ...profile,
      businessId: activeBusinessId ?? profile.businessId,
      role: activeMembership?.role ?? profile.role,
      roles: activeMembership?.roles ?? profile.roles,
      name: profile.displayName,
    };
  }, [profile, activeBusinessId, activeMembership]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: effectiveUser,
      business,
      loading,
      memberships,
      activeBusinessId,
      switchBusiness,
      addBusiness,
      branches,
      activeBranchId,
      switchBranch,
      addBranch,
      onboardingStep,
      setOnboardingStep,
      login: async (email, password) => {
        setLoading(true);
        await loginWithEmail(email, password);
        // loading is cleared by authStateListener after profile resolves
      },
      loginWithGoogle: async (redirect) => {
        await loginWithGoogle(redirect);
      },
      registerOwner: async (input) => {
        setLoading(true);
        try {
          await registerOwner(input);
          await refreshProfile();
        } finally {
          setLoading(false);
        }
      },
      logout: async () => {
        await logoutUser();
      },
      isOwner: effectiveUser?.role === "owner",
      isTailor: effectiveUser?.role === "tailor",
      isAdmin: effectiveUser?.role === "admin_manager",
      refreshProfile,
    }),
    [
      effectiveUser,
      loading,
      business,
      memberships,
      activeBusinessId,
      switchBusiness,
      addBusiness,
      branches,
      activeBranchId,
      switchBranch,
      addBranch,
      onboardingStep,
      refreshProfile,
      setLoading,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!user.active) {
      logoutUser().finally(() => router.replace("/login"));
      return;
    }

    if (!canAccessRoute(user, pathname)) {
      router.replace("/dashboard");
    }
  }, [loading, user, pathname, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          <p className="text-sm text-slate-500">Loading your workshop...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
