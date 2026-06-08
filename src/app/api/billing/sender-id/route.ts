import { NextResponse } from "next/server";
import { z } from "zod";
import { getBillingAdminClient } from "@/lib/billing/admin-client";
import { initializeTransaction, getAppBaseUrl } from "@/lib/billing/paystack-client";
import { kesToKobo } from "@/lib/billing/fees";
import { generateReference } from "@/lib/billing/reference";
import { SMS_SENDER_ID_PRICE } from "@/lib/billing/constants";

// Sender ID rules: 3–11 alphanumeric chars (no spaces, no special chars)
const bodySchema = z.object({
  senderIdName: z
    .string()
    .min(3, "Sender ID must be at least 3 characters")
    .max(11, "Sender ID must be at most 11 characters")
    .regex(/^[A-Za-z0-9]+$/, "Sender ID must be alphanumeric only (no spaces or special characters)"),
});

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = getBillingAdminClient();

    const { data: { user }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !user?.email) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const raw = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid sender ID" },
        { status: 400 }
      );
    }
    const { senderIdName } = parsed.data;

    // Resolve workspace + require owner
    const { data: profile } = await admin
      .from("profiles")
      .select("business_id, role")
      .eq("id", user.id)
      .single();

    if (!profile?.business_id) return NextResponse.json({ error: "No workspace" }, { status: 400 });
    if (profile.role !== "owner") return NextResponse.json({ error: "Owner-only action" }, { status: 403 });

    const workspaceId = profile.business_id as string;

    // Check subscription is active
    const { data: sub } = await admin
      .from("subscriptions")
      .select("status, sms_sender_id_paid, sms_sender_id_status")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (!sub || sub.status !== "active") {
      return NextResponse.json({ error: "Active subscription required" }, { status: 409 });
    }

    if (sub.sms_sender_id_paid && sub.sms_sender_id_status === "approved") {
      return NextResponse.json({ error: "Custom Sender ID already active" }, { status: 409 });
    }

    const reference = generateReference("sms");
    const amountKobo = kesToKobo(SMS_SENDER_ID_PRICE);

    // Save payment_attempt
    await admin.from("payment_attempts").insert({
      reference,
      user_id: user.id,
      workspace_id: workspaceId,
      amount: SMS_SENDER_ID_PRICE,
      status: "pending",
    });

    // Save pending billing_payment
    await admin.from("billing_payments").insert({
      user_id: user.id,
      workspace_id: workspaceId,
      paystack_reference: reference,
      amount: SMS_SENDER_ID_PRICE,
      currency: "KES",
      payment_status: "pending",
      payment_type: "sms_sender_id",
      includes_sms_sender_id: true,
      sms_sender_id_amount: SMS_SENDER_ID_PRICE,
      metadata: { sender_id_name: senderIdName },
    });

    // Store requested sender ID name pre-payment so webhook can read it
    await admin
      .from("subscriptions")
      .update({
        sms_sender_id_name: senderIdName,
        sms_sender_id_status: "pending_payment",
        updated_at: new Date().toISOString(),
      })
      .eq("workspace_id", workspaceId);

    const baseUrl = getAppBaseUrl();
    const paystackRes = await initializeTransaction({
      email: user.email,
      amount: amountKobo,
      reference,
      callback_url: `${baseUrl}/settings/billing?action=sender_id&ref=${reference}`,
      metadata: {
        plan_slug: sub.status,
        user_id: user.id,
        workspace_id: workspaceId,
        payment_type: "sms_sender_id",
        includes_sms_sender_id: true,
        installation_fee_amount: 0,
        sms_sender_id_amount: SMS_SENDER_ID_PRICE,
        monthly_price: 0,
        sender_id_name: senderIdName,
      },
    });

    if (!paystackRes.status) {
      await admin.from("payment_attempts").delete().eq("reference", reference);
      await admin.from("billing_payments").delete().eq("paystack_reference", reference);
      await admin
        .from("subscriptions")
        .update({ sms_sender_id_status: "none", sms_sender_id_name: null, updated_at: new Date().toISOString() })
        .eq("workspace_id", workspaceId);
      return NextResponse.json({ error: "Payment gateway error" }, { status: 502 });
    }

    return NextResponse.json({
      authorizationUrl: paystackRes.data.authorization_url,
      reference,
      amount: SMS_SENDER_ID_PRICE,
    });
  } catch (err) {
    console.error("[billing/sender-id]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
