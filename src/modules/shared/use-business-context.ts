"use client";

import { useMemo } from "react";
import { useAuth } from "@/features/auth/components/auth-context";

export function useBusinessContext() {
  const { user } = useAuth();

  return useMemo(
    () => ({
      businessId: user?.businessId ?? "",
      user,
      ready: Boolean(user?.businessId),
    }),
    [user]
  );
}
