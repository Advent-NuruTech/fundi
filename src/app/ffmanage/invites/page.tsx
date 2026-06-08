"use client";

export const dynamic = "force-dynamic";

import { AdminShell } from "@/components/admin/admin-shell";
import { InviteLinksPanel } from "@/components/admin/invite-links-panel";

export default function AdminInvitesPage() {
  return (
    <AdminShell>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Invite Links</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Control who can register. Public signup is disabled after the first owner account is created.
          </p>
        </div>
        <InviteLinksPanel />
      </div>
    </AdminShell>
  );
}
