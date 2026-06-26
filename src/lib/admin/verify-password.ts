import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

/**
 * Verify an email + password against Supabase Auth on an isolated, throwaway
 * client — WITHOUT ever touching a service-role client.
 *
 * Why this exists (read before "simplifying" it):
 *   supabase-js mutates a client's `Authorization` header the moment you call
 *   `auth.signInWithPassword`. From that point on, every `.from(...)` call on
 *   that SAME client runs as the signed-in `authenticated` user instead of the
 *   service role. Platform tables (`platform_admins`, `admin_sessions`, …) have
 *   `REVOKE ALL ... FROM authenticated` (migration 00026), so any privileged
 *   read/write done on the post-sign-in client fails with "permission denied".
 *
 *   That was the root cause of the ffmanage login bug: the login route signed
 *   in and then read `platform_admins` on the same client, which returned no
 *   rows and produced "Access denied. You are not registered as a platform
 *   administrator." — even for genuinely registered admins.
 *
 * Verifying on a dedicated client (created with the anon key — least privilege,
 * which is all sign-in needs) keeps service-role clients pristine.
 *
 * @returns the authenticated user on success, or null on failure.
 */
export async function verifyPassword(
  email: string,
  password: string
): Promise<User | null> {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/rest\/v1\/?$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!url || !anonKey) return null;

  const authClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await authClient.auth.signInWithPassword({ email, password });

  // Drop the in-memory session so this throwaway client retains nothing.
  await authClient.auth.signOut().catch(() => {});

  if (error || !data?.user) return null;
  return data.user;
}
