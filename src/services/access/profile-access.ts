import { getUserRiotStore, type UserRiotAccountRow, type UserRiotStore } from '@/lib/db/user-riot-store';
import { DEMO_ACCOUNT } from '@/services/riot/mock';

/** Quem pode ver um perfil: nenhum dado pessoal sem opt-in do jogador. */
export type ProfileAccess = 'owner' | 'public' | 'demo' | 'private';

export interface ProfileTarget {
  readonly region: string;
  readonly name: string;
  readonly tag: string;
}

/** Decisão pura. `link` é o vínculo que DONO do Riot ID alvo possui (ou null). */
export function decideProfileAccess(input: {
  viewerUserId: string | null;
  target: ProfileTarget;
  link: UserRiotAccountRow | null;
}): ProfileAccess {
  const { viewerUserId, target, link } = input;
  if (
    target.region.toLowerCase() === DEMO_ACCOUNT.region &&
    target.name.toLowerCase() === DEMO_ACCOUNT.gameName.toLowerCase() &&
    target.tag.toLowerCase() === DEMO_ACCOUNT.tagLine.toLowerCase()
  ) {
    return 'demo';
  }
  if (!link || link.linkedVia === 'legacy') return 'private';
  if (viewerUserId !== null && link.userId === viewerUserId) return 'owner';
  return link.profilePublic ? 'public' : 'private';
}

/** Fail-closed: qualquer falha do store nega o acesso. */
export async function resolveProfileAccess(
  viewerUserId: string | null,
  target: ProfileTarget,
  deps: { store?: UserRiotStore } = {},
): Promise<ProfileAccess> {
  // A demo é pública por definição: não depende do DB (que pode estar fora).
  if (decideProfileAccess({ viewerUserId, target, link: null }) === 'demo') return 'demo';
  try {
    const store = deps.store ?? getUserRiotStore();
    const link = await store.getByRiotId(
      target.region.toLowerCase(),
      target.name.toLowerCase(),
      target.tag.toLowerCase(),
    );
    return decideProfileAccess({ viewerUserId, target, link });
  } catch (error) {
    console.error('[profile-access] falha ao resolver acesso; negando', error);
    return 'private';
  }
}
