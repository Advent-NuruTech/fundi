import { NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/admin/validate";
import { getAIAnalytics, raiseMarginAlertIfNeeded, getActiveAIConfig } from "@/lib/ai-billing";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await validateAdminRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const days = Math.min(Math.max(parseInt(url.searchParams.get("days") ?? "30", 10), 1), 365);

  try {
    const analytics = await getAIAnalytics(admin.db, days);

    const { config } = await getActiveAIConfig(admin.db);
    await raiseMarginAlertIfNeeded(admin.db, {
      grossMarginPercent: analytics.summary.grossMarginPercent,
      targetMarginPercent: config.margin.targetGrossMarginPercent,
      adminUid: admin.uid,
    });

    return NextResponse.json(analytics);
  } catch (err) {
    console.error("[ffmanage/ai-billing/analytics] GET", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not load AI billing analytics" },
      { status: 500 }
    );
  }
}
