import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * SUITE TDD — página /login (Server Component assíncrono). O auth-client é
 * mockado (o fluxo OAuth real é validado pelo dono em dev com credenciais).
 * Layout: grid 12 col, telemetria à esquerda (col-span-5) e terminal de
 * acesso à direita (col-span-7) — Stitch tela 7.
 */

vi.mock('@/lib/auth-client', () => ({
  authClient: { signIn: { social: vi.fn(async () => ({ error: null })) } },
}));

vi.mock('next/navigation', () => ({ usePathname: () => '/login' }));

import AuthLayout from '@/app/(auth)/layout';
import LoginPage from '@/app/(auth)/login/page';

const render = async (next?: string): Promise<string> => {
  const element = await LoginPage({
    searchParams: Promise.resolve(next === undefined ? {} : { next }),
  });
  // O Stitch desenha o switcher duas vezes na tela 7: no header (que vive no
  // layout do route group) e dentro do terminal. Renderizar a página DENTRO
  // do layout é a unidade real que o usuário vê — e permite contar as duas.
  return renderToStaticMarkup(<AuthLayout>{element}</AuthLayout>);
};

describe('LoginPage', () => {
  it('preserva os ganchos data-* que as navegações anteriores usavam', async () => {
    const html = await render();
    expect(html).toContain('data-login-page');
    expect(html).toContain('data-social-login');
    expect(html).toContain('data-email-login');
  });

  it('renderiza o chrome de telemetria da tela 7', async () => {
    const html = await render();
    expect(html).toContain('GATEWAY: SA-BRAZIL-EAST-1 // SECURE ROUTE');
    expect(html).toContain('AUTH ENGINE: HYDRA-V4.2');
    expect(html).toContain('TLS 1.3 VERIFIED');
    expect(html).toContain('RTT LATENCY');
    expect(html).toContain('1.2M+');
    expect(html).toContain('AI CONFIDENCE');
    expect(html).toContain('99.4%');
    expect(html).toContain('NODE: SA-BR-01');
  });

  it('renderiza o terminal de acesso com protocolo, SSO e RSO', async () => {
    const html = await render();
    expect(html).toContain('data-auth-terminal');
    expect(html).toContain('// PROTOCOLO DE ACESSO // VALORANT.COACH TELEMETRY PIPELINE');
    expect(html).toContain('PORT: 443');
    expect(html).toContain('ACESSO AO HUB TELEMÉTRICO');
    expect(html).toContain('Continuar com Google');
    expect(html).toContain('Continuar com Discord');
    expect(html).toContain('COMMUNITY');
    expect(html).toContain('Riot Games Sign-On (RSO) - Oficial');
    expect(html).toContain('[AGUARDANDO KEY PROD RIOT V9]');
    expect(html).toContain('OU ACESSE COM E-MAIL E SENHA');
  });

  it('mostra o switcher nas duas posições que o Stitch desenha', async () => {
    const html = await render();
    expect(html.match(/data-auth-tabs/g)?.length).toBe(2);
  });

  it('usa o label honesto do campo de identificador (só e-mail)', async () => {
    const html = await render();
    expect(html).toContain('E-mail');
    expect(html).not.toContain('E-mail ou Riot ID associado');
  });

  it('preserva o ?next= do proxy sem quebrar', async () => {
    expect(await render('/players/br/tenz/0001')).toContain('data-login-page');
  });

  it('ocupa 100% da largura da tela (sem cap max-w-7xl)', async () => {
    const html = await render();
    expect(html).toContain('w-full');
    expect(html).not.toContain('max-w-7xl');
  });
});
