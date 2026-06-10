import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import {
  fetchUserProfileByEmail,
  fetchUserProfile,
} from "@/services/firestore.service";
import type { UserRole } from "@/types/domain";

async function callOnboardAPI(accessToken: string, body: Record<string, unknown> = {}) {
  const res = await fetch("/api/auth/onboard", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Account setup failed. Please try again.");
  }
}

export async function loginWithEmail(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function loginWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) throw error;
}

export async function logoutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function registerOwner(input: {
  email: string;
  password: string;
  displayName: string;
  phone: string;
  businessName: string;
  location: string;
}) {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        display_name: input.displayName,
        phone: input.phone,
        business_name: input.businessName,
        location: input.location,
      },
    },
  });

  if (error) throw error;
  if (!data.user) throw new Error("Registration failed. Please try again.");

  // If email confirmation is required, signUp returns no session.
  // The metadata above is stored in auth.users so the onboard API
  // can use it when the user confirms and signs in for the first time.
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new Error(
      "Please check your email to confirm your account, then sign in to complete setup."
    );
  }

  await callOnboardAPI(sessionData.session.access_token, {
    displayName: input.displayName,
    phone: input.phone,
    businessName: input.businessName,
    location: input.location,
  });
}

export async function resolveProfile(user: User) {
  const byId = await fetchUserProfile(user.id);
  if (byId) return byId;
  return user.email ? fetchUserProfileByEmail(user.email) : null;
}

export async function ensureProfileExists(user: User): Promise<boolean> {
  // Customer portal users have no employee profile — skip onboarding entirely
  if (user.user_metadata?.portal_type === "customer") return false;

  const profile = await fetchUserProfile(user.id);
  if (profile?.businessId) return true;

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return false;

  // Pass any metadata stored during registration so the onboard API
  // can create the business with the correct name/location even when
  // the call is triggered on first login (email-confirmation flow).
  const meta = user.user_metadata ?? {};
  try {
    await callOnboardAPI(sessionData.session.access_token, {
      displayName: meta.display_name || meta.full_name || meta.name,
      phone: meta.phone,
      businessName: meta.business_name,
      location: meta.location,
    });
    return true;
  } catch {
    return false;
  }
}

export function authStateListener(
  callback: (user: User | null, event: string) => void
) {
  supabase.auth.getSession().then(({ data }) => {
    callback(data.session?.user ?? null, "INITIAL_SESSION");
  });

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user ?? null, event);
  });

  return () => subscription.unsubscribe();
}

export async function inviteEmployeeToWorkshop(input: {
  businessId: string;
  inviterUid: string;
  inviterName: string;
  email: string;
  displayName: string;
  roles: UserRole[];
  payRate?: number;
  payPeriod?: "daily" | "weekly" | "monthly";
  nextPayDate?: string;
}) {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) throw new Error("Not authenticated");

  const res = await fetch("/api/auth/invite", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionData.session.access_token}`,
    },
    body: JSON.stringify({
      businessId: input.businessId,
      email: input.email,
      displayName: input.displayName,
      roles: input.roles,
      payRate: input.payRate,
      payPeriod: input.payPeriod,
      nextPayDate: input.nextPayDate,
      inviterName: input.inviterName,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to create invitation");
  }

  const result = await res.json();
  const invitationLink = `${window.location.origin}/login?invite=${result.token}&workspace=${input.businessId}`;
  return { invitationLink, temporaryPassword: result.temporaryPassword };
}
