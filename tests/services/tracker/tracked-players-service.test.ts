import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TrackedPlayersStore } from '@/lib/db/tracked-players-store';
import type { ProfileAccess } from '@/services/access/profile-access';

/**
 * SUITE TDD — seguir/deixar de seguir (sessão + validação + store +
 * revalidação do dashboard). Dependências injetadas (sem DB).
 */

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { revalidatePath } from 'next/cache';
import { followPlayer, unfollowPlayer } from '@/services/tracker/tracked-players-service';

const sessionUser = { id: 'user-1', name: 'U', email: null, image: null };

const makeDeps = (
  options: { session?: boolean; access?: ProfileAccess } = {},
) => {
  const { session = true, access = 'public' } = options;
  const store: TrackedPlayersStore = {
    listByUser: vi.fn(async () => []),
    add: vi.fn(async () => {}),
    remove: vi.fn(async () => {}),
    isTracked: vi.fn(async () => false),
  };
  return {
    store,
    deps: {
      getSession: vi.fn(async () =>
        session ? { user: sessionUser } : null,
      ),
      store,
      resolveAccess: vi.fn(async () => access),
    },
  };
};

const INPUT = { region: 'BR', name: 'Player One', tag: 'BR1' };

beforeEach(() => {
  vi.mocked(revalidatePath).mockClear();
});

describe('followPlayer', () => {
  it('exige sessão (UNAUTHENTICATED) sem tocar no store', async () => {
    const { deps, store } = makeDeps({ session: false });

    const result = await followPlayer(deps, INPUT);

    expect(result).toMatchObject({ ok: false, code: 'UNAUTHENTICATED' });
    expect(store.add).not.toHaveBeenCalled();
  });

  it('rejeita Riot ID inválido (INVALID_PARAMS)', async () => {
    const { deps, store } = makeDeps();

    const result = await followPlayer(deps, { region: 'mars', name: 'P', tag: 'BR1' });

    expect(result).toMatchObject({ ok: false, code: 'INVALID_PARAMS' });
    expect(store.add).not.toHaveBeenCalled();
  });

  it('persiste com chaves em minúsculas e revalida /dashboard', async () => {
    const { deps, store } = makeDeps();

    const result = await followPlayer(deps, INPUT);

    expect(result).toMatchObject({ ok: true, code: 'OK' });
    expect(store.add).toHaveBeenCalledWith({
      userId: 'user-1',
      region: 'br',
      nameKey: 'player one',
      tagKey: 'br1',
      displayName: 'Player One',
    });
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard');
  });

  it('recusa perfil não público (PROFILE_NOT_PUBLIC) sem tocar no store', async () => {
    const { deps, store } = makeDeps({ access: 'private' });

    const result = await followPlayer(deps, INPUT);

    expect(result).toMatchObject({
      ok: false,
      code: 'PROFILE_NOT_PUBLIC',
      message: 'Este jogador não tornou o perfil público.',
    });
    expect(deps.resolveAccess).toHaveBeenCalledWith('user-1', {
      region: 'br',
      name: 'Player One',
      tag: 'BR1',
    });
    expect(store.add).not.toHaveBeenCalled();
  });

  it.each(['owner', 'demo', 'public'] as const)('permite seguir perfil %s', async (access) => {
    const { deps, store } = makeDeps({ access });

    const result = await followPlayer(deps, INPUT);

    expect(result).toMatchObject({ ok: true, code: 'OK' });
    expect(store.add).toHaveBeenCalled();
  });
});

describe('unfollowPlayer', () => {
  it('remove pela chave canônica e revalida /dashboard', async () => {
    const { deps, store } = makeDeps();

    const result = await unfollowPlayer(deps, INPUT);

    expect(result).toMatchObject({ ok: true, code: 'OK' });
    expect(store.remove).toHaveBeenCalledWith({
      userId: 'user-1',
      region: 'br',
      nameKey: 'player one',
      tagKey: 'br1',
    });
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard');
  });

  it('exige sessão (UNAUTHENTICATED)', async () => {
    const { deps, store } = makeDeps({ session: false });

    const result = await unfollowPlayer(deps, INPUT);

    expect(result).toMatchObject({ ok: false, code: 'UNAUTHENTICATED' });
    expect(store.remove).not.toHaveBeenCalled();
  });
});
