import { NextResponse } from "next/server";
import { validateAdminRequest, writeAuditLog } from "@/lib/admin/validate";
import { getCreditPacks, saveCreditPacks } from "@/lib/ai-billing";
import { creditPacksPutSchema } from "@/schemas/ai-billing.schema";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await validateAdminRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const packs = await getCreditPacks(admin.db);
    return NextResponse.json({ packs });
  } catch (err) {
    console.error("[ffmanage/ai-billing/credit-packs] GET", err);
    return NextResponse.json({ error: "Could not load credit packs" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const admin = await validateAdminRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = await request.json().catch(() => null);
  const parsed = creditPacksPutSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid credit packs", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const previous = await getCreditPacks(admin.db);

  try {
    const packs = await saveCreditPacks(admin.db, parsed.data.packs, admin.uid);

    await writeAuditLog(admin.db, {
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: "ai_credit_packs_updated",
      resourceType: "ai_credit_packs",
      resourceName: `${packs.length} packs`,
      previousState: { packs: previous },
      newState: { packs },
      ipAddress: admin.ipAddress,
      userAgent: admin.userAgent,
      severity: "warning",
    });

    return NextResponse.json({ ok: true, packs });
  } catch (err) {
    console.error("[ffmanage/ai-billing/credit-packs] PUT", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not save credit packs" },
      { status: 500 }
    );
  }
}
