"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Save,
  Loader2,
  UserX,
  UserCheck,
  BadgeCheck,
} from "lucide-react";
import { toast } from "sonner";
import type { EmployeeInvitation, Order, UserProfile, UserRole } from "@/types/domain";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import { usePermissions } from "@/modules/shared/use-permissions";
import { useAuth } from "@/features/auth/components/auth-context";
import {
  deactivateMember,
  deleteInvitation,
  listenInvitations,
  listenMembers,
  listenOrders,
  removeMemberFromBusiness,
  updateMemberCompensation,
} from "@/services/firestore.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/profile/user-avatar";

// ─── Employee card ────────────────────────────────────────────────────────────

function EmployeeCard({
  member,
  orders,
  businessId,
  canManageTeam,
  isOwner,
}: {
  member: UserProfile;
  orders: Order[];
  businessId: string;
  canManageTeam: boolean;
  isOwner: boolean;
}) {
  const [showPay, setShowPay] = useState(false);
  const [payRate, setPayRate] = useState(String(member.payRate ?? ""));
  const [payPeriod, setPayPeriod] = useState<"daily" | "weekly" | "monthly">(
    member.payPeriod ?? "monthly"
  );
  const [nextPayDate, setNextPayDate] = useState(member.nextPayDate ?? "");
  const [savingPay, setSavingPay] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isNonOwner = member.role !== "owner";

  const assignedOrders = orders.filter(
    (o) => o.assignedTailorId === member.uid && o.stage !== "delivered"
  ).length;

  const lateOrders = orders.filter(
    (o) =>
      o.assignedTailorId === member.uid &&
      o.dueDate < new Date().toISOString().slice(0, 10) &&
      o.stage !== "delivered"
  ).length;

  const roles: UserRole[] = member.roles?.length ? member.roles : [member.role];

  const handleSavePay = async () => {
    setSavingPay(true);
    try {
      await updateMemberCompensation(businessId, member.uid, {
        payRate: Number(payRate) || 0,
        payPeriod,
        nextPayDate,
      });
      toast.success("Compensation updated");
      setShowPay(false);
    } catch {
      toast.error("Failed to update compensation");
    } finally {
      setSavingPay(false);
    }
  };

  const handleToggleActive = async () => {
    setToggling(true);
    try {
      await deactivateMember(businessId, member.uid, !member.active);
      toast.success(member.active ? "Employee deactivated" : "Employee activated");
    } catch {
      toast.error("Failed to update status");
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        `Remove ${member.displayName} from your team? This cannot be undone.`
      )
    )
      return;
    setDeleting(true);
    try {
      await removeMemberFromBusiness(businessId, member.uid);
      toast.success(`${member.displayName} removed from team`);
    } catch {
      toast.error("Failed to remove employee");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
      {/* Header row */}
      <div className="flex items-start gap-4">
        <div className="shrink-0">
          <UserAvatar profile={member} size="lg" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold text-slate-900 truncate">{member.displayName}</p>
              <p className="text-xs text-slate-500 truncate">{member.email}</p>
              {member.employeeNumber && (
                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] font-bold tracking-wide">
                  <BadgeCheck className="h-3 w-3" />
                  {member.employeeNumber}
                </span>
              )}
            </div>
            <Badge
              variant={member.active ? "success" : "danger"}
              className="shrink-0 text-[11px]"
            >
              {member.active ? "Active" : "Inactive"}
            </Badge>
          </div>

          {/* Role badges */}
          <div className="mt-2 flex flex-wrap gap-1">
            {roles.map((role) => (
              <span
                key={role}
                className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium capitalize"
              >
                {role.replaceAll("_", " ")}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2">
        <div className="col-span-1 rounded-xl bg-blue-50 p-2.5 text-center">
          <p className="text-lg font-bold text-blue-700">{assignedOrders}</p>
          <p className="text-[10px] text-blue-500 font-medium uppercase tracking-wide">Orders</p>
        </div>
        <div className="col-span-1 rounded-xl bg-rose-50 p-2.5 text-center">
          <p className="text-lg font-bold text-rose-600">{lateOrders}</p>
          <p className="text-[10px] text-rose-400 font-medium uppercase tracking-wide">Late</p>
        </div>
        <div className="col-span-2 rounded-xl bg-emerald-50 p-2.5">
          <p className="text-xs font-bold text-emerald-700">
            KES {(member.payRate ?? 0).toLocaleString()}
            <span className="font-normal text-emerald-500 ml-1 capitalize">
              / {member.payPeriod ?? "monthly"}
            </span>
          </p>
          {member.nextPayDate && (
            <p className="text-[10px] text-emerald-500 mt-0.5">
              Next pay: {new Date(member.nextPayDate).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}
            </p>
          )}
        </div>
      </div>

      {/* Inline pay edit */}
      {canManageTeam && isNonOwner && (
        <>
          <button
            type="button"
            onClick={() => setShowPay((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 font-medium transition-colors"
          >
            {showPay ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showPay ? "Hide" : "Edit"} compensation
          </button>

          {showPay && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-600">Update Compensation</p>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  min="0"
                  value={payRate}
                  onChange={(e) => setPayRate(e.target.value)}
                  placeholder="Pay rate (KES)"
                  className="h-9 text-sm"
                />
                <select
                  value={payPeriod}
                  onChange={(e) =>
                    setPayPeriod(e.target.value as "daily" | "weekly" | "monthly")
                  }
                  className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] text-slate-500 mb-1 block">Next Pay Date</label>
                <Input
                  type="date"
                  value={nextPayDate}
                  onChange={(e) => setNextPayDate(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <Button
                size="sm"
                onClick={handleSavePay}
                disabled={savingPay}
                className="w-full gap-2"
              >
                {savingPay ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save compensation
              </Button>
            </div>
          )}
        </>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-1">
        <Link
          href={`/employees/${member.uid}`}
          className="flex-1 text-center rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          View activity
        </Link>

        {isNonOwner && (
          <button
            type="button"
            onClick={handleToggleActive}
            disabled={toggling}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${
              member.active
                ? "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
            }`}
          >
            {toggling ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : member.active ? (
              <UserX className="h-3.5 w-3.5" />
            ) : (
              <UserCheck className="h-3.5 w-3.5" />
            )}
            {member.active ? "Deactivate" : "Activate"}
          </button>
        )}

        {isOwner && isNonOwner && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition-colors disabled:opacity-50"
          >
            {deleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function EmployeesPage() {
  const { businessId, ready } = useBusinessContext();
  const permissions = usePermissions();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [invitations, setInvitations] = useState<EmployeeInvitation[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  const isOwner =
    user?.role === "owner" || user?.roles?.includes("owner") || false;

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
      `${member.displayName} ${member.email} ${member.employeeNumber ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [members, search]);

  const activeCount = members.filter((m) => m.active !== false).length;
  const pendingInvites = invitations.filter((i) => i.status === "pending").length;

  if (!permissions.canManageTeam) {
    return (
      <div className="text-sm text-slate-500">
        You do not have access to employee management.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {activeCount} active · {pendingInvites} pending invite{pendingInvites !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/employees/new"
          className="flex items-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" />
          Invite Employee
        </Link>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border bg-white p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">{members.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">Total members</p>
        </div>
        <div className="rounded-2xl border bg-white p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{activeCount}</p>
          <p className="text-xs text-slate-500 mt-0.5">Active</p>
        </div>
        <div className="rounded-2xl border bg-white p-4 text-center">
          <p className="text-2xl font-bold text-amber-500">{pendingInvites}</p>
          <p className="text-xs text-slate-500 mt-0.5">Pending invites</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or employee ID..."
          className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
      </div>

      {/* Employee grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-400 text-sm">
            No employees match your search
          </div>
        )}
        {filtered.map((member) => (
          <EmployeeCard
            key={member.uid}
            member={member}
            orders={orders}
            businessId={businessId}
            canManageTeam={permissions.canManageTeam}
            isOwner={isOwner}
          />
        ))}
      </div>

      {/* Invitations */}
      {invitations.length > 0 && (
        <div className="rounded-2xl border bg-white p-5">
          <h2 className="text-sm font-bold text-slate-900 mb-3">Recent Invitations</h2>
          <div className="space-y-2">
            {invitations.slice(0, 8).map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {invite.displayName}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{invite.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        invite.status === "pending"
                          ? "bg-amber-100 text-amber-700"
                          : invite.status === "accepted"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {invite.status}
                    </span>
                    {invite.status === "pending" && invite.expiresAt && (
                      <span className="text-[11px] text-slate-400">
                        expires {new Date(invite.expiresAt).toLocaleDateString("en-KE")}
                      </span>
                    )}
                  </div>
                </div>
                {invite.status === "pending" && (
                  <button
                    type="button"
                    onClick={() => deleteInvitation(businessId, invite.id)}
                    aria-label="Cancel invitation"
                    className="h-8 w-8 flex items-center justify-center rounded-xl hover:bg-rose-50 transition-colors shrink-0"
                  >
                    <Trash2 className="h-4 w-4 text-rose-400" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
