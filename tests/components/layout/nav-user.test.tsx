import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * SUITE TDD — NavUser (slot autenticado do header global). Cobre os quatro
 * estados do slot e, principalmente, o FAIL-SOFT: uma falha ao ler o vínculo
 * no DB NÃO pode lançar (derrubaria o <Suspense> do layout raiz e, em dev,
 * dispararia full-reload em loop).
 */

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  get: vi.fn(),
}));

vi.mock('@/lib/session', () => ({ getSession: mocks.getSession }));
vi.mock('@/lib/db/user-riot-store', () => ({
  getUserRiotStore: () => ({ get: mocks.get }),
}));

import { NavUser } from '@/components/layout/nav-user';

const SESSION = { user: { id: 'user-1', name: 'U', email: null, image: null } };

describe('NavUser', () => {
  beforeEach(() => {
    // O fail-soft loga no servidor; silencia o console para não poluir a saída.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.getSession.mockReset();
    mocks.get.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sem sessão → link "Entrar"', async () => {
    mocks.getSession.mockResolvedValueOnce(null);

    const html = renderToStaticMarkup(await NavUser());

    expect(html).toContain('href="/login"');
    expect(html).toContain('Entrar');
  });

  it('com sessão sem vínculo → convite para conectar o Riot ID', async () => {
    mocks.getSession.mockResolvedValueOnce(SESSION);
    mocks.get.mockResolvedValueOnce(null);

    const html = renderToStaticMarkup(await NavUser());

    expect(html).toContain('data-nav-connect-riot');
    expect(html).toContain('Conectar Riot ID');
  });

  it('com vínculo → cluster de perfil do Stitch (NOME#TAG + região + avatar) apontando para o perfil', async () => {
    mocks.getSession.mockResolvedValueOnce(SESSION);
    mocks.get.mockResolvedValueOnce({
      id: 'riot-1',
      userId: 'user-1',
      region: 'br',
      nameKey: 'twmz',
      tagKey: 'tower',
      displayName: 'twmz',
      createdAt: new Date('2026-10-01T00:00:00.000Z'),
      updatedAt: new Date('2026-10-01T00:00:00.000Z'),
    });

    const html = renderToStaticMarkup(await NavUser());

    expect(html).toContain('data-nav-player-chip');
    expect(html).toContain('twmz');
    expect(html).toContain('#tower');
    expect(html).toContain('/players/br/twmz/tower');
    // Linha secundária: ponto-live + região (sem rank inventado)
    expect(html).toContain('BR');
    // Avatar circular com a inicial do display name
    expect(html).toContain('>T</span>');
  });

  it('FALHA ao ler o vínculo → chip neutro, sem lançar', async () => {
    mocks.getSession.mockResolvedValueOnce(SESSION);
    mocks.get.mockRejectedValueOnce(new Error('Error connecting to database: fetch failed'));

    const html = renderToStaticMarkup(await NavUser());

    expect(html).toContain('data-nav-unavailable');
    expect(html).toContain('Conta indisponível');
    expect(html).not.toContain('data-nav-player-chip');
    expect(html).not.toContain('data-nav-connect-riot');
  });
});
