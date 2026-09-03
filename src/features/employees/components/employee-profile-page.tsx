"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  Loader2,
  Save,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import type { Order, UserProfile, UserRole } from "@/types/domain";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import { usePermissions } from "@/modules/shared/use-permissions";
import { useFinancePermissions } from "@/modules/shared/use-finance-permissions";
import {
  listenOrders,
  updateMemberCompensation,
  updateMemberRoles,
} from "@/services/firestore.service";
import { fetchTeamDirectory } from "@/services/auth.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/profile/user-avatar";

const ROLE_OPTIONS: UserRole[] = [
  "admin_manager",
  "tailor",
  "receptionist",
  "inventory_manager",
  "cashier",
];

export function EmployeeProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { businessId, ready } = useBusinessContext();
  const permissions = usePermissions();
  const finPerms = useFinancePermissions();
  const canSeePay = finPerms.hasOwnerAccess || finPerms.hasFullDashboardAccess;
  const [member, setMember] = useState<UserProfile | null>(null);
  const [loadingMember, setLoadingMember] = useState(true);
  const [memberError, setMemberError] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([]);
  const [savingRoles, setSavingRoles] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [payRate, setPayRate] = useState("");
  const [payPeriod, setPayPeriod] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [nextPayDate, setNextPayDate] = useState("");
  const [savingPay, setSavingPay] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    setLoadingMember(true);
    setMemberError("");
    void fetchTeamDirectory(businessId)
      .then((directory) => {
        if (!cancelled) {
          setMember(directory.members.find((entry) => entry.uid === params.id) ?? null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMember(null);
          setMemberError(error instanceof Error ? error.message : "Could not load this employee.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingMember(false);
      });
    const unsubOrders = listenOrders(businessId, setOrders);
    return () => {
      cancelled = true;
      unsubOrders();
    };
  }, [businessId, params.id, ready]);

  useEffect(() => {
    if (member) {
      setSelectedRoles(member.roles?.length ? member.roles : [member.role]);
      setPayRate(String(member.payRate ?? ""));
      setPayPeriod(member.payPeriod ?? "monthly");
      setNextPayDate(member.nextPayDate ?? "");
    }
  }, [member]);

  const assignedOrders = useMemo(
    () => orders.filter((o) => o.assignedTailorId === member?.uid),
    [orders, member?.uid]
  );

  const handleSaveRoles = async () => {
    if (!member) return;
    if (!selectedRoles.length) {
      toast.error("Select at least one role");
      return;
    }
    setSavingRoles(true);
    try {
      await updateMemberRoles(businessId, member.uid, selectedRoles);
      // Optimistic update so UI reflects immediately without waiting for realtime
      setMember((current) =>
        current?.uid === member.uid
          ? { ...current, roles: selectedRoles, role: selectedRoles[0] }
          : current
      );
      toast.success("Roles updated");
    } catch {
      toast.error("Failed to update roles");
    } finally {
      setSavingRoles(false);
    }
  };

  const handleSavePay = async () => {
    if (!member) return;
    setSavingPay(true);
    try {
      await updateMemberCompensation(businessId, member.uid, {
        payRate: Number(payRate) || 0,
        payPeriod,
        nextPayDate,
      });
      setMember((current) =>
        current?.uid === member.uid
          ? {
              ...current,
              payRate: Number(payRate) || 0,
              payPeriod,
              nextPayDate,
            }
          : current
      );
      toast.success("Compensation updated");
      setShowPay(false);
    } catch {
      toast.error("Failed to update compensation");
    } finally {
      setSavingPay(false);
    }
  };

  if (!ready || loadingMember) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="font-semibold text-slate-900">
          {memberError ? "Could not load employee activity" : "Employee is no longer in this business"}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {memberError || "Their team membership may have been deleted. Return to Team to see the current directory."}
        </p>
        <Button variant="outline" className="mt-4" onClick={() => router.replace("/employees")}>
          Back to Team
        </Button>
      </div>
    );
  }

  const roles: UserRole[] = member.roles?.length ? member.roles : [member.role];
  const activeOrders = assignedOrders.filter((o) => o.stage !== "delivered").length;
  const deliveredOrders = assignedOrders.filter((o) => o.stage === "delivered").length;
  const lateOrders = assignedOrders.filter(
    (o) =>
      o.stage !== "delivered" &&
      o.dueDate < new Date().toISOString().slice(0, 10)
  ).length;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-slate-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Employee Profile</h1>
          <p className="text-xs text-slate-500">View and manage team member details</p>
        </div>
      </div>

      {/* Profile card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 space-y-4">
        {/* Identity */}
        <div className="flex items-start gap-4">
          <UserAvatar profile={member} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-slate-900 truncate text-lg">
                  {member.displayName}
                </p>
                <p className="text-xs text-slate-500 truncate">{member.email}</p>
                {member.employeeNumber && (
                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] font-bold tracking-wide">
                    <BadgeCheck className="h-3 w-3" />
                    {member.employeeNumber}
                  </span>
                )}
              </div>
              <Badge
                variant={member.active !== false ? "success" : "danger"}
                className="shrink-0 text-[11px]"
              >
                {member.active !== false ? "Active" : "Inactive"}
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

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          <div className="col-span-1 rounded-xl bg-blue-50 p-2.5 text-center">
            <p className="text-lg font-bold text-blue-700">{activeOrders}</p>
            <p className="text-[10px] text-blue-500 font-medium uppercase tracking-wide">Active</p>
          </div>
          <div className="col-span-1 rounded-xl bg-emerald-50 p-2.5 text-center">
            <p className="text-lg font-bold text-emerald-700">{deliveredOrders}</p>
            <p className="text-[10px] text-emerald-500 font-medium uppercase tracking-wide">Done</p>
          </div>
          <div className="col-span-1 rounded-xl bg-rose-50 p-2.5 text-center">
            <p className="text-lg font-bold text-rose-600">{lateOrders}</p>
            <p className="text-[10px] text-rose-400 font-medium uppercase tracking-wide">Late</p>
          </div>
          <div className="col-span-1 rounded-xl bg-slate-50 p-2.5 text-center">
            <p className="text-lg font-bold text-slate-700">{assignedOrders.length}</p>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Total</p>
          </div>
        </div>

        {/* Pay summary — visible to owner / full-access only */}
        {canSeePay && (
          <div className="rounded-xl bg-emerald-50 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-700">
                KES {(member.payRate ?? 0).toLocaleString()}
                <span className="font-normal text-emerald-500 ml-1 capitalize">
                  / {member.payPeriod ?? "monthly"}
                </span>
              </p>
              {member.nextPayDate && (
                <p className="text-[11px] text-emerald-500 mt-0.5">
                  Next pay:{" "}
                  {new Date(member.nextPayDate).toLocaleDateString("en-KE", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              )}
              {!member.nextPayDate && (
                <p className="text-[11px] text-emerald-400 mt-0.5">Next pay date not set</p>
              )}
            </div>
            {permissions.canManageTeam && member.role !== "owner" && (
              <button
                type="button"
                onClick={() => setShowPay((v) => !v)}
                className="flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 font-medium transition-colors"
              >
                {showPay ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {showPay ? "Hide" : "Edit"}
              </button>
            )}
          </div>
        )}

        {/* Inline pay edit */}
        {showPay && canSeePay && permissions.canManageTeam && member.role !== "owner" && (
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
              <label className="text-[11px] text-slate-500 mb-1 block">
                Next Pay Date
              </label>
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

        {/* Role management */}
        {permissions.canManageRoles && member.role !== "owner" && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-slate-500" />
              <p className="text-xs font-semibold text-slate-700">Update Roles</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ROLE_OPTIONS.map((role) => (
                <label
                  key={role}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs cursor-pointer transition-colors ${
                    selectedRoles.includes(role)
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800 font-medium"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-emerald-600"
                    checked={selectedRoles.includes(role)}
                    onChange={() => {
                      setSelectedRoles((prev) =>
                        prev.includes(role)
                          ? prev.filter((r) => r !== role)
                          : [...prev, role]
                      );
                    }}
                  />
                  <span className="capitalize">{role.replaceAll("_", " ")}</span>
                </label>
              ))}
            </div>
            <Button
              size="sm"
              onClick={handleSaveRoles}
              disabled={savingRoles}
              className="w-full gap-2"
            >
              {savingRoles ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Shield className="h-3.5 w-3.5" />
              )}
              Save roles
            </Button>
          </div>
        )}
      </div>

      {/* Order activity */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5">
        <h3 className="font-bold text-slate-900 mb-4">Order Activity</h3>
        {assignedOrders.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">
            No orders assigned to this employee yet.
          </p>
        ) : (
          <div className="space-y-2">
            {assignedOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{order.orderNumber}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {order.customerName} · due {order.dueDate}
                  </p>
                </div>
                <span
                  className={`shrink-0 ml-3 px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                    order.stage === "delivered"
                      ? "bg-emerald-100 text-emerald-700"
                      : order.dueDate < new Date().toISOString().slice(0, 10)
                      ? "bg-rose-100 text-rose-600"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {order.stage.replaceAll("_", " ")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
