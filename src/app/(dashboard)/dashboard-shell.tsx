"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { AuthGuard } from "@/features/auth/components/auth-context";
import { SyncIndicator } from "@/components/pwa/sync-indicator";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { SubscriptionGuard } from "@/components/billing/subscription-guard";
import { ExpiryReminder } from "@/components/billing/expiry-reminder";
import { TrialBanner } from "@/components/billing/trial-banner";
import { WifiOff, RefreshCw } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useSyncEngine } from "@/hooks/useSyncEngine";

function OfflineBanner() {
  const { online, wasOffline } = useNetworkStatus();
  const { pendingCount, isSyncing, triggerSync } = useSyncEngine();
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    if (online && wasOffline) {
      setJustReconnected(true);
      triggerSync().catch(() => {});
      const t = setTimeout(() => setJustReconnected(false), 5000);
      return () => clearTimeout(t);
    }
  }, [online, wasOffline, triggerSync]);

  // Nothing to show
  if (online && !justReconnected && pendingCount === 0) return null;

  if (online && justReconnected) {
    return (
      <div className="fixed top-0 inset-x-0 z-[9999] flex items-center gap-2 bg-emerald-600 px-4 py-2 text-sm text-white shadow-md">
        <RefreshCw className={`h-3.5 w-3.5 shrink-0 ${isSyncing ? "animate-spin" : ""}`} />
        <span>
          {isSyncing
            ? "Back online — syncing your saved data…"
            : pendingCount > 0
            ? `Back online — ${pendingCount} item${pendingCount > 1 ? "s" : ""} waiting to sync`
            : "Back online — everything synced ✓"}
        </span>
      </div>
    );
  }

  if (online && pendingCount > 0) {
    return (
      <div className="fixed top-0 inset-x-0 z-[9999] flex items-center justify-between gap-2 bg-blue-600 px-4 py-2 text-sm text-white shadow-md">
        <span className="flex items-center gap-2">
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
      </div>
    );
  }

  // Offline — amber banner across the top
  return (
    <div className="fixed top-0 inset-x-0 z-[9999] flex items-center gap-3 bg-amber-500 px-4 py-2.5 text-sm font-medium text-white shadow-md">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>
        You&apos;re offline — viewing saved data.{" "}
        <span className="font-normal opacity-90">New records will sync when you reconnect.</span>
      </span>
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <SubscriptionGuard>
        <OfflineBanner />
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
