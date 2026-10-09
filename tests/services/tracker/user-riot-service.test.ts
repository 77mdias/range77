import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserRiotStore } from '@/lib/db/user-riot-store';

/**
 * SUITE TDD — vincular/desvincular o Riot ID do USUÁRIO LOGADO
 * (self-tracking): sessão + validação (afinidade HenrikDev + parseRiotId) +
 * store + revalidação das settings. Dependências injetadas (sem DB).
 */

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { revalidatePath } from 'next/cache';
import { linkRiotAccount, unlinkRiotAccount } from '@/services/tracker/user-riot-service';

const sessionUser = { id: 'user-1', name: 'U', email: null, image: null };

const makeDeps = (options: { session: boolean } = { session: true }) => {
  const store: UserRiotStore = {
    get: vi.fn(async () => null),
    upsert: vi.fn(async () => {}),
    remove: vi.fn(async () => {}),
  };
  return {
    store,
    deps: {
      getSession: vi.fn(async () => (options.session ? { user: sessionUser } : null)),
      store,
    },
  };
};

const INPUT = { region: 'BR', name: 'Player One', tag: 'BR1' };

beforeEach(() => {
  vi.mocked(revalidatePath).mockClear();
});

describe('linkRiotAccount', () => {
  it('exige sessão (UNAUTHENTICATED) sem tocar no store', async () => {
    const { deps, store } = makeDeps({ session: false });

    const result = await linkRiotAccount(deps, INPUT);

    expect(result).toMatchObject({ ok: false, error: 'UNAUTHENTICATED' });
    expect(store.upsert).not.toHaveBeenCalled();
  });

  it('rejeita região fora das afinidades da HenrikDev (INVALID_PARAMS)', async () => {
    const { deps, store } = makeDeps();

    const result = await linkRiotAccount(deps, { ...INPUT, region: 'mars' });

    expect(result).toMatchObject({ ok: false, error: 'INVALID_PARAMS' });
    expect(result.message).toContain('mars');
    expect(store.upsert).not.toHaveBeenCalled();
  });

  it('rejeita Riot ID inválido via parseRiotId (INVALID_PARAMS)', async () => {
    const { deps, store } = makeDeps();

    const result = await linkRiotAccount(deps, { ...INPUT, tag: 'toolong1' });

    expect(result).toMatchObject({ ok: false, error: 'INVALID_PARAMS' });
    expect(result.message).toContain('alfanuméricos');
    expect(store.upsert).not.toHaveBeenCalled();
  });

  it('persiste chaves em minúsculas e revalida as settings', async () => {
    const { deps, store } = makeDeps();

    const result = await linkRiotAccount(deps, INPUT);

    expect(result).toMatchObject({ ok: true });
    expect(store.upsert).toHaveBeenCalledWith({
      userId: 'user-1',
      region: 'br',
      nameKey: 'player one',
      tagKey: 'br1',
      displayName: 'Player One',
    });
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/settings');
  });
});

describe('unlinkRiotAccount', () => {
  it('exige sessão (UNAUTHENTICATED) sem tocar no store', async () => {
    const { deps, store } = makeDeps({ session: false });

    const result = await unlinkRiotAccount(deps);

    expect(result).toMatchObject({ ok: false, error: 'UNAUTHENTICATED' });
    expect(store.remove).not.toHaveBeenCalled();
  });

  it('remove o vínculo do usuário e revalida as settings', async () => {
    const { deps, store } = makeDeps();

    const result = await unlinkRiotAccount(deps);

    expect(result).toMatchObject({ ok: true });
    expect(store.remove).toHaveBeenCalledWith('user-1');
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/settings');
  });
});
