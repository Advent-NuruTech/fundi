import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { validateAdminRequest, writeAuditLog } from "@/lib/admin/validate";
import { smsStockAdditionSchema } from "@/schemas/sms-billing.schema";

export const dynamic = "force-dynamic";

type BusinessUsageRow = { business_id: string; sent: number | string };
type DailyUsageRow = { usage_date: string; sent: number | string };
type LedgerRow = {
  id: string;
  business_id: string | null;
  units: number | string;
  entry_type: "stock_addition" | "usage" | "refund" | "adjustment";
  reference: string;
  balance_after: number | string;
  note: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

function nairobiDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function lastThirtyDates() {
  const today = new Date(`${nairobiDate()}T00:00:00.000Z`);
  return Array.from({ length: 30 }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - (29 - index));
    return date.toISOString().slice(0, 10);
  });
}

export async function GET(request: Request) {
  const admin = await validateAdminRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const parsedPage = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
  const parsedLimit = Number.parseInt(url.searchParams.get("limit") ?? "50", 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 50;
  const offset = (page - 1) * limit;
  const dates = lastThirtyDates();
  const monthStart = `${nairobiDate().slice(0, 7)}-01`;

  const [inventoryRes, businessRes, dailyRes, monthlyRes, ledgerRes] = await Promise.all([
    admin.db
      .from("platform_sms_inventory")
      .select("available_units, total_added, total_used, updated_at")
      .eq("id", "primary")
      .maybeSingle(),
    admin.db
      .from("platform_sms_business_usage")
      .select("business_id, sent")
      .order("sent", { ascending: false }),
    admin.db
      .from("platform_sms_daily_usage")
      .select("usage_date, sent")
      .gte("usage_date", dates[0])
      .order("usage_date", { ascending: true }),
    admin.db
      .from("platform_sms_daily_usage")
      .select("sent")
      .gte("usage_date", monthStart),
    admin.db
      .from("platform_sms_ledger")
      .select(
        "id, business_id, units, entry_type, reference, balance_after, note, metadata, created_at",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1),
  ]);

  const firstError = [inventoryRes, businessRes, dailyRes, monthlyRes, ledgerRes].find(
    (result) => result.error
  )?.error;
  if (firstError) {
    console.error("[ffmanage/sms] GET", firstError);
    return NextResponse.json(
      { error: "Could not load SMS accountability data. Apply the latest database migration." },
      { status: 500 }
    );
  }

  const businessRows = (businessRes.data ?? []) as BusinessUsageRow[];
  const ledgerRows = (ledgerRes.data ?? []) as LedgerRow[];
  const businessIds = Array.from(
    new Set(
      [
        ...businessRows.map((row) => row.business_id),
        ...ledgerRows.map((row) => row.business_id).filter((id): id is string => Boolean(id)),
      ]
    )
  );
  const businessNames = new Map<string, string>();
  if (businessIds.length > 0) {
    const { data } = await admin.db.from("businesses").select("id, name").in("id", businessIds);
    for (const business of data ?? []) businessNames.set(business.id, business.name);
  }

  const dailyMap = new Map(
    ((dailyRes.data ?? []) as DailyUsageRow[]).map((row) => [row.usage_date, Number(row.sent)])
  );
  const trend = dates.map((date) => ({ date, sent: dailyMap.get(date) ?? 0 }));
  const inventory = inventoryRes.data;

  return NextResponse.json({
    inventory: {
      available: Number(inventory?.available_units ?? 0),
      totalAdded: Number(inventory?.total_added ?? 0),
      totalUsed: Number(inventory?.total_used ?? 0),
      updatedAt: inventory?.updated_at ?? null,
    },
    thisMonth: ((monthlyRes.data ?? []) as { sent: number | string }[]).reduce(
      (sum, row) => sum + Number(row.sent),
      0
    ),
    topBusinesses: businessRows.map((row) => ({
      businessId: row.business_id,
      businessName:
        businessNames.get(row.business_id) ?? `Deleted business · ${row.business_id.slice(0, 8)}`,
      sent: Number(row.sent),
    })),
    trend,
    logs: ledgerRows.map((row) => ({
      id: row.id,
      businessId: row.business_id,
      businessName: row.business_id
        ? businessNames.get(row.business_id) ?? `Deleted business · ${row.business_id.slice(0, 8)}`
        : "Platform stock",
      units: Number(row.units),
      entryType: row.entry_type,
      reference: row.reference,
      balanceAfter: Number(row.balance_after),
      note: row.note,
      recipient:
        typeof row.metadata?.recipient === "string" ? row.metadata.recipient : null,
      createdAt: row.created_at,
    })),
    page,
    limit,
    totalLogs: ledgerRes.count ?? 0,
  });
}

export async function POST(request: Request) {
  const admin = await validateAdminRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = await request.json().catch(() => null);
  const parsed = smsStockAdditionSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a positive whole number of SMS units and an optional short note." },
      { status: 400 }
    );
  }

  const { data: previous } = await admin.db
    .from("platform_sms_inventory")
    .select("available_units, total_added, total_used")
    .eq("id", "primary")
    .maybeSingle();
  const reference = `stock_${Date.now()}_${randomUUID()}`;
  const rpc = await admin.db.rpc("credit_platform_sms", {
    p_units: parsed.data.units,
    p_reference: reference,
    p_note: parsed.data.note || null,
    p_admin_uid: admin.uid,
    p_metadata: { admin_email: admin.email },
  });

  const result = rpc.data as { ok?: boolean; error?: string; available_after?: number } | null;
  if (rpc.error || !result?.ok) {
    console.error("[ffmanage/sms] POST", rpc.error ?? result);
    return NextResponse.json(
      { error: rpc.error?.message ?? result?.error ?? "Could not add SMS stock" },
      { status: 500 }
    );
  }

  await writeAuditLog(admin.db, {
    adminUid: admin.uid,
    adminEmail: admin.email,
    action: "platform_sms_stock_added",
    resourceType: "platform_sms_inventory",
    resourceName: `${parsed.data.units.toLocaleString()} SMS units`,
    previousState: previous
      ? {
          available: Number(previous.available_units),
          totalAdded: Number(previous.total_added),
          totalUsed: Number(previous.total_used),
        }
      : undefined,
    newState: {
      added: parsed.data.units,
      available: Number(result.available_after ?? 0),
      note: parsed.data.note || null,
    },
    metadata: { reference },
    ipAddress: admin.ipAddress,
    userAgent: admin.userAgent,
    severity: "warning",
  });

  return NextResponse.json({
    ok: true,
    added: parsed.data.units,
    available: Number(result.available_after ?? 0),
    reference,
  });
}
