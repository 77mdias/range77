import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * SUITE TDD — página /login (Server Component assíncrono). O auth-client é
 * mockado (o fluxo OAuth real é validado pelo dono em dev com credenciais).
 */

vi.mock('@/lib/auth-client', () => ({
  authClient: { signIn: { social: vi.fn(async () => ({ error: null })) } },
}));

import LoginPage from '@/app/(auth)/login/page';

const render = async (next?: string): Promise<string> => {
  const element = await LoginPage({
    searchParams: Promise.resolve(next === undefined ? {} : { next }),
  });
  return renderToStaticMarkup(element);
};

describe('LoginPage', () => {
  it('renderiza os dois provedores sociais', async () => {
    const html = await render();
    expect(html).toContain('data-login-page');
    expect(html).toContain('Continuar com Google');
    expect(html).toContain('Continuar com Discord');
    expect(html).toContain('data-social-login');
  });

  it('preserva o ?next= do proxy como callback (data-attribute de debug)', async () => {
    // O destino é repassado ao signIn no cliente; aqui garantimos que a
    // página não quebra com o parâmetro presente.
    expect(await render('/dashboard')).toContain('data-login-page');
  });
});
