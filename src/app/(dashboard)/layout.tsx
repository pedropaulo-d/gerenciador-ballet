import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getServiceSupabase } from "@/lib/supabase";
import { resolveRole } from "@/lib/role-resolver";
import { UserRoleProvider, type UserProfile } from "@/lib/user-role-context";
import { DashboardShell } from "./dashboard-shell";

// Layout autenticado: depende de cookies por request. Sem isso, o segmento
// pode ser tratado como estático/cacheado e servir o profile de um usuário
// a outro (session bleeding em SSR).
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Carrega o profile server-side: role sai do claim app_metadata (zero DB),
 * full_name exige 1 SELECT em profiles (não está no JWT).
 * Reutiliza resolveRole — mesma logica do middleware e auth-guard.
 */
async function loadProfile(): Promise<UserProfile | null> {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) return null;

  const supabase = getServiceSupabase();

  const [role, profileRes] = await Promise.all([
    resolveRole(supabase, user.id, user.app_metadata),
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
  ]);

  if (!profileRes.data) return null;

  return {
    fullName: profileRes.data.full_name,
    role,
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
