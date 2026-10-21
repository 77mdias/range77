import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TopNav } from '@/components/layout/top-nav';

/**
 * SUITE — TopNav (header global, pixel-fiel ao Stitch "Protocol Precision"):
 * barra fixa opaca com hairline preta, marca + status pill, abas full-height
 * com divisórias e ativa em acento + border-b-2, e cluster de ações (busca
 * rápida, notificações, perfil com divisória vertical).
 */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
}));

const ITEMS = [
  { href: '/', label: 'Visão geral' },
  { href: '/matches', label: 'Partidas' },
];

describe('TopNav', () => {
  it('renderiza marca, abas e status pill (estrutura Stitch)', () => {
    const html = renderToStaticMarkup(
      <TopNav items={ITEMS} activeHref="/" statusText="API Pipeline: Active (3-Layer Mode)" />,
    );
    expect(html).toContain('data-component="top-nav"');
    expect(html).toContain('data-brand-logo');
    expect(html).toContain('logo-accent.png');
    expect(html).toContain('API Pipeline: Active (3-Layer Mode)');
    expect(html).toContain('Visão geral');
  });

  it('header é FIXO, opaco e acima do conteúdo (sem sticky/blur)', () => {
    const html = renderToStaticMarkup(<TopNav items={ITEMS} />);
    expect(html).toContain('fixed inset-x-0 top-0 z-50');
    expect(html).toContain('bg-surface');
    expect(html).not.toContain('sticky');
    expect(html).not.toContain('backdrop-blur');
  });

  it('marca o item ativo com acento, border-b-2 e aria-current', () => {
    const html = renderToStaticMarkup(<TopNav items={ITEMS} activeHref="/matches" />);
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('bg-accent');
    expect(html).toContain('border-b-2');
  });

  it('abas têm divisória vertical em todas (inclusive a última)', () => {
    const html = renderToStaticMarkup(<TopNav items={ITEMS} />);
    const nav = html.slice(html.indexOf('data-top-nav-items'));
    expect(nav.match(/border-r border-line/g)?.length).toBe(ITEMS.length);
  });

  it('omite a nav quando não há itens', () => {
    const html = renderToStaticMarkup(<TopNav items={[]} />);
    expect(html).not.toContain('data-top-nav-items');
  });

  it('cluster de ações: busca rápida, notificações e slot de perfil com divisória', () => {
    const html = renderToStaticMarkup(<TopNav items={ITEMS} user={<span>PERFIL</span>} />);
    expect(html).toContain('data-nav-search');
    expect(html).toContain('data-nav-bell');
    expect(html).toContain('data-nav-profile-slot');
    expect(html).toContain('PERFIL');
    expect(html).toContain('aria-label="Notificações"');
  });
});
