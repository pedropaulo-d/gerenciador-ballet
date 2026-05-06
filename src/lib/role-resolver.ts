import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Resolves a user's role using the JWT app_metadata claim as the fast path,
 * with a SELECT in `profiles` as fallback for legacy tokens issued before
 * the sync_profile_role_to_jwt trigger.
 *
 * Receives the supabase client as a parameter so middleware (Edge runtime,
 * cookieless service client) and Server Actions (with cookies) can share
 * the same logic without coupling client construction.
 */
export async function resolveRole(
  supabase: SupabaseClient,
  userId: string,
  appMetadata: Record<string, unknown> | null | undefined,
): Promise<"admin" | "teacher"> {
  const claimRole = appMetadata?.role;
  if (claimRole === "admin") return "admin";
  if (claimRole === "teacher") return "teacher";

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  return profile?.role === "admin" ? "admin" : "teacher";
}
