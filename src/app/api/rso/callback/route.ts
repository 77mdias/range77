import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { loadAppEnv, requireEnv } from '@/config/env';
import { getUserRiotStore } from '@/lib/db/user-riot-store';
import {
  RSO_STATE_COOKIE,
  fictitiousAccountForUser,
  isRsoRegion,
  verifyRsoCode,
} from '@/lib/rso/mock-provider';
import { getSessionFromHeaders } from '@/lib/session';

/**
 * GET /api/rso/callback?code=...&state=... — fim do RSO simulado.
 * Qualquer falha (state, code, sessão, unique do puuid) → `rso=error` sem
 * gravar nada. O `state` é de uso único: o cookie sai em todo desfecho.
 */
async function link(request: Request, expectedState: string | undefined): Promise<'linked' | 'error'> {
  const params = new URL(request.url).searchParams;
  const state = params.get('state');
  if (!expectedState || state !== expectedState) return 'error';

  const payload = verifyRsoCode(
    params.get('code') ?? '',
    requireEnv(loadAppEnv(), 'BETTER_AUTH_SECRET'),
    Date.now(),
  );
  if (payload === null || !isRsoRegion(payload.region)) return 'error';

  const session = await getSessionFromHeaders(request.headers);
  if (session?.user.id !== payload.userId) return 'error';

  // "Troca do code por token + accounts/me" do RSO real.
  const account = fictitiousAccountForUser(payload.userId, payload.region);
  if (account.puuid !== payload.puuid || !account.gameName || !account.tagLine) return 'error';

  await getUserRiotStore().upsert({
    userId: payload.userId,
    region: payload.region,
    nameKey: account.gameName.toLowerCase(),
    tagKey: account.tagLine.toLowerCase(),
    displayName: `${account.gameName}#${account.tagLine}`,
    puuid: account.puuid,
    linkedVia: 'rso_mock',
  });
  return 'linked';
}

export async function GET(request: Request): Promise<never> {
  const cookieStore = await cookies();
  let outcome: 'linked' | 'error' = 'error';
  try {
    outcome = await link(request, cookieStore.get(RSO_STATE_COOKIE)?.value);
  } catch (error) {
    // Inclui o unique de `puuid` (conta já vinculada a outro usuário).
    console.error('[rso] callback falhou', error);
  }
  cookieStore.delete(RSO_STATE_COOKIE);
  redirect(`/dashboard/settings?rso=${outcome}`);
}
