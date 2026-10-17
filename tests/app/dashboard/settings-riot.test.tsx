import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * SUITE TDD — Card "Riot ID" das settings: com vínculo (região + Riot ID +
 * desvincular) e sem vínculo (formulário SearchBar para vincular).
 */

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  riotGet: vi.fn(),
}));

vi.mock('@/lib/session', () => ({ getSession: mocks.getSession }));
vi.mock('@/lib/db/user-riot-store', () => ({
  getUserRiotStore: () => ({ get: mocks.riotGet }),
}));
vi.mock('@/app/actions/user-riot', () => ({
  linkRiotAccount: vi.fn(async () => ({ ok: true })),
  unlinkRiotAccount: vi.fn(async () => ({ ok: true })),
}));
vi.mock('@/lib/auth-client', () => ({
  authClient: { signOut: vi.fn(async () => ({ success: true })) },
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  // Espelha o contrato real (erro de redirect do Next), com a URL na mensagem.
  redirect: (url: string): never => {
    throw new Error(`NEXT_REDIRECT: ${url}`);
  },
}));

import { SettingsContent } from '@/app/(app)/dashboard/settings/page';

const session = { user: { id: 'user-1', name: 'Jane', email: 'jane@x.com', image: null } };

const linkedRow = {
  id: '0f0e0d0c-1111-4222-8333-444455556666',
  userId: 'user-1',
  region: 'br',
  nameKey: 'player one',
  tagKey: 'br1',
  displayName: 'Player One',
  createdAt: new Date('2026-10-01T00:00:00.000Z'),
  updatedAt: new Date('2026-10-02T00:00:00.000Z'),
};

describe('SettingsContent — Card Riot ID', () => {
  it('mostra região e Riot ID vinculado com botão de desvincular', async () => {
    mocks.getSession.mockResolvedValueOnce(session);
    mocks.riotGet.mockResolvedValueOnce(linkedRow);

    const html = renderToStaticMarkup(await SettingsContent());

    expect(html).toContain('Riot ID');
    expect(html).toContain('BR');
    expect(html).toContain('Player One');
    expect(html).toContain('#br1');
    expect(html).toContain('Desvincular');
    expect(html).not.toContain('data-search-bar');
    expect(mocks.riotGet).toHaveBeenCalledWith('user-1');
  });

  it('mostra o formulário de vinculação (SearchBar) sem vínculo', async () => {
    mocks.getSession.mockResolvedValueOnce(session);
    mocks.riotGet.mockResolvedValueOnce(null);

    const html = renderToStaticMarkup(await SettingsContent());

    expect(html).toContain('Riot ID');
    expect(html).toContain('data-search-bar');
    expect(html).toContain('Nome#Tag');
    expect(html).toContain('Vincular');
    expect(html).not.toContain('Desvincular');
    expect(mocks.riotGet).toHaveBeenCalledWith('user-1');
  });
});
