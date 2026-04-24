'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase-server';
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

export async function signOut(): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('[signOut]', error.message);
      return { success: false, error: 'Falha ao encerrar sessão.' };
    }
    return { success: true, data: null };
  } catch {
    return { success: false, error: 'Falha ao encerrar sessão.' };
  }
}
