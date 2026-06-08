import { NextResponse } from "next/server";
import { validateAdminRequest, writeAuditLog } from "@/lib/admin/validate";
import { z } from "zod";

const createSchema = z.object({
  label: z.string().optional(),
  email: z.string().email().optional(),
  roleToAssign: z.string().default("owner"),
  maxUses: z.number().int().min(1).max(100).optional(),
  expiresInDays: z.number().int().min(1).max(30).default(7),
});

const revokeSchema = z.object({
  id: z.string().uuid(),
});

export async function GET(request: Request) {
  const admin = await validateAdminRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { db } = admin;
  const { data, error } = await db
    .from("admin_invite_links")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const links = (data ?? []).map((link: Record<string, unknown>) => ({
    ...link,
    url: `${baseUrl}/auth/register?invite=${link.token}`,
    isExpired: new Date(link.expires_at as string) < new Date(),
    isExhausted: link.max_uses !== null && (link.use_count as number) >= (link.max_uses as number),
  }));

  return NextResponse.json({ links });
}

export async function POST(request: Request) {
  const admin = await validateAdminRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { db, uid, email } = admin;
  const raw = await request.json().catch(() => null);

  // Revoke action
  if (raw?.action === "revoke") {
    const parsed = revokeSchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: "Invalid revoke data" }, { status: 400 });

    await db.from("admin_invite_links").update({
      revoked: true,
      revoked_at: new Date().toISOString(),
      revoked_by: uid,
    }).eq("id", parsed.data.id);

    await writeAuditLog(db, {
      adminUid: uid, adminEmail: email,
      action: "revoke_invite_link",
      resourceType: "invite_link", resourceId: parsed.data.id,
      severity: "warning",
    });

    return NextResponse.json({ success: true });
  }

  // Create action
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid invite data" }, { status: 400 });

  const { label, email: inviteEmail, roleToAssign, maxUses, expiresInDays } = parsed.data;
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

  const { data: link, error } = await db
    .from("admin_invite_links")
    .insert({
      created_by: uid,
      label: label ?? null,
      email: inviteEmail ?? null,
      role_to_assign: roleToAssign,
      max_uses: maxUses ?? null,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog(db, {
    adminUid: uid, adminEmail: email,
    action: "create_invite_link",
    resourceType: "invite_link", resourceId: link.id,
    resourceName: label ?? link.token,
    newState: { email: inviteEmail, role: roleToAssign, expiresAt },
    severity: "info",
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return NextResponse.json({
    link,
    url: `${baseUrl}/auth/register?invite=${link.token}`,
  });
}
