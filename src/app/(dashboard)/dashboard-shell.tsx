"use client";

import { Sidebar } from "@/components/dashboard/sidebar";
import { AuthGuard } from "@/features/auth/components/auth-context";

export function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <Sidebar>{children}</Sidebar>
    </AuthGuard>
  );
}
