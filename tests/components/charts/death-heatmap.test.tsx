import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DeathHeatmap } from '@/components/charts';

const grid = (): number[][] => Array.from({ length: 16 }, () => new Array<number>(16).fill(0));

describe('DeathHeatmap', () => {
  it('grade 16×16 → 256 células, intensidade proporcional ao máximo', () => {
    const g = grid();
    g[2]![3] = 4;
    g[10]![7] = 2;
    const html = renderToStaticMarkup(
      <DeathHeatmap grid={g} mapName="Ascent" minimapSrc="/assets/images/minimaps/ascent.png" />,
    );
    expect(html.match(/data-cell=/g)).toHaveLength(256);
    expect(html).toContain('src="/assets/images/minimaps/ascent.png"');
    const opacity = (count: number) =>
      Number(new RegExp(`data-count="${count}"[^>]*fill-opacity="([\\d.]+)"`).exec(html)![1]);
    expect(opacity(4)).toBeCloseTo(2 * opacity(2), 5);
    expect(opacity(4)).toBeGreaterThan(opacity(2));
    expect(opacity(0)).toBe(0);
    // <title> como string única (React 19).
    expect(html).toContain('<title>4 mortes</title>');
    expect(html).toContain('6 mortes em Ascent');
  });

  it('sem mortes: legenda de vazio, células transparentes', () => {
    const html = renderToStaticMarkup(
      <DeathHeatmap grid={grid()} mapName="Bind" minimapSrc="/x.png" />,
    );
    expect(html.match(/data-cell=/g)).toHaveLength(256);
    expect(html).toContain('Nenhuma morte registrada em Bind');
  });
});
