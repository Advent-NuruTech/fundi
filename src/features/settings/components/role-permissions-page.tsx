"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Lock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  Eye,
  BarChart2,
  Package,
  FileText,
  Wallet,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/features/auth/components/auth-context";
import { listenMembers, saveManagerPermissions, fetchPermissionAuditLogs } from "@/lib/supabase.service";
import { DEFAULT_MANAGER_PERMISSIONS } from "@/types/domain";
import type { UserProfile, ManagerPermissions } from "@/types/domain";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// ─── PERMISSION DEFINITIONS ───

interface PermissionDef {
  key: keyof ManagerPermissions;
  label: string;
  description: string;
  icon: React.ReactNode;
  group: string;
}

const PERMISSION_DEFS: PermissionDef[] = [
  // Earnings History
  { key: "canSeeWeekEarnings", label: "View Weekly Earnings", description: "See weekly revenue, spending, and profit breakdown.", icon: <Eye className="h-4 w-4" />, group: "Earnings History" },
  { key: "canSeeMonthEarnings", label: "View Monthly Earnings", description: "See full monthly earnings, expenses, and net profit.", icon: <Eye className="h-4 w-4" />, group: "Earnings History" },
  { key: "canSeeYearEarnings", label: "View Yearly Earnings", description: "See the full yearly breakdown and calendar.", icon: <Eye className="h-4 w-4" />, group: "Earnings History" },
  // Revenue & Profitability
  { key: "canSeeTotalRevenue", label: "View Total Revenue", description: "See total all-time revenue figure.", icon: <TrendingUp className="h-4 w-4" />, group: "Revenue & Profitability" },
  { key: "canSeeProfitMargins", label: "View Profit Margins", description: "Access net profit, profit margin %, and expense ratios.", icon: <TrendingUp className="h-4 w-4" />, group: "Revenue & Profitability" },
  // Finance Modules
  { key: "canSeeInvestments", label: "View Investments", description: "Access the Investments module and all investment records.", icon: <Wallet className="h-4 w-4" />, group: "Finance Modules" },
  { key: "canSeeSavings", label: "View Savings Goals", description: "Access the Savings module and savings goal progress.", icon: <Wallet className="h-4 w-4" />, group: "Finance Modules" },
  { key: "canSeeFinancialReports", label: "View Financial Reports", description: "Access the Reports module, P&L, and export functions.", icon: <FileText className="h-4 w-4" />, group: "Finance Modules" },
  { key: "canManageFinance", label: "Manage Finance", description: "Create and edit expenses, withdrawals, and finance records.", icon: <Wallet className="h-4 w-4" />, group: "Finance Modules" },
  // Analytics
  { key: "canSeeMonthlyRevenueAnalytics", label: "View Revenue Analytics", description: "Access monthly and yearly revenue charts in Analytics.", icon: <BarChart2 className="h-4 w-4" />, group: "Analytics" },
  // Inventory
  { key: "canSeeInventoryValue", label: "View Inventory Value", description: "See total inventory value and stock valuation.", icon: <Package className="h-4 w-4" />, group: "Inventory" },
];

