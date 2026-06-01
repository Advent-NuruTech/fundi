"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Business, UserProfile } from "@/types/domain";
import { canAccessRoute } from "@/lib/permissions";
import { authStateListener, loginWithEmail, logoutUser, registerOwner, resolveProfile } from "@/services/auth.service";
import { fetchBusinessProfile } from "@/services/firestore.service";
import { useSessionStore } from "@/store/session-store";

export type OnboardingStep = "idle" | "authenticating" | "setting_up" | "redirecting" | "complete" | "error";

interface AuthContextValue {
  user: (UserProfile & { name: string }) | null;
  business: Business | null;
  loading: boolean;
  onboardingStep: OnboardingStep;
  setOnboardingStep: (step: OnboardingStep) => void;
  login: (email: string, password: string) => Promise<void>;
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
    const unsub = authStateListener(async (firebaseUser) => {
      if (!firebaseUser) {
        setProfile(null);
        setBusiness(null);
        setLoading(false);
        return;
      }
      const resolved = await resolveProfile(firebaseUser);
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
    const { auth } = await import("@/lib/firebase");
    if (!auth.currentUser) return;
    const resolved = await resolveProfile(auth.currentUser);
    if (resolved) {
      setProfile(resolved);
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
      },
      registerOwner: async (input) => {
        await registerOwner(input);
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
