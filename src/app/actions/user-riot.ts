'use server';

import {
  linkRiotAccount as linkRiotAccountCore,
  unlinkRiotAccount as unlinkRiotAccountCore,
  type LinkRiotAccountInput,
  type UserRiotResult,
} from '@/services/tracker/user-riot-service';
import { getSession } from '@/lib/session';

/**
 * SERVER ACTIONS do Riot ID vinculado (self-tracking).
 *
 * Delegam para o serviço injetável com as dependências de produção
 * (getSession real). O import é barato: o store nasce lazy no primeiro uso.
 */

export async function linkRiotAccount(
  input: LinkRiotAccountInput,
): Promise<UserRiotResult> {
  return linkRiotAccountCore({ getSession }, input);
}

export async function unlinkRiotAccount(): Promise<UserRiotResult> {
  return unlinkRiotAccountCore({ getSession });
}
