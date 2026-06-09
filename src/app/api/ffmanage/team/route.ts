import { NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/admin/validate";
import type { PlatformAdmin } from "@/types/admin";

export async function GET(request: Request) {
  const admin = await validateAdminRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { db } = admin;

  const [teamRes, ownerConfigRes] = await Promise.allSettled([
    db
      .from("platform_admins")
      .select("id, user_id, role, email, full_name, is_active, last_login_at, created_at")
      .order("created_at", { ascending: true }),
    db
      .from("system_config")
      .select("value")
      .eq("key", "system_owner_uid")
      .single(),
  ]);

  const rawTeam =
    teamRes.status === "fulfilled" && !teamRes.value.error
      ? (teamRes.value.data ?? [])
      : [];

  const systemOwnerUid =
    ownerConfigRes.status === "fulfilled" && ownerConfigRes.value.data
      ? (ownerConfigRes.value.data.value as string | null)
      : null;

  const ownerInTeam = rawTeam.some((a) => a.user_id === systemOwnerUid);

  const team: PlatformAdmin[] = rawTeam.map((r) => ({
    id: r.id as string,
    userId: r.user_id as string,
    role: r.role,
    email: r.email as string,
    fullName: r.full_name as string | null,
    isActive: r.is_active as boolean,
    lastLoginAt: r.last_login_at as string | null,
    createdAt: r.created_at as string,
  }));

  return NextResponse.json({ team, systemOwnerUid, ownerInTeam });
}
