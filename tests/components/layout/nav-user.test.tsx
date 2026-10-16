import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * SUITE TDD — NavUser (slot autenticado do header global). Cobre os estados
 * do slot e, principalmente, o FAIL-SOFT: uma falha ao ler a SESSÃO (auth/DB)
 * ou o vínculo NÃO pode lançar (derrubaria o <Suspense> do layout raiz e, em
 * dev, dispararia full-reload em loop). `next/headers` é mockado porque
 * `headers()` deve permanecer FORA do try/catch (sinal de dinâmico).
 */

const mocks = vi.hoisted(() => ({
  getSessionFromHeaders: vi.fn(),
  get: vi.fn(),
}));

vi.mock('next/headers', () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock('@/lib/session', () => ({
  getSessionFromHeaders: mocks.getSessionFromHeaders,
}));
vi.mock('@/lib/db/user-riot-store', () => ({
  getUserRiotStore: () => ({ get: mocks.get }),
}));

import { NavUser } from '@/components/layout/nav-user';

const SESSION = { user: { id: 'user-1', name: 'U', email: null, image: null } };

describe('NavUser', () => {
  beforeEach(() => {
    // O fail-soft loga no servidor; silencia o console para não poluir a saída.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.getSessionFromHeaders.mockReset();
    mocks.get.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sem sessão → link "Entrar"', async () => {
    mocks.getSessionFromHeaders.mockResolvedValueOnce(null);

    const html = renderToStaticMarkup(await NavUser());

    expect(html).toContain('href="/login"');
    expect(html).toContain('Entrar');
  });

  it('com sessão sem vínculo → convite para conectar o Riot ID', async () => {
    mocks.getSessionFromHeaders.mockResolvedValueOnce(SESSION);
    mocks.get.mockResolvedValueOnce(null);

    const html = renderToStaticMarkup(await NavUser());

    expect(html).toContain('data-nav-connect-riot');
    expect(html).toContain('Conectar Riot ID');
  });

  it('com vínculo → cluster de perfil do Stitch (NOME#TAG + região + avatar) apontando para o perfil', async () => {
    mocks.getSessionFromHeaders.mockResolvedValueOnce(SESSION);
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

  it('FALHA ao ler a sessão (auth/env/DB) → chip neutro, sem lançar', async () => {
    // Cenário que re-arma o loop em dev: env de auth ausente faz getAuth()
    // lançar dentro do <Suspense> do layout raiz.
    mocks.getSessionFromHeaders.mockRejectedValueOnce(
      new Error('Variável de ambiente obrigatória ausente ou vazia: "BETTER_AUTH_SECRET"'),
    );

    const html = renderToStaticMarkup(await NavUser());

    expect(html).toContain('data-nav-unavailable');
    expect(html).toContain('Conta indisponível');
    // Nenhum outro estado é inferido (não sabemos se há sessão)
    expect(html).not.toContain('href="/login"');
    expect(html).not.toContain('data-nav-player-chip');
    expect(html).not.toContain('data-nav-connect-riot');
    // O vínculo nem chega a ser lido
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it('FALHA ao ler o vínculo → chip neutro, sem lançar', async () => {
    mocks.getSessionFromHeaders.mockResolvedValueOnce(SESSION);
    mocks.get.mockRejectedValueOnce(new Error('Error connecting to database: fetch failed'));

    const html = renderToStaticMarkup(await NavUser());

    expect(html).toContain('data-nav-unavailable');
    expect(html).toContain('Conta indisponível');
    expect(html).not.toContain('data-nav-player-chip');
    expect(html).not.toContain('data-nav-connect-riot');
  });
});
