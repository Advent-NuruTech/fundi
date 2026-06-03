import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getSupabaseUrl() {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/rest\/v1\/?$/, "");
}

function getAdminClient() {
  const url = getSupabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !serviceKey) throw new Error("Missing Supabase admin env vars");
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getCallerClient(accessToken: string) {
  const url = getSupabaseUrl();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function buildTempPassword() {
  return `Fundi#${Math.random().toString(36).slice(2, 10)}1!`;
}

export async function POST(request: Request) {
  try {
    const admin = getAdminClient();

    const authHeader = request.headers.get("Authorization") ?? "";
    const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: { user: caller }, error: authError } = await admin.auth.getUser(accessToken);
    if (authError || !caller) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const callerClient = getCallerClient(accessToken);

    const body = await request.json().catch(() => ({}));
    const { businessId, email, displayName, roles, payRate, payPeriod, nextPayDate, inviterName } = body as {
      businessId: string;
      email: string;
      displayName: string;
      roles: string[];
      payRate?: number;
      payPeriod?: string;
      nextPayDate?: string;
      inviterName: string;
    };

    if (!businessId || !email || !displayName || !roles?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify caller is a member of this business with team management capability
    const { data: callerMember } = await admin
      .from("business_members")
      .select("roles")
      .eq("business_id", businessId)
      .eq("profile_id", caller.id)
      .maybeSingle();

    const callerRoles: string[] = (callerMember as any)?.roles ?? [];
    const canManageTeam = callerRoles.includes("owner") || callerRoles.includes("admin_manager");
    if (!canManageTeam) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const tempPassword = buildTempPassword();
    const token_ = crypto.randomUUID();

    // Get next employee number via RPC — must use caller's authenticated client
    // because get_next_employee_number has an is_business_member() guard
    const { data: employeeNumber } = await callerClient.rpc("get_next_employee_number", { biz_id: businessId });

    // Create the Supabase auth user for the employee
    const { data: userData, error: createError } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        display_name: displayName,
        invited_by_uid: caller.id,
        business_id: businessId,
      },
    });

    if (createError || !userData.user) {
      return NextResponse.json(
        { error: createError?.message ?? "Failed to create user account" },
        { status: 500 }
      );
    }

    const employeeUid = userData.user.id;

    // Upsert profile row for the employee (needs service role — RLS blocks owner)
    await admin.from("profiles").upsert(
      {
        id: employeeUid,
        email,
        display_name: displayName,
        employee_number: employeeNumber ?? undefined,
        role: roles[0],
        roles,
        business_id: businessId,
        active: false,
        must_change_password: true,
        invited_by_uid: caller.id,
        invited_by_name: inviterName,
        pay_rate: payRate ?? 0,
        pay_period: payPeriod ?? "monthly",
        next_pay_date: nextPayDate ?? null,
      },
      { onConflict: "id" }
    );

    // Upsert business_members row
    await admin.from("business_members").upsert(
      {
        profile_id: employeeUid,
        business_id: businessId,
        employee_number: employeeNumber ?? undefined,
        role: roles[0],
        roles,
        active: false,
        invited_by_uid: caller.id,
        invited_by_name: inviterName,
        pay_rate: payRate ?? 0,
        pay_period: payPeriod ?? "monthly",
        next_pay_date: nextPayDate ?? null,
      },
      { onConflict: "profile_id,business_id" }
    );

    // Create invitation record (invited_uid FK is now satisfied)
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const { data: inviteData, error: inviteError } = await admin
      .from("employee_invitations")
      .insert({
        business_id: businessId,
        email,
        display_name: displayName,
        roles,
        token: token_,
        invited_uid: employeeUid,
        temporary_password: tempPassword,
        invited_by_uid: caller.id,
        invited_by_name: inviterName,
        status: "pending",
        expires_at: expiresAt,
      })
      .select("id")
      .single();

    if (inviteError || !inviteData) {
      return NextResponse.json(
        { error: inviteError?.message ?? "Failed to create invitation record" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      temporaryPassword: tempPassword,
      token: token_,
    });
  } catch (err) {
    console.error("[invite]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invitation failed" },
      { status: 500 }
    );
  }
}
