import { NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/admin/validate";
import { getBillingRecords } from "@/lib/ai-billing";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await validateAdminRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") ?? "1", 10);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "25", 10), 200);
  const provider = url.searchParams.get("provider") ?? "";
  const feature = url.searchParams.get("feature") ?? "";
  const businessId = url.searchParams.get("businessId") ?? "";

  try {
    const { records, total } = await getBillingRecords(admin.db, {
      limit,
      offset: (page - 1) * limit,
      provider: provider || undefined,
      feature: feature || undefined,
      businessId: businessId || undefined,
    });
    return NextResponse.json({ records, total, page, limit });
  } catch (err) {
    console.error("[ffmanage/ai-billing/records] GET", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not load billing records" },
      { status: 500 }
    );
  }
}
