import { NextResponse } from "next/server";
import { z } from "zod";
import { getBillingAdminClient } from "@/lib/billing/admin-client";
import { verifyTransaction } from "@/lib/billing/paystack-client";
import { creditTopup } from "@/lib/billing/usage-metering";

const bodySchema = z.object({
  reference: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = getBillingAdminClient();

    const { data: { user }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const raw = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { reference } = parsed.data;

    if (!reference.startsWith("ff_")) {
      return NextResponse.json({ error: "Invalid reference" }, { status: 400 });
    }

    // Idempotent: already credited → return the recorded top-up
    const { data: existing } = await admin
      .from("usage_topups")
      .select("*")
      .eq("paystack_reference", reference)
      .maybeSingle();

    if (existing?.status === "success") {
      return NextResponse.json({ verified: true, topup: existing });
    }
    if (existing?.status === "failed") {
      return NextResponse.json({ verified: false, topup: existing });
    }

    // Re-verify server-side (never trust the redirect alone)
    const paystackRes = await verifyTransaction(reference);
    if (!paystackRes.status || paystackRes.data.status !== "success") {
      return NextResponse.json({
        verified: false,
        status: paystackRes.data.status,
        message: paystackRes.message,
      });
    }

    const tx = paystackRes.data;
    const topup = await creditTopup(admin, {
      paystackReference: reference,
      paystackTransactionId: String(tx.id),
      paidAt: tx.paid_at,
      verifiedAmountKobo: tx.amount,
      paystackFeeKobo: tx.fees ?? 0,
    });

    return NextResponse.json({ verified: true, topup });
  } catch (err) {
    console.error("[billing/topup/verify]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Verification failed" },
      { status: 500 }
    );
  }
}
