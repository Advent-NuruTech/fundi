import { NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { validateAdminRequest, writeAuditLog } from "@/lib/admin/validate";
import { setFreeTrialEnabled } from "@/lib/billing/free-trial-flag";

const FREE_TRIAL_KEY = "free_trial_enabled";

const updateSchema = z.object({
  freeTrialEnabled: z.boolean(),
});

async function readFreeTrialEnabled(db: SupabaseClient): Promise<boolean> {
  const { data } = await db
    .from("system_config")
    .select("value")
    .eq("key", FREE_TRIAL_KEY)
    .maybeSingle();
  return typeof data?.value === "boolean" ? data.value : true;
}

export async function GET(request: Request) {
  const admin = await validateAdminRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const freeTrialEnabled = await readFreeTrialEnabled(admin.db);

  return NextResponse.json({
    freeTrialEnabled,
    settings: {
      freeTrialEnabled,
    },
  });
}

export async function PUT(request: Request) {
  const admin = await validateAdminRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const previousState = { freeTrialEnabled: await readFreeTrialEnabled(admin.db) };
  const newState = { freeTrialEnabled: parsed.data.freeTrialEnabled };

  try {
    await setFreeTrialEnabled(admin.db, parsed.data.freeTrialEnabled, admin.uid);

    await writeAuditLog(admin.db, {
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: "platform_settings_updated",
      resourceType: "system_config",
      resourceName: FREE_TRIAL_KEY,
      previousState,
      newState,
      ipAddress: admin.ipAddress,
      userAgent: admin.userAgent,
      severity: "warning",
    });

    return NextResponse.json({ freeTrialEnabled: newState.freeTrialEnabled });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not update settings" },
      { status: 500 }
    );
  }
}
