"use client";

import { Sidebar } from "@/components/dashboard/sidebar";
import { AuthGuard } from "@/features/auth/components/auth-context";
import { SyncIndicator } from "@/components/pwa/sync-indicator";
import { InstallPrompt } from "@/components/pwa/install-prompt";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <Sidebar>
        {children}
      </Sidebar>
      <div className="fixed bottom-20 right-4 z-40 hidden lg:block">
        <SyncIndicator />
      </div>
      <InstallPrompt />
    </AuthGuard>
  );
}
