import { NextResponse } from "next/server";
import { validateAdminRequest, writeAuditLog } from "@/lib/admin/validate";
import { getSmsPacks, saveSmsPacks } from "@/lib/sms/config-store";
import { smsPacksPutSchema } from "@/schemas/sms-billing.schema";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await validateAdminRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const packs = await getSmsPacks(admin.db);
    return NextResponse.json({ packs });
  } catch (err) {
    console.error("[ffmanage/sms/packs] GET", err);
    return NextResponse.json({ error: "Could not load SMS packs" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const admin = await validateAdminRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = await request.json().catch(() => null);
  const parsed = smsPacksPutSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid SMS packs", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const previous = await getSmsPacks(admin.db);

  try {
    const packs = await saveSmsPacks(admin.db, parsed.data.packs, admin.uid);

    await writeAuditLog(admin.db, {
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: "sms_packs_updated",
      resourceType: "sms_packs",
      resourceName: `${packs.length} packs`,
      previousState: { packs: previous },
      newState: { packs },
      ipAddress: admin.ipAddress,
      userAgent: admin.userAgent,
      severity: "warning",
    });

    return NextResponse.json({ ok: true, packs });
  } catch (err) {
    console.error("[ffmanage/sms/packs] PUT", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not save SMS packs" },
      { status: 500 }
    );
  }
}
