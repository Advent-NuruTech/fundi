"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, X, CreditCard } from "lucide-react";
import { useAuth } from "@/features/auth/components/auth-context";
import { useSubscription } from "@/hooks/useSubscription";

const REMINDER_DAYS = 10;
const DISMISSED_KEY = "billing_expiry_dismissed";

function getDaysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function ExpiryReminder() {
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  // Restore dismissed state from sessionStorage (resets each browser session)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem(DISMISSED_KEY);
      if (saved === "true") setDismissed(true);
    }
  }, []);

  // Only show for owner, admin_manager, and cashier roles
  const visibleRoles = ["owner", "admin_manager", "cashier"];
  if (!user || !visibleRoles.includes(user.role)) return null;
  if (!subscription || subscription.status !== "active") return null;
  if (dismissed) return null;

  const daysLeft = getDaysUntil(subscription.nextBillingDate);
  if (daysLeft === null || daysLeft > REMINDER_DAYS) return null;

  const isExpired = daysLeft <= 0;
  const isOwner = user.role === "owner";

  const urgency =
    daysLeft <= 3 ? "rose" :
    daysLeft <= 7 ? "amber" :
    "amber";

  const colorMap = {
    rose: "bg-rose-600",
    amber: "bg-amber-500",
  } as const;

  const bg = colorMap[urgency];

  function handleAction() {
    if (isOwner) {
      router.push("/settings/billing?action=renew");
    } else {
      // Non-owners: navigate to billing page (read-only view)
      router.push("/settings/billing");
    }
  }

  function handleDismiss() {
    setDismissed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(DISMISSED_KEY, "true");
    }
  }

  return (
    <div
      className={`fixed top-0 inset-x-0 z-[9998] flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-white shadow-md ${bg}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="truncate">
          {isExpired
            ? "Your subscription billing date has passed — please renew to avoid service interruption."
            : daysLeft === 1
            ? "Your subscription billing date is tomorrow — renew now to avoid interruption."
            : `Your subscription billing date is in ${daysLeft} day${daysLeft > 1 ? "s" : ""}.`}
          {!isOwner && " Contact your workspace owner to renew."}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {isOwner && (
          <button
            onClick={handleAction}
            className="flex items-center gap-1.5 rounded-md bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30 transition-colors"
          >
            <CreditCard className="h-3.5 w-3.5" />
            Renew now
          </button>
        )}
        <button
          onClick={handleDismiss}
          aria-label="Dismiss billing reminder"
          className="rounded-md p-1 hover:bg-white/20 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
