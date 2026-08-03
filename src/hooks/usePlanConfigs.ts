"use client";

import { useEffect, useState } from "react";
import {
  PLAN_CONFIGS,
  SMS_SENDER_ID_PRICE as DEFAULT_SMS_SENDER_ID_PRICE,
} from "@/lib/billing/constants";
import type { PlanConfig } from "@/types/billing";

/**
 * Client-side access to the live plan configuration (defaults merged with any
 * platform-admin overrides served by `/api/billing/plan-configs`).
 *
 * While loading, the baked-in defaults are returned so the UI never blocks on
 * the network. The result is cached for the page session so every component
 * shares a single request.
 */

export type PlanConfigsData = {
  plans: Record<Exclude<PlanConfig["slug"], "custom">, PlanConfig>;
  smsSenderIdPrice: number;
  branchLimits: Record<Exclude<PlanConfig["slug"], "custom">, number>;
};

type PlanSlug = keyof typeof PLAN_CONFIGS;

function defaultData(): PlanConfigsData {
  return {
    plans: PLAN_CONFIGS as PlanConfigsData["plans"],
    smsSenderIdPrice: DEFAULT_SMS_SENDER_ID_PRICE,
    branchLimits: Object.fromEntries(
      (Object.keys(PLAN_CONFIGS) as PlanSlug[]).map((slug) => [
        slug,
        PLAN_CONFIGS[slug].limits.maxBranches ?? 1,
      ])
    ) as PlanConfigsData["branchLimits"],
  };
}

let cachedPromise: Promise<PlanConfigsData> | null = null;

function loadPlanConfigs(): Promise<PlanConfigsData> {
  if (!cachedPromise) {
    cachedPromise = fetch("/api/billing/plan-configs", { cache: "no-store" })
      .then(async (r) => ((await r.json()) ?? {}) as Partial<PlanConfigsData>)
      .then((d) => {
        if (d?.plans && typeof d.smsSenderIdPrice === "number" && d?.branchLimits) {
          return d as PlanConfigsData;
        }
        return defaultData();
      })
      .catch(() => defaultData());
  }
  return cachedPromise;
}

export function getPlanConfigs(): Promise<PlanConfigsData> {
  return loadPlanConfigs();
}

export function usePlanConfigs(): { data: PlanConfigsData; loading: boolean } {
  const [data, setData] = useState<PlanConfigsData>(() => defaultData());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    loadPlanConfigs().then((value) => {
      if (active) {
        setData(value);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return { data, loading };
}
