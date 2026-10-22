'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { loadAppEnv, requireEnv } from '@/config/env';
import {
  RSO_CODE_TTL_MS,
  fictitiousAccountForUser,
  isRsoRegion,
  signRsoCode,
} from '@/lib/rso/mock-provider';
import { getSessionFromHeaders } from '@/lib/session';

/**
 * SERVER ACTIONS da tela de consentimento — o lado "provedor" do RSO
 * simulado. Autorizar emite o `code` assinado para o usuário DA SESSÃO e
 * devolve ao callback com o `state` intacto (quem confere é o callback).
 */

const RSO_ERROR_URL = '/dashboard/settings?rso=error';

/**
 * DEVOLVE a URL do callback (ou de erro) em vez de `redirect()`: o redirect
 * de Server Action é resolvido no servidor (RSC), o que perderia o
 * Set-Cookie que apaga o `state` e deixaria o `code` no histórico. O
 * cliente navega com `window.location.assign` — GET real do navegador.
 */
export async function authorizeRso(state: string, region: string): Promise<string> {
  const resolvedHeaders = await headers();
  try {
    const userId = (await getSessionFromHeaders(resolvedHeaders))?.user.id;
    if (!userId || !isRsoRegion(region)) return RSO_ERROR_URL;
    const code = signRsoCode(
      {
        userId,
        puuid: fictitiousAccountForUser(userId, region).puuid,
        region,
        exp: Date.now() + RSO_CODE_TTL_MS,
      },
      requireEnv(loadAppEnv(), 'BETTER_AUTH_SECRET'),
    );
    return `/api/rso/callback?${new URLSearchParams({ code, state })}`;
  } catch (error) {
    console.error('[rso] falha ao autorizar', error);
    return RSO_ERROR_URL;
  }
}

export async function denyRso(): Promise<never> {
  redirect('/dashboard/settings?rso=denied');
}
