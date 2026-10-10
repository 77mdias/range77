import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TopNav } from '@/components/layout/top-nav';

const ITEMS = [
  { href: '/', label: 'Visão geral' },
  { href: '/matches', label: 'Partidas' },
];

describe('TopNav', () => {
  it('renderiza marca, abas e status pill', () => {
    const html = renderToStaticMarkup(
      <TopNav items={ITEMS} activeHref="/" statusText="API Pipeline: Active" />,
    );
    expect(html).toContain('data-component="top-nav"');
    expect(html).toContain('ValCoach');
    expect(html).toContain('API Pipeline: Active');
    expect(html).toContain('Visão geral');
  });

  it('marca o item ativo com acento e aria-current', () => {
    const html = renderToStaticMarkup(<TopNav items={ITEMS} activeHref="/matches" />);
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('bg-accent');
  });

  it('omite a nav quando não há itens', () => {
    const html = renderToStaticMarkup(<TopNav items={[]} />);
    expect(html).not.toContain('data-top-nav-items');
  });
});
