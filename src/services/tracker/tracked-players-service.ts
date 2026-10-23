import { revalidatePath } from 'next/cache';
import { parsePlayerRouteParams } from '@/lib/validation/player-params';
import {
  createTrackedPlayersStore,
  type TrackedPlayersStore,
} from '@/lib/db/tracked-players-store';
import type { SessionView } from '@/lib/session';
import { PRIVATE_PROFILE_MESSAGE, PROFILE_NOT_PUBLIC_CODE } from '@/contracts/access';
import { resolveProfileAccess } from '@/services/access/profile-access';

/**
 * Lógica de seguir/deixar de seguir (consumida pelas Server Actions).
 *
 * Heavy lifting aqui: sessão → validação do Riot ID → store → revalidação
 * do dashboard. `getSession` e `store` são injetáveis (testes com fakes);
 * o store padrão nasce LAZY (o import não exige DATABASE_URL).
 */

export interface ActionResult {
  readonly ok: boolean;
  readonly code: 'OK' | 'UNAUTHENTICATED' | 'INVALID_PARAMS' | typeof PROFILE_NOT_PUBLIC_CODE;
  readonly message: string;
}

export interface FollowPlayerInput {
  readonly region: string;
  readonly name: string;
  readonly tag: string;
}

export interface TrackedPlayerDeps {
  readonly getSession: () => Promise<SessionView | null>;
  readonly store?: TrackedPlayersStore;
  readonly resolveAccess?: typeof resolveProfileAccess;
}

function storeOf(deps: TrackedPlayerDeps): TrackedPlayersStore {
  return deps.store ?? createTrackedPlayersStore();
}

export async function followPlayer(
  deps: TrackedPlayerDeps,
  input: FollowPlayerInput,
): Promise<ActionResult> {
  const session = await deps.getSession();
  if (session === null) {
    return { ok: false, code: 'UNAUTHENTICATED', message: 'Entre para seguir jogadores.' };
  }

  const parsed = parsePlayerRouteParams({ region: input.region, name: input.name, tag: input.tag });
  if (!parsed.ok) {
    return { ok: false, code: 'INVALID_PARAMS', message: parsed.message };
  }

  // Seguir só com consentimento: dono, demo ou perfil público.
  const access = await (deps.resolveAccess ?? resolveProfileAccess)(session.user.id, {
    region: parsed.region,
    name: parsed.name,
    tag: parsed.tag,
  });
  if (access === 'private') {
    return { ok: false, code: PROFILE_NOT_PUBLIC_CODE, message: PRIVATE_PROFILE_MESSAGE };
  }

  await storeOf(deps).add({
    userId: session.user.id,
    region: parsed.region,
    nameKey: parsed.name.toLowerCase(),
    tagKey: parsed.tag.toLowerCase(),
    displayName: parsed.name,
  });

  revalidatePath('/dashboard');
  return { ok: true, code: 'OK', message: `Seguindo ${parsed.name}#${parsed.tag}.` };
}

export async function unfollowPlayer(
  deps: TrackedPlayerDeps,
  input: FollowPlayerInput,
): Promise<ActionResult> {
  const session = await deps.getSession();
  if (session === null) {
    return { ok: false, code: 'UNAUTHENTICATED', message: 'Entre para gerenciar seguidos.' };
  }

  const parsed = parsePlayerRouteParams({ region: input.region, name: input.name, tag: input.tag });
  if (!parsed.ok) {
    return { ok: false, code: 'INVALID_PARAMS', message: parsed.message };
  }

  await storeOf(deps).remove({
    userId: session.user.id,
    region: parsed.region,
    nameKey: parsed.name.toLowerCase(),
    tagKey: parsed.tag.toLowerCase(),
  });

  revalidatePath('/dashboard');
  return { ok: true, code: 'OK', message: `${parsed.name}#${parsed.tag} removido.` };
}
