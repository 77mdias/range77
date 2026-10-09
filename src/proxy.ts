import { getSessionCookie } from 'better-auth/cookies';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * PROXY (Next 16 — sucessor do middleware): protege /dashboard com checagem
 * OPTIMISTA da existência do cookie de sessão (sem DB — edge-safe, doc
 * oficial "Auth Protection").
 *
 * ATENÇÃO: cookie presente ≠ sessão válida. A validação REAL acontece nas
 * páginas/Server Actions com `auth.api.getSession({ headers: await headers() })`.
 */

export function proxy(request: NextRequest): NextResponse {
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
