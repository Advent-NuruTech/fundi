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

const businessIdSchema = z.string().uuid();
const manageRequestSchema = z.object({
  businessId: businessIdSchema,
  action: z.enum([
    "set_membership_active",
    "delete_membership",
    "revoke_invitation",
    "complete_orphan",
    "delete_orphan",
  ]),
  memberUid: z.string().uuid().optional(),
  invitationId: z.string().uuid().optional(),
  orphanUserId: z.string().uuid().optional(),
  active: z.boolean().optional(),
  displayName: z.string().trim().min(1).max(120).optional(),
  roles: z.array(z.enum(EMPLOYEE_ROLES)).min(1).max(EMPLOYEE_ROLES.length).optional(),
  payRate: z.number().finite().min(0).nullable().optional(),
  payPeriod: z.enum(["daily", "weekly", "monthly"]).optional(),
  nextPayDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

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
  return createClient(getSupabaseUrl(), process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "", {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getAccessToken(request: Request) {
  const authHeader = request.headers.get("Authorization") ?? "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
}

async function requireBusinessOwner(request: Request, businessId: string) {
  const token = getAccessToken(request);
  if (!token) throw new HttpError(401, "Unauthorized");

  const admin = getAdminClient();
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) throw new HttpError(401, "Unauthorized");

  const { data: business, error: businessError } = await admin
    .from("businesses")
    .select("owner_uid")
    .eq("id", businessId)
    .maybeSingle();
  if (businessError) throw businessError;
  if (!business || business.owner_uid !== authData.user.id) {
    throw new HttpError(403, "Only the business owner can manage team access.");
  }

  return { admin, owner: authData.user, accessToken: token };
}

async function listAllAuthUsers(admin: ReturnType<typeof getAdminClient>): Promise<User[]> {
  const users: User[] = [];
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.nextPage === null) return users;
    page = data.nextPage;
  }
}

function temporaryPassword() {
  return `Fundi#${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}1!`;
}

async function movePrimaryBusinessAway(
  admin: ReturnType<typeof getAdminClient>,
  profileId: string,
  removedBusinessId: string
) {
  const { data: profile } = await admin
    .from("profiles")
    .select("business_id")
    .eq("id", profileId)
    .maybeSingle();
  if (profile?.business_id !== removedBusinessId) return;

  const { data: remaining } = await admin
    .from("business_members")
    .select("business_id")
    .eq("profile_id", profileId)
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  const { error } = await admin
    .from("profiles")
    .update({ business_id: remaining?.business_id ?? null })
    .eq("id", profileId);
  if (error) throw error;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsedBusinessId = businessIdSchema.safeParse(url.searchParams.get("businessId"));
    if (!parsedBusinessId.success) {
      return NextResponse.json({ error: "A valid business id is required." }, { status: 400 });
    }

    const { admin } = await requireBusinessOwner(request, parsedBusinessId.data);
    const businessId = parsedBusinessId.data;
    const [membersResult, profilesResult, invitationsResult, authUsers] = await Promise.all([
      admin.from("business_members").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
      admin.from("profiles").select("*").eq("business_id", businessId),
      admin.from("employee_invitations").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
      listAllAuthUsers(admin),
    ]);
    if (membersResult.error) throw membersResult.error;
    if (profilesResult.error) throw profilesResult.error;
    if (invitationsResult.error) throw invitationsResult.error;

    const members = membersResult.data ?? [];
    const memberIds = members.map((member) => member.profile_id as string);
    const missingProfileIds = memberIds.filter(
      (id) => !(profilesResult.data ?? []).some((profile) => profile.id === id)
    );
    const missingProfilesResult = missingProfileIds.length
      ? await admin.from("profiles").select("*").in("id", missingProfileIds)
      : { data: [], error: null };
    if (missingProfilesResult.error) throw missingProfilesResult.error;

    const profileById = new Map(
      [...(profilesResult.data ?? []), ...(missingProfilesResult.data ?? [])].map((profile) => [profile.id as string, profile])
    );
    const invitations = invitationsResult.data ?? [];
    const memberIdSet = new Set(memberIds);

    return NextResponse.json({
      members: members.map((member) => {
        const profile = profileById.get(member.profile_id as string);
        return {
          uid: member.profile_id,
          email: profile?.email ?? "Unknown email",
          displayName: profile?.display_name ?? "Incomplete employee",
          employeeNumber: member.employee_number ?? profile?.employee_number,
          role: member.role,
          roles: member.roles,
          businessId,
          active: member.active,
          mustChangePassword: profile?.must_change_password,
          photoURL: profile?.photo_url,
          bio: profile?.bio,
          phone: profile?.phone,
          invitedByUid: member.invited_by_uid,
          invitedByName: member.invited_by_name,
          payRate: member.pay_rate,
          payPeriod: member.pay_period,
          nextPayDate: member.next_pay_date,
          createdAt: member.created_at,
          lastActiveAt: member.last_active_at,
        };
      }),
      invitations: invitations.map((invitation) => ({
        id: invitation.id,
        email: invitation.email,
        displayName: invitation.display_name,
        roles: invitation.roles,
        invitedUid: invitation.invited_uid ?? undefined,
        status: invitation.status,
        createdAt: invitation.created_at,
        expiresAt: invitation.expires_at,
        acceptedAt: invitation.accepted_at ?? undefined,
      })),
      orphanedAccounts: authUsers
        .filter((user) => {
          const metadata = user.user_metadata;
          // An Auth user without a profile is an orphan even when an
          // invitation record already points at it. That is the normal state
          // when setup failed after the account was created.
          return metadata?.business_id === businessId && !memberIdSet.has(user.id) && !profileById.has(user.id);
        })
        .map((user) => ({
          uid: user.id,
          email: user.email ?? "Unknown email",
          displayName:
            typeof user.user_metadata.display_name === "string" ? user.user_metadata.display_name : "",
          createdAt: user.created_at,
        })),
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[employees GET]", error);
    return NextResponse.json({ error: "Could not load the team directory." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const parsed = manageRequestSchema.safeParse(await request.json().catch(() => undefined));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid team update." }, { status: 400 });
    }
    const input = parsed.data;
    const { admin, owner, accessToken } = await requireBusinessOwner(request, input.businessId);

    if (input.action === "set_membership_active") {
      if (!input.memberUid || input.active === undefined) {
        return NextResponse.json({ error: "Member and access status are required." }, { status: 400 });
      }
      if (input.memberUid === owner.id) {
        return NextResponse.json({ error: "The business owner cannot be removed." }, { status: 400 });
      }
      const { error } = await admin
        .from("business_members")
        .update({ active: input.active, last_active_at: new Date().toISOString() })
        .eq("business_id", input.businessId)
        .eq("profile_id", input.memberUid);
      if (error) throw error;
      if (!input.active) {
        await admin
          .from("employee_invitations")
          .update({ status: "revoked" })
          .eq("business_id", input.businessId)
          .eq("invited_uid", input.memberUid);
        await movePrimaryBusinessAway(admin, input.memberUid, input.businessId);
        await admin.auth.admin.signOut(input.memberUid, "global").catch(() => undefined);
      }
      return NextResponse.json({ success: true });
    }

    if (input.action === "delete_membership") {
      if (!input.memberUid) return NextResponse.json({ error: "Member is required." }, { status: 400 });
      if (input.memberUid === owner.id) {
        return NextResponse.json({ error: "The business owner cannot be deleted." }, { status: 400 });
      }
      const { error } = await admin
        .from("business_members")
        .delete()
        .eq("business_id", input.businessId)
        .eq("profile_id", input.memberUid);
      if (error) throw error;
      await admin
        .from("employee_invitations")
        .update({ status: "revoked" })
        .eq("business_id", input.businessId)
        .eq("invited_uid", input.memberUid);
      await movePrimaryBusinessAway(admin, input.memberUid, input.businessId);
      await admin.auth.admin.signOut(input.memberUid, "global").catch(() => undefined);
      return NextResponse.json({ success: true });
    }

    if (input.action === "revoke_invitation") {
      if (!input.invitationId) return NextResponse.json({ error: "Invitation is required." }, { status: 400 });
      const { data: invitation, error: invitationError } = await admin
        .from("employee_invitations")
        .update({ status: "revoked" })
        .eq("id", input.invitationId)
        .eq("business_id", input.businessId)
        .eq("status", "pending")
        .select("invited_uid")
        .maybeSingle();
      if (invitationError) throw invitationError;
      if (invitation?.invited_uid) {
        await admin
          .from("business_members")
          .update({ active: false, last_active_at: new Date().toISOString() })
          .eq("business_id", input.businessId)
          .eq("profile_id", invitation.invited_uid);
        await movePrimaryBusinessAway(admin, invitation.invited_uid, input.businessId);
        await admin.auth.admin.signOut(invitation.invited_uid, "global").catch(() => undefined);
      }
      return NextResponse.json({ success: true });
    }

    if (input.action === "delete_orphan") {
      if (!input.orphanUserId) return NextResponse.json({ error: "Orphan account is required." }, { status: 400 });
      const { data: authUser, error: userError } = await admin.auth.admin.getUserById(input.orphanUserId);
      if (userError || !authUser.user || authUser.user.user_metadata.business_id !== input.businessId) {
        return NextResponse.json({ error: "This incomplete account was not found." }, { status: 404 });
      }
      const { data: profile } = await admin.from("profiles").select("id").eq("id", input.orphanUserId).maybeSingle();
      if (profile) {
        return NextResponse.json({ error: "Only an account with no employee profile can be permanently deleted." }, { status: 400 });
      }
      const { error } = await admin.auth.admin.deleteUser(input.orphanUserId);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (!input.orphanUserId || !input.displayName || !input.roles?.length) {
      return NextResponse.json({ error: "Name, role, and incomplete account are required." }, { status: 400 });
    }
    const { data: authUser, error: userError } = await admin.auth.admin.getUserById(input.orphanUserId);
    if (userError || !authUser.user || authUser.user.user_metadata.business_id !== input.businessId || !authUser.user.email) {
      return NextResponse.json({ error: "This incomplete account was not found." }, { status: 404 });
    }
    const { data: existingMembership } = await admin
      .from("business_members")
      .select("id")
      .eq("business_id", input.businessId)
      .eq("profile_id", input.orphanUserId)
      .maybeSingle();
    if (existingMembership) {
      return NextResponse.json({ error: "This account has already been completed." }, { status: 409 });
    }

    const { data: employeeNumber, error: employeeNumberError } = await getCallerClient(accessToken).rpc("get_next_employee_number", {
      biz_id: input.businessId,
    });
    if (employeeNumberError) throw employeeNumberError;
    const password = temporaryPassword();
    const token = crypto.randomUUID();
    const compensation =
      input.payRate === undefined || input.payRate === null
        ? {}
        : { pay_rate: input.payRate, pay_period: input.payPeriod ?? "monthly", next_pay_date: input.nextPayDate ?? null };

    const { data: existingProfile, error: profileLookupError } = await admin
      .from("profiles")
      .select("id")
      .eq("id", input.orphanUserId)
      .maybeSingle();
    if (profileLookupError) throw profileLookupError;
    if (!existingProfile) {
      const { error: profileError } = await admin.from("profiles").insert({
        id: input.orphanUserId,
        email: authUser.user.email,
        display_name: input.displayName,
        employee_number: employeeNumber ?? undefined,
        role: input.roles[0],
        roles: input.roles,
        business_id: input.businessId,
        active: true,
        must_change_password: true,
        invited_by_uid: owner.id,
        invited_by_name: owner.user_metadata.display_name || owner.email || "Business owner",
        ...compensation,
      });
      if (profileError) throw profileError;
    }
    const { error: memberError } = await admin.from("business_members").upsert(
      {
        profile_id: input.orphanUserId,
        business_id: input.businessId,
        employee_number: employeeNumber ?? undefined,
        role: input.roles[0],
        roles: input.roles,
        active: false,
        invited_by_uid: owner.id,
        invited_by_name: owner.user_metadata.display_name || owner.email || "Business owner",
        ...compensation,
      },
      { onConflict: "profile_id,business_id" }
    );
    if (memberError) throw memberError;
    await admin
      .from("employee_invitations")
      .update({ status: "revoked" })
      .eq("business_id", input.businessId)
      .eq("invited_uid", input.orphanUserId)
      .eq("status", "pending");
    const { error: inviteError } = await admin.from("employee_invitations").insert({
      business_id: input.businessId,
      email: authUser.user.email,
      display_name: input.displayName,
      roles: input.roles,
      token,
      invited_uid: input.orphanUserId,
      temporary_password: password,
      invited_by_uid: owner.id,
      invited_by_name: owner.user_metadata.display_name || owner.email || "Business owner",
      status: "pending",
      expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    });
    if (inviteError) throw inviteError;
    const { error: authUpdateError } = await admin.auth.admin.updateUserById(input.orphanUserId, {
      password,
      email_confirm: true,
      user_metadata: {
        ...authUser.user.user_metadata,
        display_name: input.displayName,
        invited_by_uid: owner.id,
        business_id: input.businessId,
      },
    });
    if (authUpdateError) throw authUpdateError;
    return NextResponse.json({ success: true, temporaryPassword: password, token });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[employees PATCH]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update the employee." },
      { status: 500 }
    );
  }
}
