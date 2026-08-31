import { createClient, type User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";

const EMPLOYEE_ROLES = [
  "admin_manager",
  "tailor",
  "receptionist",
  "inventory_manager",
  "cashier",
] as const;

const inviteRequestSchema = z.object({
  businessId: z.string().uuid(),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  displayName: z.string().trim().min(1).max(120),
  roles: z.array(z.enum(EMPLOYEE_ROLES)).min(1).max(EMPLOYEE_ROLES.length),
  payRate: z.number().finite().min(0).optional(),
  payPeriod: z.enum(["daily", "weekly", "monthly"]).optional(),
  nextPayDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  inviterName: z.string().trim().max(120).optional(),
});

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
  const randomPart = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  return `Fundi#${randomPart}1!`;
}

async function findAuthUserByEmail(
  admin: ReturnType<typeof getAdminClient>,
  email: string
): Promise<User | null> {
  let page = 1;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;

    const matchingUser = data.users.find(
      (user) => user.email?.trim().toLowerCase() === email
    );
    if (matchingUser) return matchingUser;
    if (data.nextPage === null) return null;
    page = data.nextPage;
  }
}

export async function POST(request: Request) {
  try {
    const admin = getAdminClient();

    const authHeader = request.headers.get("Authorization") ?? "";
    const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      data: { user: caller },
      error: authError,
    } = await admin.auth.getUser(accessToken);
    if (authError || !caller) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const parsed = inviteRequestSchema.safeParse(
      await request.json().catch(() => undefined)
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid invitation details" },
        { status: 400 }
      );
    }

    const {
      businessId,
      email,
      displayName,
      roles,
      payRate,
      payPeriod,
      nextPayDate,
      inviterName,
    } = parsed.data;

    const { data: callerMember, error: memberLookupError } = await admin
      .from("business_members")
      .select("roles")
      .eq("business_id", businessId)
      .eq("profile_id", caller.id)
      .maybeSingle();

    if (memberLookupError) {
      throw new Error(`Could not verify your team permissions: ${memberLookupError.message}`);
    }

    const callerRoles: string[] = callerMember?.roles ?? [];
    const canManageTeam = callerRoles.includes("owner") || callerRoles.includes("admin_manager");
    if (!canManageTeam) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const callerDisplayName =
      typeof caller.user_metadata.display_name === "string"
        ? caller.user_metadata.display_name.trim()
        : "";
    const safeInviterName = callerDisplayName || inviterName || caller.email || "Team manager";
    const callerClient = getCallerClient(accessToken);
    const { data: employeeNumber, error: employeeNumberError } = await callerClient.rpc(
      "get_next_employee_number",
      { biz_id: businessId }
    );

    if (employeeNumberError) {
      throw new Error(`Could not generate an employee number: ${employeeNumberError.message}`);
    }

    const tempPassword = buildTempPassword();
    const token = crypto.randomUUID();
    let employeeUid: string;
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    // Record the invitation attempt before provisioning the Auth user. If a
    // later step fails, the owner can see and complete the incomplete setup
    // from Team instead of losing the employee's details.
    const { data: invitationAttempt, error: invitationAttemptError } = await admin
      .from("employee_invitations")
      .insert({
        business_id: businessId,
        email,
        display_name: displayName,
        roles,
        token,
        temporary_password: tempPassword,
        invited_by_uid: caller.id,
        invited_by_name: safeInviterName,
        status: "pending",
        expires_at: expiresAt,
      })
      .select("id")
      .single();
    if (invitationAttemptError || !invitationAttempt) {
      throw new Error(
        `Could not record the invitation: ${invitationAttemptError?.message ?? "No invitation was returned"}`
      );
    }

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
      // The previous implementation could leave an Auth account without a
      // profile. Recover only accounts created by this inviter for this business.
      const existingUser = await findAuthUserByEmail(admin, email);
      const metadata = existingUser?.user_metadata;
      const isRecoverableOrphan =
        existingUser &&
        metadata?.invited_by_uid === caller.id &&
        metadata?.business_id === businessId;

      if (!isRecoverableOrphan) {
        await admin.from("employee_invitations").update({ status: "revoked" }).eq("id", invitationAttempt.id);
        return NextResponse.json(
          {
            error:
              createError?.message ??
              "An account already exists for this email address.",
          },
          { status: 409 }
        );
      }

      const { data: existingProfile, error: profileLookupError } = await admin
        .from("profiles")
        .select("id")
        .eq("id", existingUser.id)
        .maybeSingle();

      if (profileLookupError) {
        throw new Error(`Could not check the existing employee profile: ${profileLookupError.message}`);
      }
      if (existingProfile) {
        await admin.from("employee_invitations").update({ status: "revoked" }).eq("id", invitationAttempt.id);
        return NextResponse.json(
          { error: "This employee already has a FundiFlow account." },
          { status: 409 }
        );
      }

      const { error: repairError } = await admin.auth.admin.updateUserById(existingUser.id, {
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          ...metadata,
          display_name: displayName,
          invited_by_uid: caller.id,
          business_id: businessId,
        },
      });
      if (repairError) {
        throw new Error(`Could not recover the previous invitation: ${repairError.message}`);
      }

      employeeUid = existingUser.id;
    } else {
      employeeUid = userData.user.id;
    }

    const { error: invitationLinkError } = await admin
      .from("employee_invitations")
      .update({ invited_uid: employeeUid })
      .eq("id", invitationAttempt.id);
    if (invitationLinkError) {
      throw new Error(`Could not link the invitation to the employee account: ${invitationLinkError.message}`);
    }

    const compensation =
      payRate === undefined
        ? {}
        : {
            pay_rate: payRate,
            pay_period: payPeriod ?? "monthly",
            next_pay_date: nextPayDate ?? null,
          };

    try {
      const { error: profileError } = await admin.from("profiles").upsert(
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
          invited_by_name: safeInviterName,
          ...compensation,
        },
        { onConflict: "id" }
      );
      if (profileError) {
        throw new Error(`Could not create the employee profile: ${profileError.message}`);
      }

      const { error: businessMemberError } = await admin.from("business_members").upsert(
        {
          profile_id: employeeUid,
          business_id: businessId,
          employee_number: employeeNumber ?? undefined,
          role: roles[0],
          roles,
          active: false,
          invited_by_uid: caller.id,
          invited_by_name: safeInviterName,
          ...compensation,
        },
        { onConflict: "profile_id,business_id" }
      );
      if (businessMemberError) {
        throw new Error(`Could not create the employee membership: ${businessMemberError.message}`);
      }

    } catch (setupError) {
      // Do not delete the Auth user or the invitation attempt here. Keeping
      // both gives the business owner a recoverable, editable orphan record.
      throw setupError;
    }

    return NextResponse.json({
      success: true,
      temporaryPassword: tempPassword,
      token,
    });
  } catch (err) {
    console.error("[invite]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invitation failed" },
      { status: 500 }
    );
  }
}
