"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Business, UserProfile } from "@/types/domain";
import { canAccessRoute } from "@/lib/permissions";
import {
  authStateListener,
  ensureProfileExists,
  loginWithEmail,
  loginWithGoogle,
  logoutUser,
  registerOwner,
  resolveProfile,
} from "@/services/auth.service";
import { fetchBusinessProfile, fetchUserProfile } from "@/services/firestore.service";
import { supabase } from "@/lib/supabase";
import { useSessionStore } from "@/store/session-store";

export type OnboardingStep = "idle" | "authenticating" | "setting_up" | "redirecting" | "complete" | "error";

interface AuthContextValue {
  user: (UserProfile & { name: string }) | null;
  business: Business | null;
  loading: boolean;
  onboardingStep: OnboardingStep;
  setOnboardingStep: (step: OnboardingStep) => void;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  registerOwner: (input: {
    email: string;
    password: string;
    displayName: string;
    phone: string;
    businessName: string;
    location: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  isOwner: boolean;
  isTailor: boolean;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { profile, loading, setLoading, setProfile } = useSessionStore();
  const [business, setBusiness] = useState<Business | null>(null);
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>("idle");

  useEffect(() => {
    const unsub = authStateListener(async (authUser, event) => {
      if (!authUser) {
        setProfile(null);
        setBusiness(null);
        setLoading(false);
        return;
      }

      let resolved = await resolveProfile(authUser);

      // If no profile exists, attempt to create one via the onboard API.
      // Covers SIGNED_IN (active login) and INITIAL_SESSION (page reload
      // after email-confirmation or a failed first-time setup), so a user
      // with a valid Supabase session but missing DB records never gets
      // stuck in a redirect loop back to login.
      if (!resolved && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        const fixed = await ensureProfileExists(authUser);
        if (fixed) {
          resolved = await fetchUserProfile(authUser.id);
        }
      }

      setProfile(resolved);
      if (resolved?.businessId) {
        const businessProfile = await fetchBusinessProfile(resolved.businessId);
        setBusiness(businessProfile);
      } else {
        setBusiness(null);
      }
      setLoading(false);
    });

    return unsub;
  }, [setLoading, setProfile]);

  const refreshProfile = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const resolved = await resolveProfile(data.user);
    if (resolved) {
      setProfile(resolved);
      if (resolved.businessId) {
        const businessProfile = await fetchBusinessProfile(resolved.businessId);
        setBusiness(businessProfile);
      }
    }
  }, [setProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: profile
        ? {
            ...profile,
            name: profile.displayName,
          }
        : null,
      business,
      loading,
      onboardingStep,
      setOnboardingStep,
      login: async (email, password) => {
        setLoading(true);
        await loginWithEmail(email, password);
        // loading is cleared by authStateListener after profile resolves
      },
      loginWithGoogle: async () => {
        await loginWithGoogle();
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
      isOwner: profile?.role === "owner",
      isTailor: profile?.role === "tailor",
      isAdmin: profile?.role === "admin_manager",
      refreshProfile,
    }),
    [profile, loading, business, onboardingStep, refreshProfile, setLoading]
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
