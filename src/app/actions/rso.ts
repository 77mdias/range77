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

export async function authorizeRso(state: string, region: string): Promise<never> {
  const resolvedHeaders = await headers();
  let target = '/dashboard/settings?rso=error';
  try {
    const userId = (await getSessionFromHeaders(resolvedHeaders))?.user.id;
    if (userId && isRsoRegion(region)) {
      const code = signRsoCode(
        {
          userId,
          puuid: fictitiousAccountForUser(userId, region).puuid,
          region,
          exp: Date.now() + RSO_CODE_TTL_MS,
        },
        requireEnv(loadAppEnv(), 'BETTER_AUTH_SECRET'),
      );
      target = `/api/rso/callback?${new URLSearchParams({ code, state })}`;
    }
  } catch (error) {
    console.error('[rso] falha ao autorizar', error);
  }
  redirect(target);
}

export async function denyRso(): Promise<never> {
  redirect('/dashboard/settings?rso=denied');
}
