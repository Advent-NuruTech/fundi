"use client";

import { useMemo } from "react";
import { useAuth } from "@/features/auth/components/auth-context";
import { getManagerPermissions, isFinanceOwner } from "@/lib/permissions";
import type { ManagerPermissions } from "@/types/domain";

export interface FinancePermissions extends ManagerPermissions {
  isOwner: boolean;
  isCoOwner: boolean;
  hasOwnerAccess: boolean;
}

export function useFinancePermissions(): FinancePermissions {
  const { user, business } = useAuth();

  return useMemo(() => {
    const fa = business?.financeAccess;
    const ownerAccess = isFinanceOwner(user, fa);
    const managerPerms = getManagerPermissions(user, fa);

    return {
      ...managerPerms,
      isOwner: user?.role === "owner",
      isCoOwner: ownerAccess && user?.role !== "owner",
      hasOwnerAccess: ownerAccess,
    };
  }, [user, business?.financeAccess]);
}
