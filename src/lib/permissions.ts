import type { UserProfile, UserRole } from "@/types/domain";

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
  | "analytics.read";

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