// ─── TOGGLE SWITCH ───

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      role="switch"
      aria-checked={checked}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none disabled:opacity-40 ${checked ? "bg-emerald-500" : "bg-slate-200"}`}
    >
      <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

// ─── PERMISSION ROW ───

function PermRow({
  def,
  checked,
  onChange,
  disabled,
}: {
  def: PermissionDef;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`flex items-start justify-between gap-4 rounded-xl border px-4 py-3 transition-colors ${checked ? "border-emerald-200 bg-emerald-50" : "border-slate-100 bg-white"}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 rounded-lg p-1.5 ${checked ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
          {def.icon}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-800">{def.label}</p>
          <p className="text-xs text-slate-500 mt-0.5">{def.description}</p>
        </div>
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

// ─── MANAGER CARD ───

function ManagerCard({
  manager,
  permissions,
  onSave,
  saving,
}: {
  manager: UserProfile;
  permissions: ManagerPermissions;
  onSave: (uid: string, perms: ManagerPermissions) => void;
  saving: boolean;
}) {
  const [localPerms, setLocalPerms] = useState<ManagerPermissions>(permissions);
  const [expanded, setExpanded] = useState(false);
  const [showFullAccessWarning, setShowFullAccessWarning] = useState(false);

  useEffect(() => {
    setLocalPerms(permissions);
  }, [permissions]);

  const isDirty = JSON.stringify(localPerms) !== JSON.stringify(permissions);

  const groupedDefs = PERMISSION_DEFS.reduce<Record<string, PermissionDef[]>>((acc, def) => {
    if (!acc[def.group]) acc[def.group] = [];
    acc[def.group].push(def);
    return acc;
  }, {});

  const handleFullAccessToggle = (v: boolean) => {
    if (v) {
      setShowFullAccessWarning(true);
    } else {
      setLocalPerms((p) => ({ ...p, hasFullDashboardAccess: false }));
    }
  };

  const confirmFullAccess = () => {
    setLocalPerms(
      Object.fromEntries(Object.keys(DEFAULT_MANAGER_PERMISSIONS).map((k) => [k, true])) as unknown as ManagerPermissions
    );
    setShowFullAccessWarning(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => setExpanded((e) => !e)}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-700">
              {manager.displayName[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-slate-800">{manager.displayName}</p>
              <p className="text-xs text-slate-500">{manager.email} · Admin Manager</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {localPerms.hasFullDashboardAccess && (
              <Badge variant="warning" className="text-xs">Full Access</Badge>
            )}
            <span className="text-slate-400">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </span>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-6 pt-0">
          {/* Full Dashboard Access — special section with warning */}
          <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-lg bg-amber-100 p-1.5 text-amber-600">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-900">Grant Full Dashboard Access</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Grants Owner-level visibility and control over all business information, analytics, and reports.
                  </p>
                </div>
              </div>
              <Toggle
                checked={localPerms.hasFullDashboardAccess}
                onChange={handleFullAccessToggle}
              />
            </div>

            {showFullAccessWarning && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-3">
                <div className="flex items-start gap-2 text-red-800">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <p className="text-sm font-medium">
                    Full Dashboard Access grants Owner-level visibility and control over all business information.
                    This includes all financial data, analytics, reports, and management features.
                    Are you sure?
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={confirmFullAccess}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
                  >
                    Yes, Grant Full Access
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowFullAccessWarning(false)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Individual permissions — disabled when full access is on */}
          {Object.entries(groupedDefs).map(([group, defs]) => (
            <div key={group}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{group}</p>
              <div className="space-y-2">
                {defs.map((def) => (
                  <PermRow
                    key={def.key}
                    def={def}
                    checked={localPerms[def.key]}
                    onChange={(v) => setLocalPerms((p) => ({ ...p, [def.key]: v }))}
                    disabled={localPerms.hasFullDashboardAccess}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Save */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onSave(manager.uid, localPerms)}
              disabled={saving || !isDirty}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Permissions"}
            </button>
            {isDirty && (
              <span className="text-xs text-amber-600 font-medium">Unsaved changes</span>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ─── AUDIT LOG ───

interface AuditEntry {
  id: string;
  actorName: string;
  targetUid: string;
  createdAt: string;
  newValue: string | null;
}

function AuditLogSection({ businessId }: { businessId: string }) {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchPermissionAuditLogs(businessId)
      .then(setLogs)
      .finally(() => setLoading(false));
  }, [businessId]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => setExpanded((e) => !e)}>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-slate-500" />
            Permission Audit Log
          </CardTitle>
          {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </div>
      </CardHeader>
      {expanded && (
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-400">Loading audit log…</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-slate-400">No permission changes recorded yet.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {logs.map((log) => {
                let summary = "";
                try {
                  const perms = JSON.parse(log.newValue ?? "{}") as Partial<ManagerPermissions>;
                  if (perms.hasFullDashboardAccess) {
                    summary = "Granted Full Dashboard Access";
                  } else {
                    const granted = Object.entries(perms).filter(([, v]) => v).length;
                    summary = `${granted} permission(s) enabled`;
                  }
                } catch {
                  summary = "Permissions updated";
                }
                return (
                  <div key={log.id} className="flex items-start justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium text-slate-800">
                        <span className="text-emerald-600">{log.actorName}</span> updated permissions
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{summary}</p>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0 ml-4">
                      {new Date(log.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ─── MAIN PAGE ───

export function RolePermissionsPage() {
  const { user, business, refreshProfile } = useAuth();
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [savingUid, setSavingUid] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.businessId) return;
    return listenMembers(user.businessId, setMembers);
  }, [user?.businessId]);

  const managers = members.filter((m) => m.role === "admin_manager" || m.roles?.includes("admin_manager"));

  const getPerms = useCallback((uid: string): ManagerPermissions => {
    const stored = business?.financeAccess?.managerPermissions?.[uid];
    if (!stored) return { ...DEFAULT_MANAGER_PERMISSIONS };

    // Full dashboard access override
    if (stored.hasFullDashboardAccess) {
      return Object.fromEntries(
        Object.keys(DEFAULT_MANAGER_PERMISSIONS).map((k) => [k, true])
      ) as unknown as ManagerPermissions;
    }
    return { ...DEFAULT_MANAGER_PERMISSIONS, ...stored };
  }, [business?.financeAccess]);

  const handleSave = async (managerUid: string, perms: ManagerPermissions) => {
    if (!user?.businessId || !user?.uid) return;
    setSavingUid(managerUid);
    try {
      const prev = getPerms(managerUid);
      await saveManagerPermissions(
        user.businessId,
        managerUid,
        perms,
        user.uid,
        user.displayName,
        prev
      );
      await refreshProfile();
      toast.success("Permissions saved successfully.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save permissions.");
    } finally {
      setSavingUid(null);
    }
  };

  // Only owners can access this page
  if (!user || user.role !== "owner") {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
        <Lock className="mb-3 h-10 w-10 text-slate-300" />
        <p className="font-semibold text-slate-600">Owner Access Only</p>
        <p className="mt-1 text-sm text-slate-400">
          Only the business owner can manage role permissions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
          <Shield className="h-5 w-5 text-emerald-700" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Role Permissions</h2>
          <p className="text-sm text-slate-500">
            Configure individual access for each Admin Manager. By default all sensitive data is owner-only.
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
        <div>
          <p className="font-semibold">Permissions only the business owner can access and modify this page.</p>
          <p className="mt-0.5 opacity-80">
      



Only the business owner can access and make changes on this page. 

When a permission is turned off, the feature can only be used by owner

Users can only see the information they have been allowed to access. 

Private financial records and reports are protected and cannot be viewed by unauthorized users. </div>
      </div>

      {/* Manager list */}
      {managers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <User className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-500">No Admin Managers</p>
          <p className="mt-1 text-sm text-slate-400">
            Invite team members with the Admin Manager role to configure their permissions here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {managers.map((manager) => (
            <ManagerCard
              key={manager.uid}
              manager={manager}
              permissions={getPerms(manager.uid)}
              onSave={handleSave}
              saving={savingUid === manager.uid}
            />
          ))}
        </div>
      )}

      {/* Audit Log — owner only */}
      {user.businessId && <AuditLogSection businessId={user.businessId} />}
    </div>
  );
}
