"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/components/auth-context";
import { supabase } from "@/lib/supabase";
import type { PlanConfig } from "@/types/billing";

export function useBusinessPlan(): { plan: PlanConfig | null; loading: boolean } {
  const { activeBusinessId, user } = useAuth();
  const workspaceId = activeBusinessId ?? user?.businessId ?? null;
  const [plan, setPlan] = useState<PlanConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!workspaceId) {
      setPlan(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    supabase.auth.getSession().then(async ({ data }) => {
      const token = data.session?.access_token;
      if (!token) return { plan: null };
      const response = await fetch("/api/billing/business-plan", {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Business-ID": workspaceId,
        },
      });
      if (!response.ok) return { plan: null };
      return (await response.json()) as { plan: PlanConfig | null };
    }).then((result) => {
      if (active) {
        setPlan(result.plan);
        setLoading(false);
      }
    }).catch(() => {
      if (active) {
        setPlan(null);
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [workspaceId]);

  return { plan, loading };
}

