"use client";

export const dynamic = "force-dynamic";

import { AdminShell } from "@/components/admin/admin-shell";
import { PlatformTeamTable } from "@/components/admin/platform-team-table";
import { Shield } from "lucide-react";

export default function PlatformTeamPage() {
  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-600/20">
            <Shield className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Platform Team</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              FundiFlow operators — the people who run this platform. Entirely separate from tenant businesses.
            </p>
          </div>
        </div>

        {/* Separator callout */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-xs text-slate-500">
          <span className="font-medium text-slate-400">Platform operators</span> authenticate via{" "}
          <code className="rounded bg-slate-800 px-1.5 py-0.5">/ffmanage/login</code> and are stored in{" "}
          <code className="rounded bg-slate-800 px-1.5 py-0.5">platform_admins</code>. They are never
          counted or listed as tenant businesses. Onboard new operators via{" "}
          <code className="rounded bg-slate-800 px-1.5 py-0.5">Invite Links</code>.
        </div>

        <PlatformTeamTable />
      </div>
    </AdminShell>
  );
}
