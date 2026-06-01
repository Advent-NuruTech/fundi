"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import type { Order, UserProfile, UserRole } from "@/types/domain";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import { usePermissions } from "@/modules/shared/use-permissions";
import { listenMembers, listenOrders, updateMemberCompensation, updateMemberRoles } from "@/services/firestore.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ROLE_OPTIONS: UserRole[] = ["admin_manager", "tailor", "receptionist", "inventory_manager", "cashier"];

export function EmployeeProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { businessId, ready } = useBusinessContext();
  const permissions = usePermissions();
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([]);
  const [payRate, setPayRate] = useState("");
  const [payPeriod, setPayPeriod] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [nextPayDate, setNextPayDate] = useState("");

  useEffect(() => {
    if (!ready) return;
    const unsubMembers = listenMembers(businessId, setMembers);
    const unsubOrders = listenOrders(businessId, setOrders);
    return () => {
      unsubMembers();
      unsubOrders();
    };
  }, [businessId, ready]);

  const member = useMemo(() => members.find((entry) => entry.uid === params.id), [members, params.id]);

  useEffect(() => {
    if (member) {
      setSelectedRoles(member.roles?.length ? member.roles : [member.role]);
      setPayRate(String(member.payRate ?? ""));
      setPayPeriod(member.payPeriod ?? "monthly");
      setNextPayDate(member.nextPayDate ?? "");
    }
  }, [member]);

  const assignedOrders = useMemo(() => orders.filter((order) => order.assignedTailorId === member?.uid), [orders, member?.uid]);

  if (!member) {
    return <div className="text-sm text-slate-500">Employee not found.</div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="flex h-10 w-10 items-center justify-center rounded-2xl border transition hover:bg-neutral-50">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">{member.displayName}</h1>
          <p className="text-sm text-gray-500">{member.email}</p>
          {member.employeeNumber && <p className="text-xs text-emerald-600 font-medium">{member.employeeNumber}</p>}
        </div>
      </div>

      <div className="rounded-3xl border bg-white p-6">
        <div className="flex flex-wrap gap-2">
          {(member.roles?.length ? member.roles : [member.role]).map((role) => (
            <Badge key={role}>{role.replaceAll("_", " ")}</Badge>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="rounded-xl bg-slate-50 p-3">Active assigned orders: {assignedOrders.filter((o) => o.stage !== "delivered").length}</div>
          <div className="rounded-xl bg-slate-50 p-3">Delivered orders: {assignedOrders.filter((o) => o.stage === "delivered").length}</div>
          <div className="rounded-xl bg-slate-50 p-3">
            Pay: KES {(member.payRate ?? 0).toLocaleString()} / {member.payPeriod ?? "monthly"}
          </div>
          <div className="rounded-xl bg-slate-50 p-3">Next pay date: {member.nextPayDate || "Not set"}</div>
        </div>

        {permissions.canManageRoles && member.role !== "owner" && (
          <div className="mt-6 space-y-3">
            <p className="text-sm font-semibold">Update Roles</p>
            <div className="grid grid-cols-2 gap-2">
              {ROLE_OPTIONS.map((role) => (
                <label key={role} className="flex items-center gap-2 rounded-xl border p-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role)}
                    onChange={() => {
                      setSelectedRoles((prev) =>
                        prev.includes(role) ? prev.filter((entry) => entry !== role) : [...prev, role]
                      );
                    }}
                  />
                  {role.replaceAll("_", " ")}
                </label>
              ))}
            </div>
            <Button
              onClick={async () => {
                if (!selectedRoles.length) {
                  toast.error("Select at least one role");
                  return;
                }
                await updateMemberRoles(businessId, member.uid, selectedRoles);
                toast.success("Roles updated");
              }}
            >
              Save roles
            </Button>
          </div>
        )}

        {permissions.canManageTeam && member.role !== "owner" && (
          <div className="mt-6 space-y-3">
            <p className="text-sm font-semibold">Compensation</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                type="number"
                min="0"
                step="1"
                value={payRate}
                onChange={(e) => setPayRate(e.target.value)}
                placeholder="Salary / pay"
              />
              <select
                value={payPeriod}
                onChange={(e) => setPayPeriod(e.target.value as "daily" | "weekly" | "monthly")}
                className="flex h-10 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
              <Input type="date" value={nextPayDate} onChange={(e) => setNextPayDate(e.target.value)} />
            </div>
            <Button
              variant="outline"
              onClick={async () => {
                await updateMemberCompensation(businessId, member.uid, {
                  payRate: Number(payRate) || 0,
                  payPeriod,
                  nextPayDate,
                });
                toast.success("Compensation updated");
              }}
            >
              Save compensation
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-3xl border bg-white p-6">
        <h3 className="font-bold">Assigned Order Activity</h3>
        <div className="mt-4 space-y-3">
          {assignedOrders.map((order) => (
            <div key={order.id} className="flex items-center justify-between rounded-2xl border p-4 text-sm">
              <div>
                <p className="font-semibold">{order.orderNumber}</p>
                <p className="text-gray-500">{order.customerName} - due {order.dueDate}</p>
              </div>
              <Badge>{order.stage.replaceAll("_", " ")}</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
