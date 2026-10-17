import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * SUITE TDD — /dashboard (protegida). Sessão e store mockados; cobre o
 * redirect sem sessão, o grid com jogadores e o estado vazio.
 */

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  listByUser: vi.fn(),
}));

vi.mock('@/lib/session', () => ({ getSession: mocks.getSession }));
vi.mock('@/lib/db/tracked-players-store', () => ({
  getTrackedPlayersStore: () => ({ listByUser: mocks.listByUser }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  // Espelha o contrato real (erro de redirect do Next), com a URL na mensagem.
  redirect: (url: string): never => {
    throw new Error(`NEXT_REDIRECT: ${url}`);
  },
}));

import { DashboardContent } from '@/app/(app)/dashboard/page';

const trackedPlayer = {
  id: 'tp-1',
  userId: 'user-1',
  region: 'br',
  nameKey: 'player one',
  tagKey: 'br1',
  displayName: 'Player One',
  createdAt: new Date('2026-10-01T00:00:00.000Z'),
};

describe('DashboardContent (conteúdo dinâmico)', () => {
  it('redireciona para /login sem sessão', async () => {
    mocks.getSession.mockResolvedValueOnce(null);

    await expect(DashboardContent()).rejects.toThrow(/login/i);
  });

  it('renderiza o grid de jogadores seguidos com link e unfollow', async () => {
    mocks.getSession.mockResolvedValueOnce({
      user: { id: 'user-1', name: 'U', email: null, image: null },
    });
    mocks.listByUser.mockResolvedValueOnce([trackedPlayer]);

    const html = renderToStaticMarkup(await DashboardContent());

    expect(html).toContain('data-dashboard-page');
    expect(html).toContain('Player One');
    expect(html).toContain('#br1');
    expect(html).toContain('/players/br/player%20one/br1');
    expect(html).toContain('Deixar de seguir');
    expect(html).toContain('Configurações');
  });

  it('estado vazio quando o usuário não segue ninguém', async () => {
    mocks.getSession.mockResolvedValueOnce({
      user: { id: 'user-1', name: 'U', email: null, image: null },
    });
    mocks.listByUser.mockResolvedValueOnce([]);

    const html = renderToStaticMarkup(await DashboardContent());

    expect(html).toContain('Nenhum jogador seguido');
  });
});
