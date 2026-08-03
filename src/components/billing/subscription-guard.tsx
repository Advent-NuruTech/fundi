"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSubscription } from "@/hooks/useSubscription";
import { useFreeTrialEnabled } from "@/hooks/useFreeTrialEnabled";
import { useAuth } from "@/features/auth/components/auth-context";
import { ACTIVE_SUBSCRIPTION_STATUSES, isTrialExpired } from "@/lib/billing/constants";
import type { Subscription } from "@/types/billing";

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

/**
 * Decide whether an owner's subscription grants dashboard access right now.
 * A `trialing` subscription is full access until its deadline passes; an
 * expired trial counts as no access (the owner must pay to continue).
 */
function ownerHasAccess(subscription: Subscription | null): boolean {
  if (!subscription) return false;
  if (subscription.status === "trialing") {
    return !isTrialExpired(subscription.trialEndsAt);
  }
  return ACTIVE_SUBSCRIPTION_STATUSES.includes(subscription.status);
}

/**
 * Wraps dashboard content. Routes owners without access to the right place:
 * no subscription → start a free trial; pending payment → pending screen;
 * lapsed trial → checkout to pay; otherwise → pricing. Team members bypass
 * the check (their access rides on the owner's subscription).
 */
export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const { subscription, loading: subLoading } = useSubscription();
  const { enabled: freeTrialEnabled, loading: trialFlagLoading } = useFreeTrialEnabled();
  const router = useRouter();

  const isOwner = user?.role === "owner";

  useEffect(() => {
    if (authLoading || subLoading) return;
    if (!isOwner) return; // non-owners bypass subscription enforcement

    if (subscription === null) {
      // Brand-new workspace → free trial (if live) or choose a plan (if off)
      if (trialFlagLoading) return;
      router.replace(freeTrialEnabled ? "/start-trial" : "/pricing");
      return;
    }

    if (subscription.status === "pending_payment") {
      router.replace("/billing/pending");
      return;
    }

    // Trial that has run out → must pay to continue
    if (
      subscription.status === "trialing" &&
      isTrialExpired(subscription.trialEndsAt)
    ) {
      router.replace(`/checkout?plan=${subscription.planSlug}&expired=trial`);
      return;
    }

    if (!ownerHasAccess(subscription)) {
      router.replace("/pricing");
    }
  }, [authLoading, subLoading, subscription, isOwner, router, freeTrialEnabled, trialFlagLoading]);

  // Show nothing while checking (avoids flash of protected content)
  if (
    authLoading ||
    (isOwner && subLoading) ||
    (isOwner && subscription === null && trialFlagLoading)
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Owner without access — redirect is in-flight; hide content
  if (isOwner && !ownerHasAccess(subscription)) {
    return null;
  }

  return <>{children}</>;
}
