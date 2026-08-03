import { NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { validateAdminRequest, writeAuditLog } from "@/lib/admin/validate";
import {
  PLAN_CONFIGS,
  SMS_SENDER_ID_PRICE as DEFAULT_SMS_SENDER_ID_PRICE,
} from "@/lib/billing/constants";
import {
  getEffectivePlanConfigs,
  getPlanConfigOverrideRows,
  getSmsSenderIdPrice,
  SMS_SENDER_ID_PRICE_KEY,
  type PlanPricingOverride,
  type StandardPlanSlug,
} from "@/lib/billing/dynamic-config";

export const dynamic = "force-dynamic";

// ── Validation ────────────────────────────────────────────────────────────────

const limitSchema = z.object({
  maxUsers: z.number().int().min(0),
  maxCustomers: z.number().int().min(0),
  maxOrdersPerMonth: z.number().int().min(0),
  maxInventoryItems: z.number().int().min(0),
  smsPerMonth: z.number().int().min(0),
  maxBranches: z.number().int().min(1),
  aiCreditsPerMonth: z.number().int().min(0),
  storageGb: z.number().min(0),
  globalSellListings: z.number().int().min(0),
});

const priceSchema = z.object({
  monthlyPrice: z.number().min(0),
  introPrice: z.number().min(0),
  annualPrice: z.number().min(0),
  limits: limitSchema,
});

/** A full plan override. Passing null for a plan resets it to the baked-in default. */
const planUpdateSchema = z.object({
  config: priceSchema.nullable(),
});

const putSchema = z.object({
  plans: z.record(
    z.enum(["sindano", "fundi", "dhahabu"]),
    planUpdateSchema
  ),
  /** The one-time Custom SMS Sender ID fee (KES). null resets to the default. */
  smsSenderIdPrice: z.number().min(0).nullable().optional(),
});

// ── Read helpers ──────────────────────────────────────────────────────────────

async function readCurrentSmsPrice(db: SupabaseClient): Promise<number> {
  return getSmsSenderIdPrice(db);
}

function toOverrideRow(
  row: { plan_slug: StandardPlanSlug; config: Partial<PlanPricingOverride> }
): Partial<PlanPricingOverride> {
  return row.config ?? {};
}

// ── GET: defaults + live overrides + effective values ─────────────────────────

export async function GET(request: Request) {
  const admin = await validateAdminRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [effective, overrideRows, smsSenderIdPrice] = await Promise.all([
      getEffectivePlanConfigs(admin.db),
      getPlanConfigOverrideRows(admin.db),
      getSmsSenderIdPrice(admin.db),
    ]);

    const overrides: Record<StandardPlanSlug, Partial<PlanPricingOverride> | null> =
      {} as Record<StandardPlanSlug, Partial<PlanPricingOverride> | null>;
    for (const slug of Object.keys(PLAN_CONFIGS) as StandardPlanSlug[]) {
      overrides[slug] = null;
    }
    for (const row of overrideRows) {
      overrides[row.plan_slug] = toOverrideRow(row);
    }

    return NextResponse.json({
      defaults: {
        plans: PLAN_CONFIGS,
        smsSenderIdPrice: DEFAULT_SMS_SENDER_ID_PRICE,
      },
      overrides,
      effective: {
        plans: effective,
        smsSenderIdPrice,
      },
    });
  } catch (err) {
    console.error("[ffmanage/pricing] GET", err);
    return NextResponse.json(
      { error: "Could not load pricing configuration" },
      { status: 500 }
    );
  }
}

// ── PUT: upsert / reset overrides ─────────────────────────────────────────────

export async function PUT(request: Request) {
  const admin = await validateAdminRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = await request.json().catch(() => null);
  const parsed = putSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const db = admin.db;
  const previousState: { plans: Record<string, unknown>; smsSenderIdPrice: number } = {
    plans: {},
    smsSenderIdPrice: await readCurrentSmsPrice(db),
  };
  const newState: { plans: Record<string, unknown>; smsSenderIdPrice: unknown } = {
    plans: {},
    smsSenderIdPrice:
      parsed.data.smsSenderIdPrice === undefined
        ? previousState.smsSenderIdPrice
        : parsed.data.smsSenderIdPrice,
  };

  try {
    const plans = parsed.data.plans ?? {};
    for (const [slug, value] of Object.entries(plans) as [
      StandardPlanSlug,
      { config: PlanPricingOverride | null },
    ][]) {
      previousState.plans[slug] = (
        await getPlanConfigOverrideRows(db)
      ).find((r) => r.plan_slug === slug)?.config ?? null;

      if (value.config === null) {
        await db.from("billing_plan_configs").delete().eq("plan_slug", slug);
        newState.plans[slug] = null;
      } else {
        await db
          .from("billing_plan_configs")
          .upsert(
            {
              plan_slug: slug,
              config: value.config,
              updated_at: new Date().toISOString(),
              updated_by: admin.uid,
            },
            { onConflict: "plan_slug" }
          );
        newState.plans[slug] = value.config;
      }
    }

    if (parsed.data.smsSenderIdPrice !== undefined) {
      if (parsed.data.smsSenderIdPrice === null) {
        await db.from("system_config").delete().eq("key", SMS_SENDER_ID_PRICE_KEY);
      } else {
        await db
          .from("system_config")
          .upsert(
            {
              key: SMS_SENDER_ID_PRICE_KEY,
              value: parsed.data.smsSenderIdPrice,
              updated_at: new Date().toISOString(),
              updated_by: admin.uid,
            },
            { onConflict: "key" }
          );
      }
    }

    await writeAuditLog(db, {
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: "platform_pricing_updated",
      resourceType: "billing_plan_configs",
      resourceName: Object.keys(plans).join(",") || "pricing",
      previousState,
      newState,
      ipAddress: admin.ipAddress,
      userAgent: admin.userAgent,
      severity: "warning",
    });

    const [effectivePlans, effectiveSmsPrice] = await Promise.all([
      getEffectivePlanConfigs(db),
      getSmsSenderIdPrice(db),
    ]);

    return NextResponse.json({
      ok: true,
      effective: { plans: effectivePlans, smsSenderIdPrice: effectiveSmsPrice },
    });
  } catch (err) {
    console.error("[ffmanage/pricing] PUT", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not save pricing configuration" },
      { status: 500 }
    );
  }
}
