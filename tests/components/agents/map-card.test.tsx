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

  it('exibe barras ATK/DEF', () => {
    const html = renderToStaticMarkup(
      <MapCard {...BASE} status="stable" statusLabel="Estável" />,
    );
    expect(html).toContain('ATK 64%');
    expect(html).toContain('DEF 80%');
    expect(html).toContain('width:64%');
    expect(html).toContain('width:80%');
  });

  it('sem split ATK/DEF usa a barra única de win rate', () => {
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
    expect(html).not.toContain('ATK 64%');
    expect(html).toContain('WR 72%');
    expect(html).toContain('width:72%');
  });

  it('sem nenhuma métrica de barra renderiza só o rodapé de partidas', () => {
    const html = renderToStaticMarkup(
      <MapCard
        {...BASE}
        attackPercent={undefined}
        defensePercent={undefined}
        status="neutral"
        statusLabel="Neutro"
      />,
    );
    expect(html).not.toContain('role="meter"');
  });

  it('sem imagem mostra sigla do mapa', () => {
    const html = renderToStaticMarkup(
      <MapCard {...BASE} status="neutral" statusLabel="Neutro" />,
    );
    expect(html).toContain('As');
  });
});
