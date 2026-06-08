import { NextResponse } from "next/server";
import { validateAdminRequest, writeAuditLog } from "@/lib/admin/validate";
import { z } from "zod";

const bodySchema = z.object({
  confirmName: z.string().min(1),
  ownerPassword: z.string().min(1),
  reason: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await validateAdminRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { db, uid, email, ipAddress, userAgent } = admin;

  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing required confirmation fields" }, { status: 400 });
  }

  const { confirmName, ownerPassword, reason } = parsed.data;

  // Fetch business for confirmation
  const { data: biz } = await db.from("businesses").select("id, name, owner_uid").eq("id", id).single();
  if (!biz) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  // Name must match
  if (confirmName.trim().toLowerCase() !== biz.name.trim().toLowerCase()) {
    return NextResponse.json({ error: "Business name does not match" }, { status: 400 });
  }

  // Re-verify admin password
  const { data: adminUser } = await db.auth.admin.getUserById(uid);
  const adminEmail = adminUser?.user?.email;
  if (!adminEmail) return NextResponse.json({ error: "Admin user not found" }, { status: 500 });

  const { error: pwErr } = await db.auth.signInWithPassword({
    email: adminEmail,
    password: ownerPassword,
  });
  if (pwErr) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 403 });
  }

  // Log before deletion (permanent record)
  await writeAuditLog(db, {
    adminUid: uid,
    adminEmail: email,
    action: "delete_business",
    resourceType: "business",
    resourceId: id,
    resourceName: biz.name,
    metadata: { reason: reason ?? "No reason provided", ownerUid: biz.owner_uid },
    ipAddress,
    userAgent,
    severity: "critical",
  });

  // ── Cascade deletion order (respects FK constraints) ──────────────────────
  // Tables with business_id or workspace_id FK — delete most dependent first.

  const cascadeByBusinessId = [
    "sms_logs",
    "notifications",
    "support_ticket_messages",
    "support_tickets",
    "stock_movements",
    "order_material_usage",
    "order_fitting_records",
    "order_fabric_selections",
    "order_garments",
    "order_images",
    "orders",
    "customer_measurements",
    "customers",
    "purchase_orders",
    "inventory_material_images",
    "inventory_material_custom_fields",
    "inventory_materials",
    "inventory_categories",
    "inventory_units",
    "suppliers",
    "messages",
    "conversations",
    "payments",
    "expenses",
    "withdrawals",
    "transactions",
    "consumption_reports",
    "audit_logs",
    "app_settings",
    "weekly_reports",
    "images",
    "employees",
    "employee_invitations",
    "business_members",
    "receipts",
    "billing_audit_logs",
    "billing_webhook_events",
  ];

  for (const table of cascadeByBusinessId) {
    const col = table === "billing_audit_logs" || table === "receipts" || table === "subscriptions"
      ? "workspace_id"
      : "business_id";
    await db.from(table).delete().eq(col, id).then(() => {});
  }

  // Delete billing tables by workspace_id
  await Promise.allSettled([
    db.from("payment_attempts").delete().eq("workspace_id", id),
    db.from("billing_payments").delete().eq("workspace_id", id),
    db.from("subscriptions").delete().eq("workspace_id", id),
  ]);

  // Delete ecommerce data
  const { data: store } = await db
    .from("ecommerce_stores")
    .select("id")
    .eq("business_id", id)
    .maybeSingle();

  if (store) {
    await db.from("ecommerce_order_items").delete().in(
      "order_id",
      (await db.from("ecommerce_orders").select("id").eq("store_id", store.id)).data?.map((o: { id: string }) => o.id) ?? []
    );
    await db.from("ecommerce_orders").delete().eq("store_id", store.id);
    await db.from("ecommerce_product_images").delete().in(
      "product_id",
      (await db.from("ecommerce_products").select("id").eq("store_id", store.id)).data?.map((p: { id: string }) => p.id) ?? []
    );
    await db.from("ecommerce_products").delete().eq("store_id", store.id);
    await db.from("ecommerce_stores").delete().eq("id", store.id);
  }

  // Delete the profile for the owner (only if they have no other businesses)
  const { count: otherBizCount } = await db
    .from("businesses")
    .select("id", { count: "exact", head: true })
    .eq("owner_uid", biz.owner_uid)
    .neq("id", id);

  // Delete the business itself
  await db.from("businesses").delete().eq("id", id);

  if (!otherBizCount || otherBizCount === 0) {
    await db.from("profiles").delete().eq("id", biz.owner_uid);
    await db.auth.admin.deleteUser(biz.owner_uid);
  }

  return NextResponse.json({ success: true });
}
