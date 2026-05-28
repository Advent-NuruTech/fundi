"use client";

import { useMemo } from "react";
import { hasCapability } from "@/lib/permissions";
import { useAuth } from "@/features/auth/components/auth-context";

export function usePermissions() {
  const { user } = useAuth();

  return useMemo(
    () => ({
      canManageWorkshop: hasCapability(user, "workshop.manage"),
      canManageTeam: hasCapability(user, "team.manage"),
      canManageRoles: hasCapability(user, "roles.manage"),
      canReadCustomers: hasCapability(user, "customers.read"),
      canWriteCustomers: hasCapability(user, "customers.write"),
      canReadOrders: hasCapability(user, "orders.read"),
      canWriteOrders: hasCapability(user, "orders.write"),
      assignedOnlyOrders: hasCapability(user, "orders.assigned_only"),
      canReadInventory: hasCapability(user, "inventory.read"),
      canWriteInventory: hasCapability(user, "inventory.write"),
      canReadPayments: hasCapability(user, "payments.read"),
      canWritePayments: hasCapability(user, "payments.write"),
      canReadAnalytics: hasCapability(user, "analytics.read"),
      canReadFinance: hasCapability(user, "finance.read"),
      canWriteFinance: hasCapability(user, "finance.write"),
    }),
    [user]
  );
}
