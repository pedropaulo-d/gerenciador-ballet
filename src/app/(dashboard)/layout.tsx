import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getServiceSupabase } from "@/lib/supabase";
import { UserRoleProvider, type UserProfile } from "@/lib/user-role-context";
import { DashboardShell } from "./dashboard-shell";

/**
 * Carrega o profile server-side: role sai do claim app_metadata (zero DB),
 * full_name exige 1 SELECT em profiles (não está no JWT).
 * Fallback de role para o SELECT caso o claim não exista em tokens antigos.
 */
async function loadProfile(): Promise<UserProfile | null> {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) return null;

  const appRole = (user.app_metadata as { role?: string } | undefined)?.role;
  const roleFromClaim =
    appRole === "admin" || appRole === "teacher" ? appRole : null;

  const supabase = getServiceSupabase();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  const resolvedRole =
    roleFromClaim ?? (profile.role === "admin" ? "admin" : "teacher");

  return {
    fullName: profile.full_name,
    role: resolvedRole,
  };
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await loadProfile();

  // Defensivo — o middleware já redireciona não-autenticados antes de chegar aqui.
  if (!profile) redirect("/login");

  return (
    <UserRoleProvider profile={profile}>
      <DashboardShell>{children}</DashboardShell>
    </UserRoleProvider>
  );
}
