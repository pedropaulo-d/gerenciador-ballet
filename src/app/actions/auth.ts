'use server';

import { createClient } from '@/lib/supabase-server';
import { loginSchema } from '@/lib/auth-schemas';
import type { ActionResult } from '@/lib/action-result';

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

  // Cloudflare Turnstile: token obrigatorio quando o captcha esta habilitado
  // no painel Supabase. Em dev, sem captcha configurado, formData nao traz
  // o token e o Supabase aceita o login normal — operacao all-or-nothing
  // controlada do lado do servidor Supabase.
  const captchaToken = formData.get('captchaToken');

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
    options: typeof captchaToken === 'string' && captchaToken
      ? { captchaToken }
      : undefined,
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
