import { NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/admin/validate";

export async function GET(request: Request) {
  const admin = await validateAdminRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { db } = admin;
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") ?? "1", 10);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "25", 10), 100);
  const status = url.searchParams.get("status") ?? "";
  const search = url.searchParams.get("search") ?? "";
  const offset = (page - 1) * limit;

  let query = db
    .from("billing_payments")
    .select(
      `
      id, workspace_id, paystack_reference, paystack_transaction_id,
      amount, currency, payment_status, payment_type,
      includes_sms_sender_id, paystack_fee, metadata,
      failure_reason, paid_at, created_at,
      businesses!billing_payments_workspace_id_fkey (name, email, phone)
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (status) query = query.eq("payment_status", status);
  if (search) query = query.ilike("paystack_reference", `%${search}%`);

  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Revenue summary
  const [totalSuccessRes, pendingCountRes, failedCountRes] = await Promise.allSettled([
    db.from("billing_payments").select("amount").eq("payment_status", "success"),
    db.from("billing_payments").select("id", { count: "exact", head: true }).eq("payment_status", "pending"),
    db.from("billing_payments").select("id", { count: "exact", head: true }).eq("payment_status", "failed"),
  ]);

  const totalRevenue =
    totalSuccessRes.status === "fulfilled" && totalSuccessRes.value.data
      ? totalSuccessRes.value.data.reduce((s: number, r: { amount: number }) => s + (r.amount ?? 0), 0)
      : 0;

  const pendingCount =
    pendingCountRes.status === "fulfilled" ? (pendingCountRes.value.count ?? 0) : 0;
  const failedCount =
    failedCountRes.status === "fulfilled" ? (failedCountRes.value.count ?? 0) : 0;

  const payments = (data ?? []).map((p: Record<string, unknown>) => {
    const biz = Array.isArray(p.businesses) ? p.businesses[0] : p.businesses;
    return {
      ...p,
      businessName: (biz as Record<string, unknown> | null)?.name ?? null,
      businessEmail: (biz as Record<string, unknown> | null)?.email ?? null,
    };
  });

  return NextResponse.json({
    payments,
    total: count ?? 0,
    page,
    limit,
    summary: { totalRevenue, pendingCount, failedCount },
  });
}
