import { NextResponse } from "next/server";
import {
  getEffectivePlanConfigs,
  getSmsSenderIdPrice,
  getBranchLimits,
} from "@/lib/billing/dynamic-config";

export const dynamic = "force-dynamic";

/**
 * Public pricing endpoint. Serves the merged plan configs (defaults + any
 * platform-admin overrides), the Custom SMS Sender ID fee, and the effective
 * branch limits — so marketing, checkout and dashboard UI all reflect live
 * platform pricing without a redeploy.
 */
export async function GET() {
  try {
    const [plans, smsSenderIdPrice, branchLimits] = await Promise.all([
      getEffectivePlanConfigs(),
      getSmsSenderIdPrice(),
      getBranchLimits(),
    ]);

    return NextResponse.json({ plans, smsSenderIdPrice, branchLimits });
  } catch (err) {
    console.error("[billing/plan-configs]", err);
    return NextResponse.json(
      { error: "Could not load pricing configuration" },
      { status: 500 }
    );
  }
}
