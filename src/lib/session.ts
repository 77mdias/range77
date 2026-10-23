import { headers } from 'next/headers';
import { getAuth } from '@/lib/auth';

/**
 * Leitura server-side da sessão (RSC/Server Actions).
 *
 * Wrapper fino sobre `auth.api.getSession` com a forma que o app consome:
 * retorna `null` quando não autenticado e achata o usuário (email/image
 * podem ser nulos — Discord). Sempre via `await headers()` (Next 16).
 *
 * `getSessionFromHeaders` é o núcleo SEM `headers()`: recebe os headers já
 * resolvidos para que consumidores fail-soft (ex.: NavUser) possam chamar
 * `headers()` FORA do try/catch — o sinal de "dinâmico" do Cache Components
 * lança e NÃO pode ser capturado — tratando apenas falhas de auth/DB.
 */

export interface SessionUser {
  readonly id: string;
  readonly name: string;
  readonly email: string | null;
  readonly image: string | null;
}

export interface SessionView {
  readonly user: SessionUser;
}

export async function getSessionFromHeaders(
  resolvedHeaders: Headers,
): Promise<SessionView | null> {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: resolvedHeaders });
  if (session === null) {
    return null;
  }
  return {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email ?? null,
      image: session.user.image ?? null,
    },
  };
}

/**
 * Id do visitante para decisões de acesso. Falha de auth/DB vira anônimo —
 * anônimo só enxerga o que é público/demo, então isto é fail-closed.
 * `headers()` fica com o chamador, FORA de qualquer try/catch.
 */
export async function getViewerUserId(resolvedHeaders: Headers): Promise<string | null> {
  try {
    return (await getSessionFromHeaders(resolvedHeaders))?.user.id ?? null;
  } catch (error) {
    console.error('[session] falha ao ler a sessão; tratando como anônimo', error);
    return null;
  }
}

export async function getSession(): Promise<SessionView | null> {
  // `headers()` PRIMEIRO: em prerender ele lança o sinal de "dinâmico" que o
  // Cache Components usa para abrir o hole — antes de qualquer custo de DB.
  const resolvedHeaders = await headers();
  return getSessionFromHeaders(resolvedHeaders);
}
