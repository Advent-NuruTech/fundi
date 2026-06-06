"use client";

import { useState, useEffect } from "react";
import { Lock, Unlock, UserPlus, X, Shield, Eye, EyeOff, Info } from "lucide-react";
import { useAuth } from "@/features/auth/components/auth-context";
import { updateFinanceAccess } from "@/lib/supabase.service";
import { DEFAULT_FINANCE_ACCESS, type FinanceAccessSettings } from "@/types/domain";
import { listenMembers } from "@/services/firestore.service";
import type { UserProfile } from "@/types/domain";

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  icon?: React.ReactNode;
}

function ToggleRow({ label, description, checked, onChange, icon }: ToggleRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-100 bg-white p-4">
      <div className="flex items-start gap-3">
        {icon && (
          <div className={`mt-0.5 rounded-lg p-1.5 ${checked ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
            {icon}
          </div>
        )}
        <div>
          <p className="font-medium text-slate-800 text-sm">{label}</p>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none ${checked ? "bg-emerald-500" : "bg-slate-200"}`}
        aria-checked={checked}
        role="switch"
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`}
        />
      </button>
    </div>
  );
}

export function FinanceAccessSettings() {
  const { user, business, refreshProfile } = useAuth();
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [settings, setSettings] = useState<FinanceAccessSettings>(
    business?.financeAccess ?? DEFAULT_FINANCE_ACCESS
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep local state in sync with business prop
  useEffect(() => {
    setSettings(business?.financeAccess ?? DEFAULT_FINANCE_ACCESS);
  }, [business?.financeAccess]);

  // Load team members to pick co-owners
  useEffect(() => {
    if (!user?.businessId) return;
    return listenMembers(user.businessId, setMembers);
  }, [user?.businessId]);

  if (!user || user.role !== "owner") {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
        <Lock className="mb-3 h-10 w-10 text-slate-300" />
        <p className="font-semibold text-slate-600">Owner Access Only</p>
        <p className="mt-1 text-sm text-slate-400">
          Only the business owner can manage finance visibility settings.
        </p>
      </div>
    );
  }

  const handleSave = async () => {
    if (!user.businessId) return;
    setSaving(true);
    setError(null);
    try {
      await updateFinanceAccess(user.businessId, settings);
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const toggleCoOwner = (uid: string) => {
    setSettings((prev) => {
      const already = prev.coOwnerUids.includes(uid);
      return {
        ...prev,
        coOwnerUids: already
          ? prev.coOwnerUids.filter((id) => id !== uid)
          : [...prev.coOwnerUids, uid],
      };
    });
  };

  const eligibleCoOwners = members.filter(
    (m) => m.uid !== user.uid && m.role !== "owner"
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
          <Shield className="h-5 w-5 text-emerald-700" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900">Finance Visibility Settings</h3>
          <p className="text-sm text-slate-500">
            Control which financial data your managers and co-owners can see.
            By default, all sensitive financial data is visible to you only.
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
        <p>
          <strong>Owner-private by default:</strong> Weekly/monthly earnings, net profit, inventory
          value, payroll liabilities, and AI business insights are only visible to you and any
          co-owners you add. Managers see only today&apos;s data unless you enable specific permissions
          below.
        </p>
      </div>

      {/* Manager permissions */}
      <div>
        <p className="mb-3 text-sm font-semibold text-slate-700 uppercase tracking-wide">
          Manager / Admin Access Permissions
        </p>
        <div className="space-y-2">
          <ToggleRow
            label="Allow managers to view This Week history"
            description="Managers can see the week earnings, spending and profit breakdown."
            checked={settings.managerCanSeeWeekHistory}
            onChange={(v) => setSettings((p) => ({ ...p, managerCanSeeWeekHistory: v }))}
            icon={<Eye className="h-3.5 w-3.5" />}
          />
          <ToggleRow
            label="Allow managers to view This Month history"
            description="Managers can see the full monthly earnings, expenses and net profit."
            checked={settings.managerCanSeeMonthHistory}
            onChange={(v) => setSettings((p) => ({ ...p, managerCanSeeMonthHistory: v }))}
            icon={<Eye className="h-3.5 w-3.5" />}
          />
          <ToggleRow
            label="Allow managers to view This Year history"
            description="Managers can see the full yearly breakdown and calendar."
            checked={settings.managerCanSeeYearHistory}
            onChange={(v) => setSettings((p) => ({ ...p, managerCanSeeYearHistory: v }))}
            icon={<Eye className="h-3.5 w-3.5" />}
          />
          <ToggleRow
            label="Allow managers to view owner KPIs"
            description="Show Net Profit, Inventory Value and Payroll Due cards to managers."
            checked={settings.managerCanSeeOwnerKpis}
            onChange={(v) => setSettings((p) => ({ ...p, managerCanSeeOwnerKpis: v }))}
            icon={<Unlock className="h-3.5 w-3.5" />}
          />
        </div>
      </div>

      {/* Co-owners */}
      <div>
        <p className="mb-1 text-sm font-semibold text-slate-700 uppercase tracking-wide">
          Co-Owners
        </p>
        <p className="mb-3 text-xs text-slate-500">
          Co-owners have the same full financial visibility as you. They can see all data
          regardless of the manager permissions above.
        </p>
        {eligibleCoOwners.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-400">
            No team members available to add as co-owner.
          </p>
        ) : (
          <div className="space-y-2">
            {eligibleCoOwners.map((m) => {
              const isCoOwner = settings.coOwnerUids.includes(m.uid);
              return (
                <div
                  key={m.uid}
                  className={`flex items-center justify-between gap-4 rounded-xl border p-3 transition-colors ${isCoOwner ? "border-emerald-200 bg-emerald-50" : "border-slate-100 bg-white"}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-600">
                      {m.displayName[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{m.displayName}</p>
                      <p className="text-xs text-slate-500">{m.role?.replace("_", " ")} · {m.email}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleCoOwner(m.uid)}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${isCoOwner ? "bg-emerald-600 text-white hover:bg-emerald-500" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                  >
                    {isCoOwner ? (
                      <>
                        <X className="h-3.5 w-3.5" /> Remove
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-3.5 w-3.5" /> Add as Co-Owner
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Current co-owners from other sources (already owner-role users) */}
        {settings.coOwnerUids.length > 0 && (
          <p className="mt-2 text-xs text-slate-500">
            {settings.coOwnerUids.length} co-owner(s) currently have full financial visibility.
          </p>
        )}
      </div>

      {/* Save */}
      {error && (
        <p className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-60"
        >
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save Finance Settings"}
        </button>
        {saved && (
          <span className="text-sm text-emerald-600 font-medium">
            Settings saved successfully.
          </span>
        )}
      </div>
    </div>
  );
}
