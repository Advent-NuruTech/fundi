import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Returns a Supabase client authenticated as the service role.
 * SERVER-ONLY — never import from client components.
 */
export function getBillingAdminClient(): SupabaseClient {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/rest\/v1\/?$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Returns a Supabase client authenticated with the caller's bearer token.
 * Use this in API routes where you want RLS to apply to the request.
 */
export function getUserScopedClient(bearerToken: string): SupabaseClient {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/rest\/v1\/?$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${bearerToken}` } },
  });
}
