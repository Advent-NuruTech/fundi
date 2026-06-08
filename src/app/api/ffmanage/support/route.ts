import { NextResponse } from "next/server";
import { validateAdminRequest, writeAuditLog } from "@/lib/admin/validate";
import { z } from "zod";

const createSchema = z.object({
  subject: z.string().min(1).max(200),
  content: z.string().min(1),
  businessId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  userEmail: z.string().email().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  category: z.string().default("general"),
});

export async function GET(request: Request) {
  const admin = await validateAdminRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { db } = admin;
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") ?? "1", 10);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "25", 10), 100);
  const status = url.searchParams.get("status") ?? "";
  const priority = url.searchParams.get("priority") ?? "";
  const offset = (page - 1) * limit;

  let query = db
    .from("support_tickets")
    .select(
      `
      *,
      support_ticket_messages (id, created_at)
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (priority) query = query.eq("priority", priority);
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const tickets = (data ?? []).map((t: Record<string, unknown>) => {
    const msgs = Array.isArray(t.support_ticket_messages) ? t.support_ticket_messages as { created_at: string }[] : [];
    return {
      ...t,
      messageCount: msgs.length,
      lastMessageAt: msgs.length > 0 ? msgs[msgs.length - 1].created_at : null,
    };
  });

  return NextResponse.json({ tickets, total: count ?? 0, page, limit });
}

export async function POST(request: Request) {
  const admin = await validateAdminRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { db, uid, email } = admin;
  const raw = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid ticket data" }, { status: 400 });
  }

  const { subject, content, businessId, userId, userEmail, priority, category } = parsed.data;

  // Generate ticket number
  const { data: numData } = await db.rpc("generate_ticket_number");
  const ticketNumber = (numData as string) || `TKT${Date.now()}`;

  const { data: ticket, error } = await db
    .from("support_tickets")
    .insert({
      ticket_number: ticketNumber,
      business_id: businessId ?? null,
      user_id: userId ?? null,
      user_email: userEmail ?? null,
      subject,
      status: "open",
      priority,
      category,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Add first message from admin
  await db.from("support_ticket_messages").insert({
    ticket_id: ticket.id,
    sender_uid: uid,
    sender_name: "FundiFlow Admin",
    sender_role: "admin",
    content,
  });

  await writeAuditLog(db, {
    adminUid: uid, adminEmail: email,
    action: "create_support_ticket",
    resourceType: "ticket", resourceId: ticket.id,
    resourceName: ticketNumber, severity: "info",
  });

  return NextResponse.json({ ticket });
}
