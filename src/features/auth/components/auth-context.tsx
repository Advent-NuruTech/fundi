"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Business, UserProfile } from "@/types/domain";
import { canAccessRoute } from "@/lib/permissions";
import { authStateListener, loginWithEmail, logoutUser, registerOwner, resolveProfile } from "@/services/auth.service";
import { fetchBusinessProfile } from "@/services/firestore.service";
import { useSessionStore } from "@/store/session-store";

interface AuthContextValue {
  user: (UserProfile & { name: string }) | null;
  business: Business | null;
  loading: boolean;
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
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { profile, loading, setLoading, setProfile } = useSessionStore();
  const [business, setBusiness] = useState<Business | null>(null);

  useEffect(() => {
    const unsub = authStateListener(async (firebaseUser) => {
      if (!firebaseUser) {
        setProfile(null);
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
      login: async (email, password) => {
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
    }),
    [profile, loading, business]
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
    if (!loading && !user) {
      router.replace("/login");
      return;
    }
    if (!loading && user?.mustChangePassword && pathname !== "/change-password") {
      router.replace("/change-password");
      return;
    }
    if (!loading && user && !canAccessRoute(user, pathname)) {
      router.replace("/dashboard");
    }
  }, [loading, pathname, router, user]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-sm text-slate-600 shadow-sm">
          Loading your workshop...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
