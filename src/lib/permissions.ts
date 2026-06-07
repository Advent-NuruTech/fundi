import type { UserProfile, UserRole, FinanceAccessSettings, ManagerPermissions } from "@/types/domain";
import { DEFAULT_MANAGER_PERMISSIONS } from "@/types/domain";

export type AppCapability =
  | "workshop.manage"
  | "team.manage"
  | "roles.manage"
  | "customers.read"
  | "customers.write"
  | "orders.read"
  | "orders.write"
  | "orders.assigned_only"
  | "production.read"
  | "production.write"
  | "inventory.read"
  | "inventory.write"
  | "payments.read"
  | "payments.write"
  | "analytics.read"
  | "finance.read"
  | "finance.write"
  // Owner-exclusive: full earnings history, net profit, inventory value, payroll, AI insights
  | "finance.owner_insights"
  // Owner can manage co-owners and toggle manager finance access
  | "finance.access_control";

const roleCapabilities: Record<UserRole, AppCapability[]> = {
  owner: [
    "workshop.manage",
    "team.manage",
    "roles.manage",
    "customers.read",
    "customers.write",
    "orders.read",
    "orders.write",
    "production.read",
    "production.write",
    "inventory.read",
    "inventory.write",
    "payments.read",
    "payments.write",
    "analytics.read",
    "finance.read",
    "finance.write",
    "finance.owner_insights",
    "finance.access_control",
  ],
  admin_manager: [
    "team.manage",
    "customers.read",
    "customers.write",
    "orders.read",
    "orders.write",
    "production.read",
    "production.write",
    "inventory.read",
    "inventory.write",
    "payments.read",
    "payments.write",
    "analytics.read",
    "finance.read",
    "finance.write",
    // finance.owner_insights and finance.access_control intentionally excluded —
    // granted dynamically via Business.financeAccess settings
  ],
  tailor: ["orders.read", "orders.assigned_only", "production.read", "production.write"],
  receptionist: ["customers.read", "customers.write", "orders.read", "orders.write", "payments.read", "payments.write"],
  inventory_manager: ["inventory.read", "inventory.write", "orders.read", "production.read"],
  cashier: ["payments.read", "payments.write", "orders.read", "customers.read"],
};

export function getUserRoles(profile: UserProfile | null | undefined): UserRole[] {
  if (!profile) {
    return [];
  }
  if (profile.roles?.length) {
    return profile.roles;
  }
  return [profile.role];
}

export function hasCapability(profile: UserProfile | null | undefined, capability: AppCapability): boolean {
  const roles = getUserRoles(profile);
  return roles.some((role) => roleCapabilities[role]?.includes(capability));
}

/** Returns true when the user has owner-level finance visibility (owner role or listed as co-owner) */
export function isFinanceOwner(
  profile: UserProfile | null | undefined,
  financeAccess: FinanceAccessSettings | undefined
): boolean {
  if (!profile) return false;
  if (profile.role === "owner") return true;
  return financeAccess?.coOwnerUids?.includes(profile.uid) ?? false;
}

/**
 * Resolves the effective ManagerPermissions for an admin_manager.
 * Per-manager settings override legacy global toggles.
 * If hasFullDashboardAccess is true, all permissions are granted.
 */
export function getManagerPermissions(
  profile: UserProfile | null | undefined,
  financeAccess: FinanceAccessSettings | undefined
): ManagerPermissions {
  if (!profile) return { ...DEFAULT_MANAGER_PERMISSIONS };

  // Owner / co-owner: synthesize full access
  if (isFinanceOwner(profile, financeAccess)) {
    return Object.fromEntries(
      Object.keys(DEFAULT_MANAGER_PERMISSIONS).map((k) => [k, true])
    ) as unknown as ManagerPermissions;
  }

  if (profile.role !== "admin_manager") return { ...DEFAULT_MANAGER_PERMISSIONS };

  const perManager = financeAccess?.managerPermissions?.[profile.uid];

  // Full dashboard access grants everything
  if (perManager?.hasFullDashboardAccess) {
    return Object.fromEntries(
      Object.keys(DEFAULT_MANAGER_PERMISSIONS).map((k) => [k, true])
    ) as unknown as ManagerPermissions;
  }

  // Legacy global toggles as fallback base
  const legacyBase: Partial<ManagerPermissions> = {
    canSeeWeekEarnings: financeAccess?.managerCanSeeWeekHistory ?? false,
    canSeeMonthEarnings: financeAccess?.managerCanSeeMonthHistory ?? false,
    canSeeYearEarnings: financeAccess?.managerCanSeeYearHistory ?? false,
    canSeeProfitMargins: financeAccess?.managerCanSeeOwnerKpis ?? false,
    canSeeTotalRevenue: financeAccess?.managerCanSeeOwnerKpis ?? false,
    canSeeInventoryValue: financeAccess?.managerCanSeeOwnerKpis ?? false,
  };

  return {
    ...DEFAULT_MANAGER_PERMISSIONS,
    ...legacyBase,
    ...(perManager ?? {}),
  };
}

/** Check a single named permission for the current user */
export function hasManagerPermission(
  profile: UserProfile | null | undefined,
  financeAccess: FinanceAccessSettings | undefined,
  permission: keyof ManagerPermissions
): boolean {
  if (!profile) return false;
  if (isFinanceOwner(profile, financeAccess)) return true;
  return getManagerPermissions(profile, financeAccess)[permission] === true;
}

export function canAccessRoute(profile: UserProfile | null | undefined, pathname: string): boolean {
  if (!profile) {
    return false;
  }

  if (pathname.startsWith("/inventory")) {
    return hasCapability(profile, "inventory.read");
  }
  if (pathname.startsWith("/payments") || pathname.startsWith("/pos")) {
    return hasCapability(profile, "payments.read");
  }
  if (pathname.startsWith("/analytics")) {
    return hasCapability(profile, "analytics.read");
  }
  if (pathname.startsWith("/finance")) {
    return hasCapability(profile, "finance.read");
  }
  if (pathname.startsWith("/customers")) {
    return hasCapability(profile, "customers.read");
  }
  if (pathname.startsWith("/orders")) {
    return hasCapability(profile, "orders.read");
  }
  if (pathname.startsWith("/production")) {
    return hasCapability(profile, "production.read");
  }
  if (pathname.startsWith("/employees")) {
    return hasCapability(profile, "team.manage");
  }

  return true;
}
