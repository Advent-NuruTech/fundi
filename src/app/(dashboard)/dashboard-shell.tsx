"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { AuthGuard } from "@/features/auth/components/auth-context";
import { SyncIndicator } from "@/components/pwa/sync-indicator";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { SubscriptionGuard } from "@/components/billing/subscription-guard";
import { ExpiryReminder } from "@/components/billing/expiry-reminder";
import { TrialBanner } from "@/components/billing/trial-banner";
import { WifiOff, RefreshCw, X } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useSyncEngine } from "@/hooks/useSyncEngine";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import { processPendingPortalAccounts } from "@/services/customer-portal.service";

/**
 * Background worker for the Customer Portal. Whenever the dashboard is online
 * it provisions portal accounts for any customer created offline (or whose
 * provisioning failed earlier). Idempotent — provisioned customers are skipped.
 */
function PortalProvisioner() {
  const { businessId, ready } = useBusinessContext();
  const { online } = useNetworkStatus();

  useEffect(() => {
    if (!ready || !businessId || !online) return;

    let cancelled = false;
    const run = () => {
      if (!cancelled) processPendingPortalAccounts(businessId).catch(() => {});
    };

    run();
    // Retry a few seconds later to catch customers that were synced during the
    // most recent sync cycle.
    const retry = setTimeout(run, 8000);

    return () => {
      cancelled = true;
      clearTimeout(retry);
    };
  }, [businessId, ready, online]);

  return null;
}

function OfflineBanner() {
  const { online, wasOffline } = useNetworkStatus();
  const { pendingCount, isSyncing, triggerSync } = useSyncEngine();
  const [justReconnected, setJustReconnected] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (online && wasOffline) {
      setJustReconnected(true);
      triggerSync().catch(() => {});
      const t = setTimeout(() => setJustReconnected(false), 5000);
      return () => clearTimeout(t);
    }
  }, [online, wasOffline, triggerSync]);

  const variant = !online
    ? "offline"
    : justReconnected
      ? "reconnected"
      : pendingCount > 0
        ? "pending"
        : null;

  // Auto-dismiss every banner after 30s at the most. The timer resets whenever
  // the banner changes state so the user is never blocked from the UI.
  useEffect(() => {
    if (!variant) {
      setDismissed(false);
      return;
    }
    setDismissed(false);
    const t = setTimeout(() => setDismissed(true), 30000);
    return () => clearTimeout(t);
  }, [variant]);

  // Nothing to show
  if (!variant || dismissed) return null;

  const closeButton = (
    <button
      onClick={() => setDismissed(true)}
      aria-label="Dismiss notification"
      className="shrink-0 rounded-md bg-white/20 p-1 transition hover:bg-white/30"
    >
      <X className="h-4 w-4" />
    </button>
  );

  if (variant === "reconnected") {
    return (
      <div className="fixed top-0 inset-x-0 z-[9999] flex items-center gap-2 bg-emerald-600 px-4 py-2 text-sm text-white shadow-md">
        <RefreshCw className={`h-3.5 w-3.5 shrink-0 ${isSyncing ? "animate-spin" : ""}`} />
        <span className="flex-1">
          {isSyncing
            ? "Back online — syncing your saved data…"
            : pendingCount > 0
            ? `Back online — ${pendingCount} item${pendingCount > 1 ? "s" : ""} waiting to sync`
            : "Back online — everything synced ✓"}
        </span>
        {closeButton}
      </div>
    );
  }

  if (variant === "pending") {
    return (
      <div className="fixed top-0 inset-x-0 z-[9999] flex items-center justify-between gap-2 bg-blue-600 px-4 py-2 text-sm text-white shadow-md">
        <span className="flex flex-1 items-center gap-2">
          <RefreshCw className={`h-3.5 w-3.5 shrink-0 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing
            ? `Syncing ${pendingCount} saved item${pendingCount > 1 ? "s" : ""}…`
            : `${pendingCount} item${pendingCount > 1 ? "s" : ""} saved offline — tap to sync`}
        </span>
        {!isSyncing && (
          <button
            onClick={() => triggerSync().catch(() => {})}
            className="shrink-0 rounded-md bg-white/20 px-2.5 py-1 text-xs font-semibold hover:bg-white/30"
          >
            Sync now
          </button>
        )}
        {closeButton}
      </div>
    );
  }

  // Offline — amber banner across the top
  return (
    <div className="fixed top-0 inset-x-0 z-[9999] flex items-center gap-3 bg-amber-500 px-4 py-2.5 text-sm font-medium text-white shadow-md">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span className="flex-1">
        You&apos;re offline — viewing saved data.{" "}
        <span className="font-normal opacity-90">New records will sync when you reconnect.</span>
      </span>
      {closeButton}
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <SubscriptionGuard>
        <OfflineBanner />
        <PortalProvisioner />
        <ExpiryReminder />
        <TrialBanner />
        <Sidebar>
          {children}
        </Sidebar>
        {/* Desktop sync dot — still useful for sync state at a glance */}
        <div className="fixed bottom-20 right-4 z-40 hidden lg:block">
          <SyncIndicator />
        </div>
        <InstallPrompt />
      </SubscriptionGuard>
    </AuthGuard>
  );
}
