"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Plus } from "lucide-react";
import type { EmployeeInvitation, Order, UserProfile } from "@/types/domain";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import { usePermissions } from "@/modules/shared/use-permissions";
import { deactivateMember, listenInvitations, listenMembers, listenOrders } from "@/services/firestore.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function EmployeesPage() {
  const { businessId, ready } = useBusinessContext();
  const permissions = usePermissions();
  const [search, setSearch] = useState("");
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [invitations, setInvitations] = useState<EmployeeInvitation[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!ready) return;
    const unsubMembers = listenMembers(businessId, setMembers);
    const unsubInvites = listenInvitations(businessId, setInvitations);
    const unsubOrders = listenOrders(businessId, setOrders);
    return () => {
      unsubMembers();
      unsubInvites();
      unsubOrders();
    };
  }, [businessId, ready]);

  const filtered = useMemo(() => {
    return members.filter((member) =>
      `${member.displayName} ${member.email}`.toLowerCase().includes(search.toLowerCase())
    );
  }, [members, search]);

  if (!permissions.canManageTeam) {
    return <div className="text-sm text-slate-500">You do not have access to employee management.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Employees</h1>
          <p className="text-gray-500">Manage workshop team, roles, and invitations.</p>
        </div>
        <Link
          href="/employees/new"
          className="flex items-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
        >
          <Plus className="h-4 w-4" />
          Invite Employee
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="h-14 w-full rounded-2xl border border-gray-200 bg-white pl-12 pr-4 text-sm outline-none focus:border-black focus:ring-2 focus:ring-neutral-100"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((member) => {
          const assignedOrders = orders.filter((order) => order.assignedTailorId === member.uid && order.stage !== "delivered").length;
          const lateOrders = orders.filter((order) => order.assignedTailorId === member.uid && order.dueDate < new Date().toISOString().slice(0, 10) && order.stage !== "delivered").length;
          return (
            <div key={member.uid} className="rounded-3xl border bg-white p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{member.displayName}</p>
                  <p className="text-xs text-slate-500">{member.email}</p>
                </div>
                <Badge variant={member.active ? "success" : "danger"}>{member.active ? "Active" : "Inactive"}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {(member.roles?.length ? member.roles : [member.role]).map((role) => (
                  <Badge key={`${member.uid}-${role}`}>{role.replaceAll("_", " ")}</Badge>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl bg-slate-50 p-2">Assigned: {assignedOrders}</div>
                <div className="rounded-xl bg-rose-50 p-2 text-rose-700">Late: {lateOrders}</div>
              </div>
              <div className="mt-4 flex gap-2">
                <Link href={`/employees/${member.uid}`} className="rounded-xl border px-3 py-2 text-xs">View activity</Link>
                {member.role !== "owner" && (
                  <Button
                    size="sm"
                    variant={member.active ? "danger" : "outline"}
                    onClick={() => deactivateMember(businessId, member.uid, !member.active)}
                  >
                    {member.active ? "Deactivate" : "Activate"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border bg-white p-4">
        <h2 className="text-sm font-semibold">Recent Invitations</h2>
        <div className="mt-2 space-y-2 text-sm">
          {invitations.slice(0, 8).map((invite) => (
            <div key={invite.id} className="rounded-xl border border-slate-200 px-3 py-2">
              {invite.displayName} ({invite.email}) - {invite.status}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
