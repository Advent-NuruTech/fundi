"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, AlertTriangle, X, CreditCard } from "lucide-react";
import { useAuth } from "@/features/auth/components/auth-context";
import { useSubscription } from "@/hooks/useSubscription";
import { getTrialDaysLeft, TRIAL_REMINDER_DAYS } from "@/lib/billing/constants";

const DISMISSED_KEY = "trial_banner_dismissed";

/**
 * Persistent (understated) banner while the workspace is on a free trial,
 * escalating to an urgent reminder once the trial has TRIAL_REMINDER_DAYS or
 * fewer days left. Only the owner sees the pay CTA. Once a trial expires the
 * SubscriptionGuard takes over and routes the owner to checkout, so this
 * banner only handles the "still inside the trial" window.
 */
export function TrialBanner() {
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  // Dismissal resets each browser session (so the reminder returns).
  useEffect(() => {
    if (typeof window !== "undefined") {
      setDismissed(sessionStorage.getItem(DISMISSED_KEY) === "true");
    }
  }, []);

  const visibleRoles = ["owner", "admin_manager", "cashier"];
  if (!user || !visibleRoles.includes(user.role)) return null;
  if (!subscription || subscription.status !== "trialing") return null;

  const daysLeft = getTrialDaysLeft(subscription.trialEndsAt);
  if (daysLeft === null || daysLeft <= 0) return null; // expired → guard handles it

  const isOwner = user.role === "owner";
  const urgent = daysLeft <= TRIAL_REMINDER_DAYS;

  // Understated trials can be dismissed; the urgent reminder always shows.
  if (dismissed && !urgent) return null;

  const bg = urgent ? "bg-rose-600" : "bg-slate-900";
  const Icon = urgent ? AlertTriangle : Sparkles;

  const daysLabel = `${daysLeft} day${daysLeft > 1 ? "s" : ""}`;
  const message = urgent
    ? isOwner
      ? `Your free trial ends in ${daysLabel}. Pay now to keep using FundiFlow without interruption.`
      : `Your workspace's free trial ends in ${daysLabel}. Ask the owner to pay to continue.`
    : isOwner
      ? `You're on a free trial — ${daysLabel} left of full access.`
      : `This workspace is on a free trial — ${daysLabel} left.`;

  function handleUpgrade() {
    router.push(`/checkout?plan=${subscription!.planSlug}`);
  }

  function handleDismiss() {
    setDismissed(true);
    if (typeof window !== "undefined") sessionStorage.setItem(DISMISSED_KEY, "true");
  }

  return (
    <div
      className={`fixed top-0 inset-x-0 z-[9998] flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-white shadow-md ${bg}`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{message}</span>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {isOwner && (
          <button
            onClick={handleUpgrade}
            className="flex items-center gap-1.5 rounded-md bg-white/20 px-3 py-1 text-xs font-semibold transition-colors hover:bg-white/30"
          >
            <CreditCard className="h-3.5 w-3.5" />
            {urgent ? "Pay now" : "Upgrade"}
          </button>
        )}
        {!urgent && (
          <button
            onClick={handleDismiss}
            aria-label="Dismiss trial reminder"
            className="rounded-md p-1 transition-colors hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
