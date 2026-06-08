"use client";

export const dynamic = "force-dynamic";

import { AdminShell } from "@/components/admin/admin-shell";
import { BusinessesTable } from "@/components/admin/businesses-table";

export default function AdminBusinessesPage() {
  return (
    <AdminShell>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Businesses</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Manage all registered businesses and their subscriptions
          </p>
        </div>
        <BusinessesTable />
      </div>
    </AdminShell>
  );
}
