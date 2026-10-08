import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppShell } from '@/components/layout/app-shell';

/**
 * SUITE TDD — shell da aplicação: header sticky (logo tipográfico + nav),
 * slot de main para páginas, footer discreto e slot futuro de usuário.
 */

const renderShell = (user?: React.ReactNode) =>
  renderToStaticMarkup(<AppShell user={user}>CONTEUDO</AppShell>);

describe('AppShell', () => {
  it('renderiza header com o logo tipográfico VALCOACH', () => {
    const html = renderShell();
    expect(html).toContain('<header');
    expect(html).toContain('VALCOACH');
  });

  it('renderiza nav com o link Tracker apontando para a home', () => {
    const html = renderShell();
    expect(html).toContain('<nav');
    expect(html).toContain('href="/"');
    expect(html).toContain('Tracker');
  });

  it('renderiza o children dentro de main', () => {
    expect(renderShell()).toContain('<main');
    expect(renderShell()).toContain('CONTEUDO');
  });

  it('renderiza footer com disclaimer (não afiliado à Riot Games)', () => {
    const html = renderShell();
    expect(html).toContain('<footer');
    expect(html).toContain('Riot Games');
  });

  it('renderiza o slot de usuário no header quando fornecido', () => {
    expect(renderShell(<span aria-label="Usuário">USER-SLOT</span>)).toContain('USER-SLOT');
  });
});
