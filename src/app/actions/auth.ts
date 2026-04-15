'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase-server';
import { getServiceSupabase } from '@/lib/supabase';
import type { ActionResult } from '@/lib/action-result';

// ---------- Schemas ----------

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'O e-mail é obrigatório.')
    .email('Informe um e-mail válido.'),
  password: z
    .string()
    .min(8, 'A senha deve ter no mínimo 8 caracteres.')
    .regex(/[A-Z]/, 'A senha deve conter pelo menos uma letra maiúscula.')
    .regex(/[0-9]/, 'A senha deve conter pelo menos um número.'),
});

// ---------- Types ----------

export type UserProfile = {
  fullName: string;
  role: 'admin' | 'teacher';
};

// ---------- Auth helpers ----------

/**
 * Lê o user autenticado via cookie (anon key).
 * Retorna null se não houver sessão válida.
 */
async function getAuthUser() {
  const authClient = await createClient();
  const { data: { user }, error } = await authClient.auth.getUser();
  if (error || !user) return null;
  return user;
}

// ---------- Actions ----------

export async function signIn(
  formData: FormData
): Promise<ActionResult<{ redirectTo: string }>> {
  const raw = {
    email: formData.get('email'),
    password: formData.get('password'),
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { success: false, error: 'E-mail ou senha incorretos.' };
  }

  return { success: true, data: { redirectTo: '/' } };
}

export async function getUserProfile(): Promise<ActionResult<UserProfile>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'Usuário não autenticado.' };
    }

    const supabase = getServiceSupabase();
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      return { success: false, error: 'Perfil não encontrado.' };
    }

    return {
      success: true,
      data: { fullName: profile.full_name, role: profile.role },
    };
  } catch {
    return { success: false, error: 'Falha ao buscar perfil do usuário.' };
  }
}

export async function signOut(): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) return { success: false, error: error.message };
    return { success: true, data: null };
  } catch {
    return { success: false, error: 'Falha ao encerrar sessão.' };
  }
}
