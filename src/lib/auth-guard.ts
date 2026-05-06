import { createClient } from "@/lib/supabase-server";
import { getServiceSupabase } from "@/lib/supabase";
import { resolveRole } from "@/lib/role-resolver";
import type { ActionResult } from "@/lib/action-result";

export type AuthSession = {
  userId: string;
  role: "admin" | "teacher";
};

const AUTH_ERRORS: Record<string, string> = {
  NOT_AUTHENTICATED: "Sessão expirada. Faça login novamente.",
  NOT_AUTHORIZED: "Você não tem permissão para esta ação.",
};

/**
 * Retorna um ActionResult de erro se o erro for de autenticação/autorização.
 * Retorna null se for outro tipo de erro (para o catch tratar normalmente).
 */
export function handleAuthError<T = null>(error: unknown): ActionResult<T> | null {
  if (error instanceof Error && error.message in AUTH_ERRORS) {
    return { success: false, error: AUTH_ERRORS[error.message] };
  }
  return null;
}

/**
 * Verifica se o chamador está autenticado e retorna userId + role.
 * Lança erro se não houver sessão válida.
 */
export async function requireAuth(): Promise<AuthSession> {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    throw new Error("NOT_AUTHENTICATED");
  }

  const role = await resolveRole(getServiceSupabase(), user.id, user.app_metadata);

  return {
    userId: user.id,
    role,
  };
}

/**
 * Verifica se o chamador é admin. Lança erro caso contrário.
 */
export async function requireAdmin(): Promise<AuthSession> {
  const session = await requireAuth();

  if (session.role !== "admin") {
    throw new Error("NOT_AUTHORIZED");
  }

  return session;
}
