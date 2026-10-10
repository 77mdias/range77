import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppShell } from '@/components/layout/app-shell';

/**
 * SUITE TDD — shell da aplicação: header global (TopNav com rota ativa
 * client), slot de main, footer de telemetria e slot de usuário.
 */

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn() }),
}));

const renderShell = (user?: React.ReactNode) =>
  renderToStaticMarkup(<AppShell user={user}>CONTEUDO</AppShell>);

describe('AppShell', () => {
  it('renderiza o header global com a marca ValCoach', () => {
    const html = renderShell();
    expect(html).toContain('data-component="top-nav"');
    expect(html).toContain('ValCoach');
  });

  it('renderiza a navegação com as rotas reais e a rota ativa', () => {
    const html = renderShell();
    expect(html).toContain('<nav');
    expect(html).toContain('href="/"');
    expect(html).toContain('Busca');
    expect(html).toContain('href="/dashboard"');
    expect(html).toContain('Dashboard');
    expect(html).toContain('aria-current="page"');
  });

  it('exibe o status do pipeline e o CTA de login sem sessão', () => {
    const html = renderShell();
    expect(html).toContain('Pipeline 3-layer: online');
    expect(html).toContain('href="/login"');
    expect(html).toContain('Entrar');
  });

  it('renderiza o children dentro de main', () => {
    const html = renderShell();
    expect(html).toContain('<main');
    expect(html).toContain('CONTEUDO');
  });

  it('renderiza o footer de telemetria com o disclaimer da Riot', () => {
    const html = renderShell();
    expect(html).toContain('data-component="app-footer"');
    expect(html).toContain('Riot Games');
  });

  it('renderiza o slot de usuário no header quando fornecido', () => {
    expect(renderShell(<span aria-label="Usuário">USER-SLOT</span>)).toContain('USER-SLOT');
  });
});
