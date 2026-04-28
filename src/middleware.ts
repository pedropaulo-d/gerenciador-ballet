import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { jwtVerify, createRemoteJWKSet, type JWTPayload } from 'jose';
import { createMiddlewareClient } from '@/lib/supabase-middleware';

const PUBLIC_ROUTES = ['/login'];
const ADMIN_ONLY_ROUTES = ['/finances', '/locations', '/classes', '/admin'];

// JWKS do Supabase (GoTrue). Instanciado em escopo de módulo para preservar
// o cache interno do jose (TTL ~10min, cooldown de 30s entre re-fetches).
// Fetch real só acontece no primeiro request e quando a chave girar.
const JWKS = createRemoteJWKSet(
  new URL('/auth/v1/.well-known/jwks.json', process.env.NEXT_PUBLIC_SUPABASE_URL!)
);

function getServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    }
  );
}

async function verifyAccessToken(token: string | undefined | null): Promise<JWTPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      algorithms: ['ES256'],
    });
    return payload.sub ? payload : null;
  } catch {
    return null;
  }
}

/**
 * Tenta extrair a role do claim `app_metadata.role` (caminho rápido, zero DB).
 * Só cai no SELECT em profiles quando o claim não existe — caso de tokens
 * emitidos antes da trigger sync_profile_role_to_jwt rodar.
 */
async function resolveRole(claims: JWTPayload): Promise<'admin' | 'teacher'> {
  const appMetadata = claims.app_metadata as { role?: string } | undefined;
  if (appMetadata?.role === 'admin') return 'admin';
  if (appMetadata?.role === 'teacher') return 'teacher';

  const { data: profile } = await getServiceClient()
    .from('profiles')
    .select('role')
    .eq('id', claims.sub as string)
    .single();

  return profile?.role === 'admin' ? 'admin' : 'teacher';
}

export async function middleware(request: NextRequest) {
  const totalStart = performance.now();
  const { pathname } = request.nextUrl;

  const { supabase, response } = createMiddlewareClient(request);
  const { data: { session } } = await supabase.auth.getSession();

  const jwtStart = performance.now();
  const claims = await verifyAccessToken(session?.access_token);
  const jwtMs = performance.now() - jwtStart;

  let roleMs = 0;

  try {
    if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
      return response;
    }

    if (!claims) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    if (ADMIN_ONLY_ROUTES.some((route) => pathname.startsWith(route))) {
      const roleStart = performance.now();
      const role = await resolveRole(claims);
      roleMs = performance.now() - roleStart;
      if (role !== 'admin') {
        const url = request.nextUrl.clone();
        url.pathname = '/';
        return NextResponse.redirect(url);
      }
    }

    return response;
  } finally {
    const totalMs = performance.now() - totalStart;
    console.log(
      `[PERF] Middleware ${pathname}: ${totalMs.toFixed(2)} ms ` +
      `(jwt=${jwtMs.toFixed(2)}ms, role=${roleMs.toFixed(2)}ms)`
    );
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/webhooks).*)',
  ],
};
