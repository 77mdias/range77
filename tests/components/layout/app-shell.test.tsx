import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppShell } from '@/components/layout/app-shell';
import {
  resolveActiveHref,
  resolveNavItems,
} from '@/components/layout/app-top-nav';

/**
 * SUITE TDD — shell da aplicação: header global (TopNav com rota ativa
 * client), slot de main, footer de telemetria e slot de usuário. A navegação
 * é CONTEXTUAL ao jogador: dentro de `/players/...` as abas do Stitch apontam
 * para aquele jogador; fora, só as rotas globais reais.
 */

let mockPathname = '/';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
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

  it('fora de um contexto de jogador: apenas rotas globais reais', () => {
    mockPathname = '/';
    const html = renderShell();
    expect(html).toContain('<nav');
    expect(html).toContain('href="/"');
    expect(html).toContain('Busca');
    expect(html).toContain('href="/console"');
    expect(html).toContain('Console API &amp; IA');
    expect(html).toContain('aria-current="page"');
    // Sem jogador ativo, não há abas de jogador (nada inventado)
    expect(html).not.toContain('/dashboard');
  });

  it('dentro de /players: abas do Stitch apontam para o jogador buscado', () => {
    mockPathname = '/players/br/nexus/br1';
    const html = renderShell();
    expect(html).toContain('href="/players/br/nexus/br1"');
    expect(html).toContain('Visão Geral');
    expect(html).toContain('href="/players/br/nexus/br1/breakdown"');
    expect(html).toContain('Partidas &amp; Breakdown');
    expect(html).toContain('href="/players/br/nexus/br1/breakdown#agentes-mapas"');
    expect(html).toContain('Agentes &amp; Mapas');
    expect(html).toContain('href="/console"');
    expect(html).toContain('aria-current="page"');
  });

  it('resolveActiveHref prefere o prefixo mais longo e ignora o hash', () => {
    const items = resolveNavItems('/players/br/nexus/br1/breakdown');
    expect(resolveActiveHref(items, '/players/br/nexus/br1/breakdown')).toBe(
      '/players/br/nexus/br1/breakdown',
    );
    expect(resolveActiveHref(items, '/players/br/nexus/br1')).toBe('/players/br/nexus/br1');
  });

  it('exibe o status do pipeline e o CTA de login sem sessão', () => {
    mockPathname = '/';
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
