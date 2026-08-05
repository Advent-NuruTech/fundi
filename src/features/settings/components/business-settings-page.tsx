"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Users,
  Copy,
  Check,
  Shield,
  ChevronRight,
  Workflow,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/components/auth-context";
import { canAccessSettings } from "@/lib/db";
import { listenMembers, updateBusinessProfile } from "@/services/firestore.service";
import type { UserProfile } from "@/types/domain";
import { FinanceAccessSettings } from "./finance-access-settings";
import { BusinessTypeSwitcher } from "./business-type-switcher";
import { ReceiptSettings } from "./receipt-settings";

export function BusinessSettingsPage() {
  const { user, business, refreshProfile } = useAuth();
  const [copied, setCopied] = useState(false);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const canAccess = canAccessSettings(user?.role || "");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const inviteLink = `https://fundiflow.app/join/${user?.businessId || "BIZ-001"}`;

  useEffect(() => {
    if (!user?.businessId) return;
    return listenMembers(user.businessId, setMembers);
  }, [user?.businessId]);

  useEffect(() => {
    if (!business) return;
    setName(business.name ?? "");
    setPhone(business.phone ?? "");
    setEmail(business.email ?? "");
    setAddress(business.location ?? "");
  }, [business]);

  const handleSaveProfile = async () => {
    if (!business) return;
    if (!name.trim()) {
      toast.error("Business name is required");
      return;
    }
    setSavingProfile(true);
    try {
      await updateBusinessProfile(business.id, {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        location: address.trim(),
      });
      await refreshProfile();
      toast.success("Business profile saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <Shield className="mb-4 h-16 w-16 text-gray-300" />
        <p className="text-xl font-bold">Access Restricted</p>
        <p className="mt-2 text-sm">
          Only business admins and managers can access settings.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-500">
          Manage your business profile and team
        </p>
      </div>

      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6" />
          <h2 className="font-bold">Business Profile</h2>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Business Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 w-full rounded-2xl border px-4 text-sm outline-none focus:border-black"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Business ID</label>
            <input
              value={user?.businessId || "BIZ-001"}
              disabled
              className="h-12 w-full rounded-2xl border bg-neutral-50 px-4 text-sm text-gray-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-12 w-full rounded-2xl border px-4 text-sm outline-none focus:border-black"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 w-full rounded-2xl border px-4 text-sm outline-none focus:border-black"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Address</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="h-12 w-full rounded-2xl border px-4 text-sm outline-none focus:border-black"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="rounded-2xl bg-black px-8 py-3 font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60"
          >
            {savingProfile ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Receipts & Tax (VAT toggle, branding, preview) */}
      <ReceiptSettings />

      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6" />
          <h2 className="font-bold">Invite Employees</h2>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Share this link with employees to let them log in with their preset
          roles. They just need to register with their email and set a password.
        </p>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 rounded-2xl border bg-neutral-50 px-4 py-3 text-sm text-gray-600">
            {inviteLink}
          </div>
          <button
            onClick={copyLink}
            className="flex h-12 w-12 items-center justify-center rounded-2xl border transition hover:bg-neutral-50"
          >
            {copied ? (
              <Check className="h-5 w-5 text-green-600" />
            ) : (
              <Copy className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Business Type — owner can re-tune the whole workspace to their industry */}
      {user?.role === "owner" && <BusinessTypeSwitcher />}

      {/* Finance Access Settings */}
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-6 w-6 text-emerald-600" />
          <div>
            <h2 className="font-bold">Finance Access Settings</h2>
            <p className="text-sm text-gray-500">Global finance visibility defaults for your team</p>
          </div>
        </div>
        <FinanceAccessSettings />
      </div>

      {/* Role Permissions — owner-only quick-access card */}
      {user?.role === "owner" && (
        <Link
          href="/settings/role-permissions"
          className="block rounded-3xl border bg-white p-6 transition hover:border-emerald-300 hover:bg-emerald-50 group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 group-hover:bg-emerald-200 transition">
                <Shield className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">Role Permissions</h2>
                <p className="text-sm text-slate-500">
                  Configure individual permissions for each Admin Manager — weekly earnings, revenue analytics, inventory value, reports, and more.
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-emerald-600 transition shrink-0 ml-4" />
          </div>
        </Link>
      )}

      {/* Production Workflow — order pipeline configuration */}
      <Link
        href="/settings/workflow"
        className="block rounded-3xl border bg-white p-6 transition hover:border-emerald-300 hover:bg-emerald-50 group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 group-hover:bg-emerald-200 transition">
              <Workflow className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Production Workflow</h2>
              <p className="text-sm text-slate-500">
                Customize your production stages, their order, and customer SMS notifications.
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-emerald-600 transition shrink-0 ml-4" />
        </div>
      </Link>

      {/* Delivery Management — delivery policy, SMS milestones, courier partners */}
      <Link
        href="/settings/delivery"
        className="block rounded-3xl border bg-white p-6 transition hover:border-emerald-300 hover:bg-emerald-50 group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 group-hover:bg-emerald-200 transition">
              <Truck className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Delivery Management</h2>
              <p className="text-sm text-slate-500">
                Delivery fees, customer SMS updates per milestone, and courier partners.
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-emerald-600 transition shrink-0 ml-4" />
        </div>
      </Link>

      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6" />
          <h2 className="font-bold">Team Overview</h2>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          {members.length} employees registered
        </p>

        <div className="mt-4 space-y-2">
          {members.map((emp) => (
            <div
              key={emp.uid}
              className="flex items-center justify-between rounded-2xl bg-neutral-50 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-bold">
                  {emp.displayName.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-sm">{emp.displayName}</p>
                  <p className="text-xs text-gray-500">
                    {emp.email} - {(emp.roles?.length ? emp.roles : [emp.role]).join(", ")}
                  </p>
                </div>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs ${
                  emp.active
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {emp.active ? "Active" : "Inactive"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
