import { NextResponse, type NextRequest } from 'next/server';

/**
 * PROXY (Next 16 — sucessor do middleware): protege /dashboard com checagem
 * OPTIMISTA da existência do cookie de sessão (sem DB, doc oficial
 * "Auth Protection").
 *
 * Autocontido de propósito: em vez de importar `getSessionCookie` de
 * `better-auth/cookies`, lemos os nomes padrão direto (menos acoplamento no
 * bundle do proxy). Se o prefixo/nome do cookie for customizado no auth.ts,
 * atualizar a lista abaixo.
 *
 * ATENÇÃO: cookie presente ≠ sessão válida. A validação REAL acontece nas
 * páginas/Server Actions com `auth.api.getSession({ headers: await headers() })`.
 */

/** Padrões do Better Auth: sem prefixo (http/dev) e `__Secure-` (https/prod). */
const SESSION_COOKIE_NAMES = [
  'better-auth.session_token',
  '__Secure-better-auth.session_token',
] as const;

export function hasSessionCookie(request: NextRequest): boolean {
  return SESSION_COOKIE_NAMES.some((name) => request.cookies.has(name));
}

export function proxy(request: NextRequest): NextResponse {
  if (!hasSessionCookie(request)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
