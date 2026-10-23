import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { RSO_STATE_COOKIE, RSO_STATE_MAX_AGE_S, isRsoRegion } from '@/lib/rso/mock-provider';
import { getSessionFromHeaders } from '@/lib/session';

/**
 * GET /api/rso/authorize?region=br — início do RSO simulado. Exige sessão
 * do app, grava o `state` anti-CSRF em cookie httpOnly e manda para a tela
 * de consentimento (no RSO real: a URL de authorize do provedor).
 */
export async function GET(request: Request): Promise<never> {
  const url = new URL(request.url);
  const region = url.searchParams.get('region')?.toLowerCase();

  let userId: string | null = null;
  try {
    userId = (await getSessionFromHeaders(request.headers))?.user.id ?? null;
  } catch (error) {
    console.error('[rso] falha ao ler a sessão no authorize', error);
  }
  if (userId === null) redirect(`/login?next=${encodeURIComponent(url.pathname + url.search)}`);
  if (!isRsoRegion(region)) redirect('/dashboard/settings?rso=error');

  const state = randomBytes(32).toString('base64url');
  (await cookies()).set(RSO_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: RSO_STATE_MAX_AGE_S,
  });
  redirect(`/rso/consent?state=${state}&region=${region}`);
}
