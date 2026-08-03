import { NextResponse } from "next/server";
import { validateAdminRequest, writeAuditLog } from "@/lib/admin/validate";
import {
  getActiveExchangeRate,
  getExchangeRateHistory,
  saveExchangeRate,
} from "@/lib/ai-billing";
import { exchangeRatePutSchema } from "@/schemas/ai-billing.schema";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await validateAdminRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [current, history] = await Promise.all([
      getActiveExchangeRate(admin.db),
      getExchangeRateHistory(admin.db, 100),
    ]);
    return NextResponse.json({ current, history });
  } catch (err) {
    console.error("[ffmanage/ai-billing/exchange-rate] GET", err);
    return NextResponse.json({ error: "Could not load exchange rate" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const admin = await validateAdminRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = await request.json().catch(() => null);
  const parsed = exchangeRatePutSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid exchange rate", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const previous = await getActiveExchangeRate(admin.db);

  try {
    const saved = await saveExchangeRate(
      admin.db,
      parsed.data.rate,
      parsed.data.source,
      admin.uid
    );

    await writeAuditLog(admin.db, {
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: "ai_exchange_rate_updated",
      resourceType: "ai_exchange_rates",
      resourceName: `USD/KES`,
      previousState: previous ? { rate: previous.rate, source: previous.source } : undefined,
      newState: { rate: parsed.data.rate, source: parsed.data.source },
      ipAddress: admin.ipAddress,
      userAgent: admin.userAgent,
      severity: "warning",
    });

    return NextResponse.json({ ok: true, rate: saved });
  } catch (err) {
    console.error("[ffmanage/ai-billing/exchange-rate] PUT", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not save exchange rate" },
      { status: 500 }
    );
  }
}
