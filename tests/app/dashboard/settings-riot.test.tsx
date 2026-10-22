import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * SUITE TDD — Card "Conta Riot" das settings sobre o RSO simulado: sem
 * vínculo ou legado → "Entrar com Riot" (GET /api/rso/authorize?region=);
 * vinculado via RSO → conta, toggle de perfil público e desvincular;
 * mensagens de retorno do callback (`?rso=`).
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
  setProfilePublic: vi.fn(async () => ({ ok: true })),
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

const rsoRow = {
  id: '0f0e0d0c-1111-4222-8333-444455556666',
  userId: 'user-1',
  region: 'br',
  nameKey: 'kairo4821',
  tagKey: 'br1',
  displayName: 'Kairo4821',
  puuid: 'puuid-1',
  linkedVia: 'rso_mock',
  profilePublic: true,
  createdAt: new Date('2026-10-01T00:00:00.000Z'),
  updatedAt: new Date('2026-10-02T00:00:00.000Z'),
};

async function render(row: unknown, params: Record<string, string> = {}): Promise<string> {
  mocks.getSession.mockResolvedValueOnce(session);
  mocks.riotGet.mockResolvedValueOnce(row);
  return renderToStaticMarkup(await SettingsContent({ searchParams: Promise.resolve(params) }));
}

describe('SettingsContent — Card Conta Riot', () => {
  it('vinculado via RSO: conta, toggle de perfil público marcado e desvincular', async () => {
    const html = await render(rsoRow);

    expect(html).toContain('BR');
    expect(html).toContain('Kairo4821');
    expect(html).toContain('#br1');
    expect(html).toContain('Tornar meu perfil público');
    expect(html).toMatch(/<input[^>]*type="checkbox"[^>]*checked=""/);
    expect(html).toContain('Desvincular conta Riot');
    expect(html).not.toContain('Entrar com Riot');
    expect(mocks.riotGet).toHaveBeenCalledWith('user-1');
  });

  it('sem vínculo: "Entrar com Riot" via GET /api/rso/authorize com select de região', async () => {
    const html = await render(null);

    expect(html).toContain('action="/api/rso/authorize"');
    expect(html).toContain('method="get"');
    expect(html).toContain('name="region"');
    for (const affinity of ['br', 'latam', 'na', 'eu', 'ap', 'kr']) {
      expect(html).toContain(`value="${affinity}"`);
    }
    expect(html).toContain('Entrar com Riot');
    expect(html).not.toContain('Tornar meu perfil público');
    expect(html).not.toContain('Desvincular');
    // O formulário de digitar Riot ID saiu.
    expect(html).not.toContain('data-search-bar');
  });

  it('vínculo legado: pede reconexão via Riot, sem toggle', async () => {
    const html = await render({ ...rsoRow, linkedVia: 'legacy', puuid: null, profilePublic: false });

    expect(html).toContain('Entrar com Riot');
    expect(html).toContain('Reconecte com Riot');
    expect(html).not.toContain('Tornar meu perfil público');
  });

  it.each([
    ['linked', 'Conta Riot conectada.'],
    ['denied', 'Autorização negada. Nada foi gravado.'],
    ['error', 'Não foi possível conectar a conta Riot. Tente novamente.'],
  ])('mostra a mensagem de ?rso=%s', async (rso, message) => {
    const html = await render(null, { rso });

    expect(html).toContain(message);
  });

  it('ignora ?rso= desconhecido', async () => {
    const html = await render(null, { rso: 'x' });

    expect(html).not.toContain('data-rso-status');
  });
});
