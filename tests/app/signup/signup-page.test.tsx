import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * SUITE TDD — página /signup (Server Component assíncrono). O auth-client é
 * mockado (o fluxo real de persistência é validado pelo dono em dev).
 */

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    signIn: { social: vi.fn(async () => ({ error: null })) },
    signUp: { email: vi.fn(async () => ({ error: null })) },
  },
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/signup',
  useRouter: () => ({ push: vi.fn() }),
}));

import AuthLayout from '@/app/(auth)/layout';
import SignupPage from '@/app/(auth)/signup/page';

const render = async (next?: string): Promise<string> => {
  const element = await SignupPage({
    searchParams: Promise.resolve(next === undefined ? {} : { next }),
  });
  // Mesma unidade do teste de /login: página dentro do layout do route group.
  return renderToStaticMarkup(<AuthLayout>{element}</AuthLayout>);
};

describe('SignupPage', () => {
  it('preserva os ganchos data-* de cadastro', async () => {
    const html = await render();
    expect(html).toContain('data-signup-page');
    expect(html).toContain('data-signup-form');
    expect(html).toContain('data-social-login');
  });

  it('renderiza a barra de status e o card de registro do Stitch', async () => {
    const html = await render();
    expect(html).toContain('SYS_ENV: PROD_GLOBAL // PROTOCOL_V4.2.1');
    expect(html).toContain('ZERO SCRIM LEAK CERTIFIED');
    expect(html).toContain('CADASTRO ABERTO');
    expect(html).toContain('NOVO OPERADOR TELEMÉTRICO');
    expect(html).toContain('HASH ID: REC_9942_NEW');
    expect(html).toContain('INICIALIZAR CONTA VALORANT.COACH');
    expect(html).toContain('OU PREENCHA O FORMULÁRIO DE REGISTRO');
  });

  it('renderiza a sidebar de ativação, latência e criptografia', async () => {
    const html = await render();
    expect(html).toContain('PROTOCOLO DE ATIVAÇÃO');
    expect(html).toContain('TIER // FREE VOD');
    expect(html).toContain('ANÁLISE DE ATÉ 20 PARTIDAS RECENTES');
    expect(html).toContain('TELEMETRIA DE LATÊNCIA DA API');
    expect(html).toContain('99.98% UP');
    expect(html).toContain('MIN: 4.2ms');
    expect(html).toContain('JÁ POSSUI UMA CONTA TELEMÉTRICA?');
    expect(html).toContain('CRIPTOGRAFIA DE ARQUIVOS VOD');
  });

  it('desenha o sparkline da latência da API', async () => {
    const html = await render();
    expect(html).toContain('data-sparkline');
  });

  it('linka para o /login', async () => {
    expect(await render()).toContain('href="/login"');
  });

  it('não quebra com o parâmetro ?next= presente', async () => {
    expect(await render('/dashboard')).toContain('data-signup-page');
  });

  it('ocupa 100% da largura da tela (sem cap max-w-7xl)', async () => {
    const html = await render();
    expect(html).toContain('w-full');
    expect(html).not.toContain('max-w-7xl');
  });
});
