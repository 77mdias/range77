import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * SUITE TDD — /dashboard/settings (protegida): perfil do provedor + logout.
 */

const mocks = vi.hoisted(() => ({ getSession: vi.fn() }));

vi.mock('@/lib/session', () => ({ getSession: mocks.getSession }));
vi.mock('@/lib/db/user-riot-store', () => ({
  getUserRiotStore: () => ({ get: async () => null }),
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

describe('SettingsContent (conteúdo dinâmico)', () => {
  it('redireciona para /login sem sessão', async () => {
    mocks.getSession.mockResolvedValueOnce(null);

    await expect(SettingsContent({ searchParams: Promise.resolve({}) })).rejects.toThrow(/login/i);
  });

  it('renderiza nome, email e logout (com avatar do provedor)', async () => {
    mocks.getSession.mockResolvedValueOnce({
      user: { id: 'user-1', name: 'Jane', email: 'jane@x.com', image: 'https://cdn/x.png' },
    });

    const html = renderToStaticMarkup(await SettingsContent({ searchParams: Promise.resolve({}) }));

    expect(html).toContain('data-settings-page');
    expect(html).toContain('Jane');
    expect(html).toContain('jane@x.com');
    expect(html).toContain('https://cdn/x.png');
    expect(html).toContain('Sair');
  });

  it('usa a inicial como avatar quando o provedor não envia imagem', async () => {
    mocks.getSession.mockResolvedValueOnce({
      user: { id: 'user-1', name: 'Bob', email: null, image: null },
    });

    const html = renderToStaticMarkup(await SettingsContent({ searchParams: Promise.resolve({}) }));

    expect(html).toContain('>B<');
    expect(html).toContain('—'); // email ausente
  });
});
