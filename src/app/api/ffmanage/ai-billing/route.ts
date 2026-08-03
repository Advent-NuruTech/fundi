import { NextResponse } from "next/server";
import { validateAdminRequest, writeAuditLog } from "@/lib/admin/validate";
import {
  getActiveAIConfig,
  saveAIConfig,
  getConfigVersionHistory,
  getActiveExchangeRate,
  getCreditPacks,
} from "@/lib/ai-billing";
import { aiBillingConfigSchema } from "@/schemas/ai-billing.schema";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await validateAdminRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [active, history, exchangeRate, creditPacks] = await Promise.all([
      getActiveAIConfig(admin.db),
      getConfigVersionHistory(admin.db),
      getActiveExchangeRate(admin.db),
      getCreditPacks(admin.db),
    ]);

    return NextResponse.json({
      version: active.version,
      config: active.config,
      history,
      exchangeRate,
      creditPacks,
    });
  } catch (err) {
    console.error("[ffmanage/ai-billing] GET", err);
    return NextResponse.json(
      { error: "Could not load AI billing configuration" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const admin = await validateAdminRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = await request.json().catch(() => null);
  const parsed = aiBillingConfigSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid configuration", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const current = await getActiveAIConfig(admin.db);
  const { note, ...config } = parsed.data;

  try {
    const saved = await saveAIConfig(admin.db, {
      config,
      updatedBy: admin.uid,
      note: note ?? null,
    });

    await writeAuditLog(admin.db, {
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: "ai_billing_config_updated",
      resourceType: "ai_billing_config",
      resourceName: `v${saved.version}`,
      previousState: { version: current.version, config: current.config },
      newState: { version: saved.version, config },
      ipAddress: admin.ipAddress,
      userAgent: admin.userAgent,
      severity: "warning",
    });

    return NextResponse.json({ ok: true, version: saved.version, config: saved.config });
  } catch (err) {
    console.error("[ffmanage/ai-billing] PUT", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not save AI billing configuration" },
      { status: 500 }
    );
  }
}
