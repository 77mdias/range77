import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapCard } from '@/components/agents';

const BASE = {
  map: 'Ascent',
  winRate: '72%',
  matches: 18,
  record: { wins: 13, losses: 5 },
  attackPercent: 64,
  defensePercent: 80,
};

describe('MapCard', () => {
  it('status best usa chip acento e WR destacado', () => {
    const html = renderToStaticMarkup(
      <MapCard {...BASE} status="best" statusLabel="Melhor mapa" />,
    );
    expect(html).toContain('data-component="map-card"');
    expect(html).toContain('data-status="best"');
    expect(html).toContain('Melhor mapa');
    expect(html).toContain('13V');
  });

  it('status worst ganha anel vermelho', () => {
    const html = renderToStaticMarkup(
      <MapCard {...BASE} status="worst" statusLabel="Pior mapa" />,
    );
    expect(html).toContain('ring-loss/50');
    expect(html).toContain('Pior mapa');
  });

  it('chips intermediários usam badge claro com tinta preta/cinza', () => {
    const good = renderToStaticMarkup(<MapCard {...BASE} status="good" statusLabel="Positivo" />);
    expect(good).toContain('bg-surface text-text-primary');
    expect(good).not.toContain('bg-win/15');

    const neutral = renderToStaticMarkup(<MapCard {...BASE} status="neutral" statusLabel="Neutro" />);
    expect(neutral).toContain('bg-surface text-text-secondary');

    const unfavorable = renderToStaticMarkup(
      <MapCard {...BASE} status="unfavorable" statusLabel="Desfavorável" />,
    );
    expect(unfavorable).toContain('bg-surface-highest text-text-secondary');
    expect(unfavorable).not.toContain('bg-loss/10');
  });

  it('MELHOR/PIOR mantêm os acentos (amarelo/vermelho)', () => {
    expect(
      renderToStaticMarkup(<MapCard {...BASE} status="best" statusLabel="Melhor mapa" />),
    ).toContain('bg-accent text-text-primary');
    expect(
      renderToStaticMarkup(<MapCard {...BASE} status="worst" statusLabel="Pior mapa" />),
    ).toContain('bg-loss text-surface');
  });

  it('mostra WR real de DEF (esquerda) e ATK (direita) sob a barra de WR geral', () => {
    const html = renderToStaticMarkup(
      <MapCard {...BASE} winPercent={72} status="best" statusLabel="Melhor mapa" />,
    );
    expect(html).toContain('DEF');
    expect(html).toContain('80%');
    expect(html).toContain('ATK');
    expect(html).toContain('64%');
    expect(html).toContain('width:72%');
    expect(html.indexOf('DEF')).toBeLessThan(html.indexOf('ATK'));
  });

  it('sem split DEF/ATK mostra travessão no lugar do percentual', () => {
    const html = renderToStaticMarkup(
      <MapCard
        {...BASE}
        attackPercent={undefined}
        defensePercent={undefined}
        winPercent={72}
        status="best"
        statusLabel="Melhor mapa"
      />,
    );
    expect(html).not.toContain('80%');
    expect(html).not.toContain('64%');
    expect(html).toContain('width:72%');
    expect(html).toContain('DEF');
    expect(html).toContain('ATK');
    expect(html).toContain('—');
  });
});
