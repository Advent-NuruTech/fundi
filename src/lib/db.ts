export { createOrder } from "@/lib/supabase.service";
export type { Business, Order } from "@/types/domain";

export const ROLE_HIERARCHY: Record<string, number> = {
  super_admin: 100,
  business_admin: 80,
  manager: 60,
  tailor: 40,
  ironman: 30,
  cutter: 30,
  fitter: 30,
  receptionist: 30,
  employee: 20,
};

export function canManageEmployees(currentRole: string): boolean {
  const level = ROLE_HIERARCHY[currentRole] || 0;
  return level >= 60;
}

export function canAccessSettings(currentRole: string): boolean {
  // The app's real roles (see UserRole in @/types/domain) — owner and
  // admin_manager are the "business admins" allowed into settings. Checked
  // explicitly because ROLE_HIERARCHY still uses legacy role names.
  if (currentRole === "owner" || currentRole === "admin_manager") return true;
  const level = ROLE_HIERARCHY[currentRole] || 0;
  return level >= 80;
}
