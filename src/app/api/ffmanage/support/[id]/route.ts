import { NextResponse } from "next/server";
import { validateAdminRequest, writeAuditLog } from "@/lib/admin/validate";
import { z } from "zod";

const replySchema = z.object({
  content: z.string().min(1),
});

const updateSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assignedTo: z.string().uuid().nullable().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await validateAdminRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { db } = admin;

  const [ticketRes, messagesRes] = await Promise.allSettled([
    db.from("support_tickets").select("*").eq("id", id).single(),
    db
      .from("support_ticket_messages")
      .select("*")
      .eq("ticket_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (ticketRes.status === "rejected" || !ticketRes.value.data) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  return NextResponse.json({
    ticket: ticketRes.value.data,
    messages: messagesRes.status === "fulfilled" ? (messagesRes.value.data ?? []) : [],
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await validateAdminRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { db, uid, email } = admin;
  const raw = await request.json().catch(() => null);

  // Check if this is a reply or an update
  const replyParsed = replySchema.safeParse(raw);
  if (replyParsed.success && raw?.type === "reply") {
    await db.from("support_ticket_messages").insert({
      ticket_id: id,
      sender_uid: uid,
      sender_name: "FundiFlow Admin",
      sender_role: "admin",
      content: replyParsed.data.content,
    });
    // Move to in_progress if open
    await db
      .from("support_tickets")
      .update({ status: "in_progress" })
      .eq("id", id)
      .eq("status", "open");
    return NextResponse.json({ success: true });
  }

  const updateParsed = updateSchema.safeParse(raw);
  if (!updateParsed.success) {
    return NextResponse.json({ error: "Invalid update data" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (updateParsed.data.status) {
    updates.status = updateParsed.data.status;
    if (updateParsed.data.status === "resolved") updates.resolved_at = new Date().toISOString();
    if (updateParsed.data.status === "closed") updates.closed_at = new Date().toISOString();
  }
  if (updateParsed.data.priority) updates.priority = updateParsed.data.priority;
  if (updateParsed.data.assignedTo !== undefined) updates.assigned_to = updateParsed.data.assignedTo;

  const { error } = await db.from("support_tickets").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog(db, {
    adminUid: uid, adminEmail: email,
    action: "update_support_ticket",
    resourceType: "ticket", resourceId: id,
    newState: updates, severity: "info",
  });

  return NextResponse.json({ success: true });
}
