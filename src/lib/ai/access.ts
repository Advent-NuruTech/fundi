// SERVER-ONLY. The AI route uses a service-role database client, so it must
// reproduce the application's RBAC checks before loading any tenant data.
import type { AIContextScope } from "./types";

export interface AICallerAccess {
  userId: string;
  roles: string[];
  isFinanceOwner: boolean;
}

const hasAnyRole = (roles: string[], allowed: string[]) =>
  roles.some((role) => allowed.includes(role));

/**
 * Returns the data domains this caller may put into an AI prompt. This is a
 * deny-by-default boundary; a persona can only further reduce this set.
 */
export function allowedAIContextScopes(caller: AICallerAccess): AIContextScope[] {
  const { roles } = caller;
  const allowed = new Set<AIContextScope>(["business"]);
  // Branch names and locations are visible to active business members in the
  // normal product too; transactional records remain separately permissioned.
  allowed.add("branches");

  if (hasAnyRole(roles, ["owner", "admin_manager", "receptionist", "cashier"])) {
    allowed.add("customers");
  }
  if (hasAnyRole(roles, ["owner", "admin_manager", "receptionist", "cashier", "inventory_manager"])) {
    allowed.add("orders");
  }
  if (hasAnyRole(roles, ["owner", "admin_manager", "tailor", "inventory_manager"])) {
    allowed.add("production");
  }
  if (hasAnyRole(roles, ["owner", "admin_manager", "inventory_manager"])) {
    allowed.add("inventory");
  }
  if (hasAnyRole(roles, ["owner", "admin_manager", "receptionist", "cashier"])) {
    allowed.add("payments");
  }
  // Owner-level finance insights (profit, debt, expense patterns) must not be
  // exposed merely because a manager can record a finance transaction.
  if (caller.isFinanceOwner) allowed.add("finance");
  if (hasAnyRole(roles, ["owner", "admin_manager"])) allowed.add("team");
  if (hasAnyRole(roles, ["owner", "admin_manager"])) allowed.add("messages");
  if (caller.isFinanceOwner) allowed.add("billing");

  return [...allowed];
}

export function intersectAIContextScopes(
  personaScopes: AIContextScope[],
  allowedScopes: AIContextScope[]
): AIContextScope[] {
  const allowed = new Set(allowedScopes);
  return personaScopes.filter((scope) => allowed.has(scope));
}
