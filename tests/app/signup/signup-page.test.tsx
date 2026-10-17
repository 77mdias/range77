import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * SUITE TDD — página /signup (Server Component assíncrono). O auth-client é
 * mockado (o fluxo real de persistência é validado pelo dono em dev).
 */

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    signIn: { email: vi.fn(async () => ({ error: null })) },
    signUp: { email: vi.fn(async () => ({ error: null })) },
  },
}));

import SignupPage from '@/app/(auth)/signup/page';

const render = async (next?: string): Promise<string> => {
  const element = await SignupPage({
    searchParams: Promise.resolve(next === undefined ? {} : { next }),
  });
  return renderToStaticMarkup(element);
};

describe('SignupPage', () => {
  it('renderiza o formulário de cadastro manual', async () => {
    const html = await render();
    expect(html).toContain('data-signup-page');
    expect(html).toContain('data-signup-form');
    expect(html).toContain('Criar conta');
  });

  it('linka para o /login (contas existentes)', async () => {
    const html = await render();
    expect(html).toContain('href="/login"');
  });

  it('não quebra com o parâmetro ?next= presente', async () => {
    expect(await render('/dashboard')).toContain('data-signup-page');
  });
});
