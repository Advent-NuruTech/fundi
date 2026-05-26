"use client";

import { useState } from "react";
import {
  Settings,
  Building2,
  Users,
  Link2,
  Copy,
  Check,
  Shield,
} from "lucide-react";
import { useAuth } from "@/features/auth/components/auth-context";
import { employees } from "@/features/employees/data/employees.mock";
import { canAccessSettings } from "@/lib/db";

export function BusinessSettingsPage() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const canAccess = canAccessSettings(user?.role || "");

  const inviteLink = `https://fundiflow.app/join/${user?.businessId || "BIZ-001"}`;

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
              defaultValue={user?.business?.name || "My Tailoring Business"}
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
              defaultValue={user?.business?.phone || "0712345678"}
              className="h-12 w-full rounded-2xl border px-4 text-sm outline-none focus:border-black"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <input
              defaultValue={user?.business?.email || ""}
              className="h-12 w-full rounded-2xl border px-4 text-sm outline-none focus:border-black"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Address</label>
            <input
              defaultValue={user?.business?.address || ""}
              className="h-12 w-full rounded-2xl border px-4 text-sm outline-none focus:border-black"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button className="rounded-2xl bg-black px-8 py-3 font-semibold text-white transition hover:bg-neutral-800">
            Save Changes
          </button>
        </div>
      </div>

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

      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6" />
          <h2 className="font-bold">Team Overview</h2>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          {employees.length} employees registered
        </p>

        <div className="mt-4 space-y-2">
          {employees.map((emp) => (
            <div
              key={emp.id}
              className="flex items-center justify-between rounded-2xl bg-neutral-50 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-bold">
                  {emp.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-sm">{emp.name}</p>
                  <p className="text-xs text-gray-500">
                    {emp.employeeNumber} · {emp.role}
                  </p>
                </div>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs ${
                  emp.isActive
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {emp.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
