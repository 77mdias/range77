import { headers } from 'next/headers';
import { getAuth } from '@/lib/auth';

/**
 * Leitura server-side da sessão (RSC/Server Actions).
 *
 * Wrapper fino sobre `auth.api.getSession` com a forma que o app consome:
 * retorna `null` quando não autenticado e achata o usuário (email/image
 * podem ser nulos — Discord). Sempre via `await headers()` (Next 16).
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

export async function getSession(): Promise<SessionView | null> {
  // `headers()` PRIMEIRO: em prerender ele lança o sinal de "dinâmico" que o
  // Cache Components usa para abrir o hole — antes de qualquer custo de DB.
  const resolvedHeaders = await headers();
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
