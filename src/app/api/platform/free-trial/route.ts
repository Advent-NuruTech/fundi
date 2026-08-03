import { NextResponse } from "next/server";
import { getFreeTrialEnabled } from "@/lib/billing/free-trial-flag";

export const dynamic = "force-dynamic";

/**
 * Public flag endpoint used by client components (pricing, homepage, signup,
 * dashboard banners) to show/hide the free trial. Always resolves to a boolean
 * so callers never have to guess.
 */
export async function GET() {
  const enabled = await getFreeTrialEnabled();
  return NextResponse.json({ enabled });
}
