import { afterEach, describe, expect, it, vi } from 'vitest';
import type { UserRiotAccountRow, UserRiotStore } from '@/lib/db/user-riot-store';
import { decideProfileAccess, resolveProfileAccess } from '@/services/access/profile-access';

const target = { region: 'br', name: 'Fulano', tag: 'BR1' };
const link = (o: Partial<UserRiotAccountRow> = {}) =>
  ({
    userId: 'u1', region: 'br', nameKey: 'fulano', tagKey: 'br1', puuid: 'p',
    linkedVia: 'rso_mock', profilePublic: false, ...o,
  }) as UserRiotAccountRow;

describe('decideProfileAccess', () => {
  const cases: Array<[string, Parameters<typeof decideProfileAccess>[0], string]> = [
    ['demo anônimo', { viewerUserId: null, target: { region: 'br', name: 'ValCoachDemo', tag: 'DEMO' }, link: null }, 'demo'],
    ['demo caixa diferente', { viewerUserId: null, target: { region: 'BR', name: 'valcoachdemo', tag: 'demo' }, link: null }, 'demo'],
    ['demo em outra região não é demo', { viewerUserId: null, target: { region: 'na', name: 'ValCoachDemo', tag: 'DEMO' }, link: null }, 'private'],
    ['sem vínculo', { viewerUserId: 'u1', target, link: null }, 'private'],
    ['legacy privado', { viewerUserId: 'u2', target, link: link({ linkedVia: 'legacy', profilePublic: true }) }, 'private'],
    ['legacy do próprio usuário', { viewerUserId: 'u1', target, link: link({ linkedVia: 'legacy' }) }, 'private'],
    ['dono', { viewerUserId: 'u1', target, link: link() }, 'owner'],
    ['dono com perfil público', { viewerUserId: 'u1', target, link: link({ profilePublic: true }) }, 'owner'],
    ['público para anônimo', { viewerUserId: null, target, link: link({ profilePublic: true }) }, 'public'],
    ['público para outro usuário', { viewerUserId: 'u2', target, link: link({ linkedVia: 'rso', profilePublic: true }) }, 'public'],
    ['privado para outro', { viewerUserId: 'u2', target, link: link() }, 'private'],
    ['privado para anônimo', { viewerUserId: null, target, link: link() }, 'private'],
  ];
  it.each(cases)('%s -> %s', (_n, input, expected) => {
    expect(decideProfileAccess(input)).toBe(expected);
  });
});

describe('resolveProfileAccess', () => {
  afterEach(() => vi.restoreAllMocks());
  const store = (fn: UserRiotStore['getByRiotId']) => ({ getByRiotId: fn }) as unknown as UserRiotStore;

  it('consulta o store com chaves minúsculas', async () => {
    const getByRiotId = vi.fn().mockResolvedValue(link({ profilePublic: true }));
    const r = await resolveProfileAccess(null, { region: 'BR', name: 'Fulano', tag: 'BR1' }, { store: store(getByRiotId) });
    expect(r).toBe('public');
    expect(getByRiotId).toHaveBeenCalledWith('br', 'fulano', 'br1');
  });

  it('falha do store -> private com console.error', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const r = await resolveProfileAccess('u1', target, { store: store(vi.fn().mockRejectedValue(new Error('db'))) });
    expect(r).toBe('private');
    expect(err).toHaveBeenCalled();
  });

  it('demo não depende do store (DB fora do ar continua mostrando a demo)', async () => {
    const getByRiotId = vi.fn().mockRejectedValue(new Error('db'));
    const r = await resolveProfileAccess(null, { region: 'br', name: 'ValCoachDemo', tag: 'DEMO' }, { store: store(getByRiotId) });
    expect(r).toBe('demo');
    expect(getByRiotId).not.toHaveBeenCalled();
  });
});
