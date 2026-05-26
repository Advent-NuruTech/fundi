"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import type { UserRole } from "@/types/domain";
import { inviteEmployeeToWorkshop } from "@/services/auth.service";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import { usePermissions } from "@/modules/shared/use-permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ROLES: { value: UserRole; label: string }[] = [
  { value: "admin_manager", label: "Admin Manager" },
  { value: "tailor", label: "Tailor" },
  { value: "receptionist", label: "Receptionist" },
  { value: "inventory_manager", label: "Inventory Manager" },
  { value: "cashier", label: "Cashier" },
];

export function EmployeeForm() {
  const router = useRouter();
  const { businessId, user } = useBusinessContext();
  const permissions = usePermissions();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roles, setRoles] = useState<UserRole[]>(["tailor"]);
  const [saving, setSaving] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [tempPassword, setTempPassword] = useState("");

  if (!permissions.canManageTeam) {
    return <div className="text-sm text-slate-500">You do not have permission to invite team members.</div>;
  }

  const toggleRole = (role: UserRole) => {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((entry) => entry !== role) : [...prev, role]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !businessId) {
      return;
    }
    if (!roles.length) {
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
        roles,
      });
      setInviteLink(result.invitationLink);
      setTempPassword(result.temporaryPassword);
      toast.success("Invitation created. Share link and temporary password with employee.");
      setName("");
      setEmail("");
      setRoles(["tailor"]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create invitation.");
    } finally {
      setSaving(false);
    }
  };

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
          <p className="text-sm text-gray-500">Create workshop access with role permissions.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border bg-white p-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Employee Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. John Tailor" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="john@workshop.com" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Roles</label>
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map((role) => (
              <label key={role.value} className="flex items-center gap-2 rounded-xl border p-2 text-sm">
                <input type="checkbox" checked={roles.includes(role.value)} onChange={() => toggleRole(role.value)} />
                {role.label}
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={saving}>{saving ? "Creating invite..." : "Create invitation"}</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>

      {inviteLink && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
          <p className="font-semibold text-emerald-800">Invitation Ready</p>
          <p className="mt-2 break-all text-emerald-700">Link: {inviteLink}</p>
          <p className="mt-1 text-emerald-700">Temporary password: {tempPassword}</p>
          <button
            className="mt-3 rounded-lg bg-emerald-700 px-3 py-1.5 text-white"
            onClick={() => navigator.clipboard.writeText(`Invite Link: ${inviteLink}\nTemporary Password: ${tempPassword}`)}
          >
            Copy invite details
          </button>
        </div>
      )}
    </div>
  );
}
