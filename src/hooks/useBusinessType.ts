"use client";

import { useMemo } from "react";
import { useAuth } from "@/features/auth/components/auth-context";
import { getBusinessTypeConfig, type BusinessTypeConfig } from "@/lib/business-types";

/**
 * Resolves the active business's industry preset (terminology, navigation
 * visibility, dashboard copy). Always returns a valid config — falls back to
 * the default (tailoring) when the business isn't loaded yet or has no type,
 * so callers never need to null-check.
 */
export function useBusinessType(): BusinessTypeConfig {
  const { business } = useAuth();
  return useMemo(() => getBusinessTypeConfig(business?.businessType), [business?.businessType]);
}
