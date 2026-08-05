import { NextResponse } from "next/server";
import { z } from "zod";
import { getBillingAdminClient } from "@/lib/billing/admin-client";
import { initializeTransaction, getAppBaseUrl } from "@/lib/billing/paystack-client";
import { kesToKobo } from "@/lib/billing/fees";
import { generateReference } from "@/lib/billing/reference";
import { getTopupPackage } from "@/lib/billing/topup-packages";
import { getActiveSmsPackById } from "@/lib/sms/config-store";
import type { TopupPackage } from "@/lib/billing/topup-packages";
import type { UsageResource } from "@/types/billing";

const bodySchema = z.object({
  resource: z.enum(["sms", "ai_credits", "storage"]),
  packageId: z.string().min(1),
});

/**
 * Resolves a purchasable package. SMS packs are DB-backed — the server reads the
 * price + units straight from the `sms_packs` table so the admin's live edits
 * (price, activation) are enforced exactly, never a hardcoded fallback.
 */
async function resolveTopupPackage(
  admin: ReturnType<typeof getBillingAdminClient>,
  resource: UsageResource,
  packageId: string
): Promise<TopupPackage | undefined> {
  if (resource === "sms") {
    const pack = await getActiveSmsPackById(admin, packageId);
    if (!pack) return undefined;
    return {
      id: pack.id,
      resource: "sms",
      label: pack.label,
      units: pack.units,
      priceKes: pack.priceKes,
    };
  }
  return getTopupPackage(resource, packageId);
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = getBillingAdminClient();

    const { data: { user }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !user?.email) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const raw = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
    }
    const { resource, packageId } = parsed.data;

    const pkg = await resolveTopupPackage(admin, resource as UsageResource, packageId);
    if (!pkg) {
      return NextResponse.json({ error: "Invalid top-up package" }, { status: 400 });
    }

    // Resolve workspace + require owner
    const { data: profile } = await admin
      .from("profiles")
      .select("business_id, role")
      .eq("id", user.id)
      .single();

    if (!profile?.business_id) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }
    if (profile.role !== "owner") {
      return NextResponse.json({ error: "Owner-only action" }, { status: 403 });
    }
    const workspaceId = profile.business_id as string;

    // Top-ups require an active (or trialing) subscription
    const { data: sub } = await admin
      .from("subscriptions")
      .select("status")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (!sub || !["active", "trialing"].includes(sub.status)) {
      return NextResponse.json(
        { error: "An active subscription is required to top up" },
        { status: 409 }
      );
    }

    // Server-side price: NEVER trust the frontend
    const reference = generateReference("topup");
    const amountKobo = kesToKobo(pkg.priceKes);

    // Reserve the exact units before redirecting (anti-double-charge)
    const { error: topupErr } = await admin.from("usage_topups").insert({
      workspace_id: workspaceId,
      user_id: user.id,
      resource,
      units: pkg.units,
      amount_kes: pkg.priceKes,
      status: "pending",
      paystack_reference: reference,
      metadata: { package_id: pkg.id },
    });
    if (topupErr) {
      return NextResponse.json({ error: `Could not reserve top-up: ${topupErr.message}` }, { status: 500 });
    }

    await admin.from("payment_attempts").insert({
      reference,
      user_id: user.id,
      workspace_id: workspaceId,
      amount: pkg.priceKes,
      status: "pending",
    });

    await admin.from("billing_payments").insert({
      user_id: user.id,
      workspace_id: workspaceId,
      paystack_reference: reference,
      amount: pkg.priceKes,
      currency: "KES",
      payment_status: "pending",
      payment_type: "topup",
      includes_sms_sender_id: false,
      metadata: { resource, units: pkg.units, package_id: pkg.id },
    });

    const baseUrl = getAppBaseUrl();
    const paystackRes = await initializeTransaction({
      email: user.email,
      amount: amountKobo,
      reference,
      callback_url: `${baseUrl}/settings/usage?action=topup&ref=${reference}`,
      metadata: {
        payment_type: "topup",
        resource,
        units: pkg.units,
        package_id: pkg.id,
        user_id: user.id,
        workspace_id: workspaceId,
      },
    });

    if (!paystackRes.status) {
      // Roll back the pending records so the customer isn't double-charged
      await admin.from("payment_attempts").delete().eq("reference", reference);
      await admin.from("usage_topups").delete().eq("paystack_reference", reference);
      await admin.from("billing_payments").delete().eq("paystack_reference", reference);
      return NextResponse.json({ error: "Payment gateway error" }, { status: 502 });
    }

    return NextResponse.json({
      authorizationUrl: paystackRes.data.authorization_url,
      reference,
      units: pkg.units,
      amount: pkg.priceKes,
    });
  } catch (err) {
    console.error("[billing/topup]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
