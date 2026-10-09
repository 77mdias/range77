import { revalidatePath } from 'next/cache';
import { HENRIKDEV_AFFINITIES } from '@/contracts/henrikdev';
import { parseRiotId } from '@/lib/validation/riot-id';
import { createUserRiotStore, type UserRiotStore } from '@/lib/db/user-riot-store';
import type { SessionView } from '@/lib/session';

/**
 * Lógica de vincular/desvincular o Riot ID do USUÁRIO LOGADO
 * (consumida pelas Server Actions). Espelha `tracked-players-service`:
 * sessão → validação (afinidade HenrikDev + parseRiotId) → store →
 * revalidação das settings. `getSession` e `store` são injetáveis
 * (testes com fakes); o store padrão nasce LAZY.
 */

export type UserRiotErrorCode = 'UNAUTHENTICATED' | 'INVALID_PARAMS';

export interface UserRiotResult {
  readonly ok: boolean;
  readonly error?: UserRiotErrorCode;
  readonly message: string;
}

export interface LinkRiotAccountInput {
  readonly region: string;
  readonly name: string;
  readonly tag: string;
}

export interface UserRiotDeps {
  readonly getSession: () => Promise<SessionView | null>;
  readonly store?: UserRiotStore;
}

function storeOf(deps: UserRiotDeps): UserRiotStore {
  return deps.store ?? createUserRiotStore();
}

export async function linkRiotAccount(
  deps: UserRiotDeps,
  input: LinkRiotAccountInput,
): Promise<UserRiotResult> {
  const session = await deps.getSession();
  if (session === null) {
    return { ok: false, error: 'UNAUTHENTICATED', message: 'Entre para vincular seu Riot ID.' };
  }

  const region = input.region.trim().toLowerCase();
  if (!(HENRIKDEV_AFFINITIES as readonly string[]).includes(region)) {
    return {
      ok: false,
      error: 'INVALID_PARAMS',
      message: `Região inválida: "${input.region}". Afinidades aceitas: ${HENRIKDEV_AFFINITIES.join(', ')}.`,
    };
  }

  const parsed = parseRiotId(`${input.name}#${input.tag}`);
  if (!parsed.ok) {
    return { ok: false, error: 'INVALID_PARAMS', message: parsed.message };
  }

  await storeOf(deps).upsert({
    userId: session.user.id,
    region,
    nameKey: parsed.value.name.toLowerCase(),
    tagKey: parsed.value.tag.toLowerCase(),
    displayName: parsed.value.name,
  });

  revalidatePath('/dashboard/settings');
  return { ok: true, message: `Riot ID ${parsed.value.name}#${parsed.value.tag} vinculado.` };
}

export async function unlinkRiotAccount(deps: UserRiotDeps): Promise<UserRiotResult> {
  const session = await deps.getSession();
  if (session === null) {
    return { ok: false, error: 'UNAUTHENTICATED', message: 'Entre para gerenciar seu Riot ID.' };
  }

  await storeOf(deps).remove(session.user.id);

  revalidatePath('/dashboard/settings');
  return { ok: true, message: 'Riot ID desvinculado.' };
}
