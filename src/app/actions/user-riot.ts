'use server';

import {
  setProfilePublic as setProfilePublicCore,
  unlinkRiotAccount as unlinkRiotAccountCore,
  type UserRiotResult,
} from '@/services/tracker/user-riot-service';
import { getSession } from '@/lib/session';

/**
 * SERVER ACTIONS da conta Riot vinculada (perfil público e desvínculo).
 *
 * Delegam para o serviço injetável com as dependências de produção
 * (getSession real — o usuário nunca vem do cliente). O import é barato: o
 * store nasce lazy no primeiro uso.
 */

export async function setProfilePublic(value: boolean): Promise<UserRiotResult> {
  return setProfilePublicCore({ getSession }, value);
}

export async function unlinkRiotAccount(): Promise<UserRiotResult> {
  return unlinkRiotAccountCore({ getSession });
}
