'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { signIn } from '@/app/actions/auth';
import { loginSchema } from '@/lib/auth-schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

// Tipagem minima da API JS do Turnstile (carregada via next/script).
type TurnstileApi = {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      callback: (token: string) => void;
      'expired-callback'?: () => void;
      'error-callback'?: () => void;
      theme?: 'light' | 'dark' | 'auto';
    },
  ) => string;
  reset: (widgetId?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const captchaRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  // Renderiza o widget assim que o script estiver pronto E a env var existir.
  // Sem env var (dev local), o widget nao aparece e o login segue normal.
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !scriptLoaded || !captchaRef.current) return;
    if (!window.turnstile || widgetIdRef.current) return;

    widgetIdRef.current = window.turnstile.render(captchaRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      callback: (token) => setCaptchaToken(token),
      'expired-callback': () => setCaptchaToken(null),
      'error-callback': () => setCaptchaToken(null),
    });
  }, [scriptLoaded]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setServerError('');

    const form = new FormData(e.currentTarget);
    const raw = {
      email: form.get('email') as string,
      password: form.get('password') as string,
    };

    // Validação client-side
    const parsed = loginSchema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setServerError('Confirme o captcha antes de entrar.');
      return;
    }

    if (captchaToken) form.set('captchaToken', captchaToken);

    setLoading(true);
    const result = await signIn(form);
    setLoading(false);

    if (!result.success) {
      // Token Turnstile e single-use: reset apos qualquer tentativa.
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
        setCaptchaToken(null);
      }
      setServerError(result.error);
      return;
    }

    router.push(result.data.redirectTo);
  }

  return (
    <>
      {TURNSTILE_SITE_KEY && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          async
          defer
          onLoad={() => setScriptLoaded(true)}
        />
      )}
      <div className="flex min-h-dvh items-center justify-center px-4">
        <Card className="w-full max-w-sm border-primary/20 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold tracking-tight text-shadow-gold">
              Petit Allegro
            </CardTitle>
            <CardDescription>Entre com suas credenciais</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* E-mail */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="seu@email.com"
                  autoComplete="email"
                  autoFocus
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              {/* Senha */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="********"
                  autoComplete="current-password"
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              {/* Captcha (renderizado apenas se a Site Key estiver configurada) */}
              {TURNSTILE_SITE_KEY && (
                <div ref={captchaRef} className="flex justify-center" />
              )}

              {/* Erro do servidor */}
              {serverError && (
                <p className="text-sm text-destructive text-center">
                  {serverError}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading || (!!TURNSTILE_SITE_KEY && !captchaToken)}
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
