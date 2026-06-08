"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/features/auth/components/auth-context";
import { ACTIVE_SUBSCRIPTION_STATUSES } from "@/lib/billing/constants";

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

/**
 * Wraps dashboard content. If the workspace has no active subscription the
 * owner is redirected to /pricing; team members see the dashboard (their
 * access depends on the owner's subscription being active).
 *
 * Non-owner roles bypass the subscription check — they can't pay anyway.
 */
export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const { subscription, loading: subLoading } = useSubscription();
  const router = useRouter();

  const isOwner = user?.role === "owner";

  useEffect(() => {
    if (authLoading || subLoading) return;
    if (!isOwner) return; // non-owners bypass subscription enforcement

    if (subscription === null) {
      // No subscription record at all → must pay
      router.replace("/pricing");
      return;
    }

    if (subscription.status === "pending_payment") {
      router.replace("/billing/pending");
      return;
    }

    if (!ACTIVE_SUBSCRIPTION_STATUSES.includes(subscription.status)) {
      router.replace("/pricing");
    }
  }, [authLoading, subLoading, subscription, isOwner, router]);

  // Show nothing while checking (avoids flash of protected content)
  if (authLoading || (isOwner && subLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Owner with non-active subscription — redirect is in-flight; hide content
  if (
    isOwner &&
    subscription !== null &&
    !ACTIVE_SUBSCRIPTION_STATUSES.includes(subscription.status)
  ) {
    return null;
  }

  return <>{children}</>;
}
