import { revalidatePath } from 'next/cache';
import { createUserRiotStore, type UserRiotStore } from '@/lib/db/user-riot-store';
import type { SessionView } from '@/lib/session';

/**
 * Gestão da conta Riot do USUÁRIO LOGADO (consumida pelas Server Actions):
 * perfil público e desvínculo. O vínculo em si só nasce do callback do RSO.
 * Espelha `tracked-players-service`: sessão → validação → store →
 * revalidação. `getSession` e `store` são injetáveis (testes com fakes); o
 * store padrão nasce LAZY. O usuário vem SEMPRE da sessão, nunca do cliente.
 */

export type UserRiotErrorCode = 'UNAUTHENTICATED' | 'INVALID_PARAMS' | 'NOT_LINKED';

export interface UserRiotResult {
  readonly ok: boolean;
  readonly error?: UserRiotErrorCode;
  readonly message: string;
}

export interface UserRiotDeps {
  readonly getSession: () => Promise<SessionView | null>;
  readonly store?: UserRiotStore;
}

function storeOf(deps: UserRiotDeps): UserRiotStore {
  return deps.store ?? createUserRiotStore();
}

export async function setProfilePublic(
  deps: UserRiotDeps,
  value: boolean,
): Promise<UserRiotResult> {
  const session = await deps.getSession();
  if (session === null) {
    return { ok: false, error: 'UNAUTHENTICATED', message: 'Entre para gerenciar seu perfil.' };
  }
  // Fronteira de confiança: a Server Action aceita qualquer coisa do cliente.
  if (typeof value !== 'boolean') {
    return { ok: false, error: 'INVALID_PARAMS', message: 'Valor inválido para o perfil público.' };
  }

  const store = storeOf(deps);
  const linked = await store.get(session.user.id);
  // Vínculo legado (Riot ID digitado) não é consentimento.
  if (linked === null || linked.linkedVia === 'legacy') {
    return {
      ok: false,
      error: 'NOT_LINKED',
      message: 'Conecte sua conta com Riot para tornar o perfil público.',
    };
  }

  await store.setProfilePublic(session.user.id, value);

  revalidatePath('/dashboard/settings');
  revalidatePath(`/players/${linked.region}/${encodeURIComponent(linked.nameKey)}/${linked.tagKey}`);
  return { ok: true, message: value ? 'Perfil público.' : 'Perfil privado.' };
}

export async function unlinkRiotAccount(deps: UserRiotDeps): Promise<UserRiotResult> {
  const session = await deps.getSession();
  if (session === null) {
    return { ok: false, error: 'UNAUTHENTICATED', message: 'Entre para gerenciar sua conta Riot.' };
  }

  // Apagar a linha encerra o consentimento: o perfil deixa de ser público na hora.
  await storeOf(deps).remove(session.user.id);

  revalidatePath('/dashboard/settings');
  return { ok: true, message: 'Conta Riot desvinculada.' };
}
