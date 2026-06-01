"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, Check, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { UserRole } from "@/types/domain";
import { inviteEmployeeToWorkshop } from "@/services/auth.service";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import { useAuth } from "@/features/auth/components/auth-context";
import { usePermissions } from "@/modules/shared/use-permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

const ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: "admin_manager", label: "Admin Manager", description: "Full access to manage team, orders, and settings" },
  { value: "tailor", label: "Tailor", description: "View assigned orders and update production stages" },
  { value: "receptionist", label: "Receptionist", description: "Manage customers, orders, and payments" },
  { value: "inventory_manager", label: "Inventory Manager", description: "Manage materials, stock, and suppliers" },
  { value: "cashier", label: "Cashier", description: "Process payments and view orders" },
];

export function EmployeeForm() {
  const router = useRouter();
  const { businessId, user } = useBusinessContext();
  const { business } = useAuth();
  const permissions = usePermissions();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>(["tailor"]);
  const [payRate, setPayRate] = useState("");
  const [payPeriod, setPayPeriod] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [nextPayDate, setNextPayDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [copied, setCopied] = useState(false);

  if (!permissions.canManageTeam) {
    return (
      <div className="mx-auto max-w-2xl py-20 text-center">
        <p className="text-sm text-slate-500">You do not have permission to invite team members.</p>
      </div>
    );
  }

  const toggleRole = (role: UserRole) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((entry) => entry !== role) : [...prev, role]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !businessId) return;
    if (!selectedRoles.length) {
      toast.error("Select at least one role.");
      return;
    }

    setSaving(true);
    try {
      const result = await inviteEmployeeToWorkshop({
        businessId,
        inviterUid: user.uid,
        inviterName: user.displayName,
        email,
        displayName: name,
        roles: selectedRoles,
        payRate: Number(payRate) || 0,
        payPeriod,
        nextPayDate,
      });
      setInviteLink(result.invitationLink);
      setTempPassword(result.temporaryPassword);
      toast.success("Invitation created successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create invitation.");
    } finally {
      setSaving(false);
    }
  };

  const copyDetails = () => {
    const details = [
      `Congratulations! You have been invited to join ${business?.name || user?.displayName + "'s Workshop"}!`,
      ``,
      `Business: ${business?.name || user?.displayName + "'s Workshop"}`,
      `Role: ${selectedRoles.map((r) => r.replace("_", " ")).join(", ")}`,
      `Email: ${email}`,
      `Temporary Password: ${tempPassword}`,
      ``,
      `Login link: ${inviteLink}`,
      ``,
      `Please log in and set your own password to continue.`,
    ].join("\n");

    navigator.clipboard.writeText(details);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Invitation details copied");
  };

  if (inviteLink) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setInviteLink("");
              setTempPassword("");
            }}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border transition hover:bg-neutral-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Invitation Created</h1>
            <p className="text-sm text-gray-500">Share these details with the new team member</p>
          </div>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="font-semibold text-emerald-800">Invitation Ready</p>
              <p className="mt-1 text-sm text-emerald-700">
                The employee has been created. Share the details below to let them log in.
              </p>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Email</p>
                <p className="font-medium text-slate-900">{email}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Temporary Password</p>
                <p className="font-mono font-medium text-slate-900">{tempPassword}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Role</p>
                <p className="font-medium text-slate-900 capitalize">
                  {selectedRoles.map((r) => r.replace("_", " ")).join(", ")}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Invitation Link</p>
                <p className="mt-1 break-all text-sm text-emerald-700">{inviteLink}</p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button className="gap-2 flex-1" onClick={copyDetails}>
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Copied!" : "Copy invitation details"}
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => router.push("/employees")}>
                View employees
              </Button>
            </div>

            <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
              <p className="font-medium">Next steps for the employee:</p>
              <ol className="mt-2 list-inside list-decimal space-y-1 text-amber-700">
                <li>Open the invitation link above</li>
                <li>Sign in with their email and the temporary password</li>
                <li>They will be prompted to set a new password</li>
                <li>After setting the password, they&apos;ll be taken to the dashboard</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border transition hover:bg-neutral-50"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Invite Employee</h1>
          <p className="text-sm text-gray-500">Create workshop access with role permissions</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Employee Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. John Tailor"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Email address</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="john@workshop.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <p className="text-xs text-slate-500">Select one or more roles for this employee</p>
              <div className="mt-2 space-y-2">
                {ROLES.map((role) => (
                  <label
                    key={role.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                      selectedRoles.includes(role.value)
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(role.value)}
                      onChange={() => toggleRole(role.value)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{role.label}</p>
                      <p className="text-xs text-slate-500">{role.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Salary / Pay (KES)</label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={payRate}
                  onChange={(e) => setPayRate(e.target.value)}
                  placeholder="25000"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Pay Period</label>
                <select
                  value={payPeriod}
                  onChange={(e) => setPayPeriod(e.target.value as "daily" | "weekly" | "monthly")}
                  className="flex h-10 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Next Pay Date</label>
                <Input
                  type="date"
                  value={nextPayDate}
                  onChange={(e) => setNextPayDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={saving || !name || !email} className="gap-2">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating invitation...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Create invitation
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
