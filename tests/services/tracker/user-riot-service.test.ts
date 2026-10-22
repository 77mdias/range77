import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserRiotAccountRow, UserRiotStore } from '@/lib/db/user-riot-store';

/**
 * SUITE TDD — perfil público e desvínculo da conta Riot do USUÁRIO LOGADO.
 * O vínculo em si só nasce do RSO (callback); aqui: sessão + store +
 * revalidação. Dependências injetadas (sem DB).
 */

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { revalidatePath } from 'next/cache';
import { setProfilePublic, unlinkRiotAccount } from '@/services/tracker/user-riot-service';

const sessionUser = { id: 'user-1', name: 'U', email: null, image: null };

const rsoRow = {
  id: 'row-1',
  userId: 'user-1',
  region: 'br',
  nameKey: 'kairo4821',
  tagKey: 'br1',
  displayName: 'Kairo4821',
  puuid: 'puuid-1',
  linkedVia: 'rso_mock',
  profilePublic: false,
  createdAt: new Date('2026-10-01T00:00:00.000Z'),
  updatedAt: new Date('2026-10-01T00:00:00.000Z'),
} as UserRiotAccountRow;

const makeDeps = (
  options: { session?: boolean; row?: UserRiotAccountRow | null } = {},
) => {
  const store: UserRiotStore = {
    get: vi.fn(async () => (options.row === undefined ? rsoRow : options.row)),
    upsert: vi.fn(async () => {}),
    remove: vi.fn(async () => {}),
    getByRiotId: vi.fn(async () => null),
    setProfilePublic: vi.fn(async () => {}),
  };
  return {
    store,
    deps: {
      getSession: vi.fn(async () => (options.session === false ? null : { user: sessionUser })),
      store,
    },
  };
};

beforeEach(() => {
  vi.mocked(revalidatePath).mockClear();
});

describe('setProfilePublic', () => {
  it('exige sessão (UNAUTHENTICATED) sem tocar no store', async () => {
    const { deps, store } = makeDeps({ session: false });

    const result = await setProfilePublic(deps, true);

    expect(result).toMatchObject({ ok: false, error: 'UNAUTHENTICATED' });
    expect(store.setProfilePublic).not.toHaveBeenCalled();
  });

  it('rejeita valor não booleano vindo do cliente (INVALID_PARAMS)', async () => {
    const { deps, store } = makeDeps();

    const result = await setProfilePublic(deps, 'true' as unknown as boolean);

    expect(result).toMatchObject({ ok: false, error: 'INVALID_PARAMS' });
    expect(store.setProfilePublic).not.toHaveBeenCalled();
  });

  it('sem vínculo → NOT_LINKED', async () => {
    const { deps, store } = makeDeps({ row: null });

    const result = await setProfilePublic(deps, true);

    expect(result).toMatchObject({ ok: false, error: 'NOT_LINKED' });
    expect(store.setProfilePublic).not.toHaveBeenCalled();
  });

  it('vínculo legado não é consentimento → NOT_LINKED', async () => {
    const { deps, store } = makeDeps({
      row: { ...rsoRow, linkedVia: 'legacy', puuid: null } as UserRiotAccountRow,
    });

    const result = await setProfilePublic(deps, true);

    expect(result).toMatchObject({ ok: false, error: 'NOT_LINKED' });
    expect(store.setProfilePublic).not.toHaveBeenCalled();
  });

  it('vínculo RSO: grava para o usuário DA SESSÃO e revalida settings + perfil', async () => {
    const { deps, store } = makeDeps();

    const result = await setProfilePublic(deps, true);

    expect(result).toMatchObject({ ok: true });
    expect(store.get).toHaveBeenCalledWith('user-1');
    expect(store.setProfilePublic).toHaveBeenCalledWith('user-1', true);
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/settings');
    expect(revalidatePath).toHaveBeenCalledWith('/players/br/kairo4821/br1');
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
