import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RrTrendChart } from '@/components/charts';
import {
  buildRrAreaPath,
  buildRrLinePath,
  buildRrPoints,
  rrBaselineY,
} from '@/components/charts/rr-trend-geometry';

describe('rr-trend-geometry', () => {
  const series = [
    { rr: 0, result: 'win' as const },
    { rr: 50, result: 'loss' as const },
    { rr: 20, result: 'win' as const },
  ];

  it('buildRrPoints mapea série para o viewBox', () => {
    const points = buildRrPoints(series, 800, 160);
    expect(points).toHaveLength(3);
    expect(points[0]?.x).toBeLessThan(points[1]?.x ?? 0);
    // pico (50 RR) fica mais alto (menor y) que os extremos
    const peak = points[1];
    const zero = points[0];
    expect(peak === undefined || zero === undefined || peak.y < zero.y).toBe(true);
  });

  it('série vazia retorna vazio e baseline cai no meio', () => {
    expect(buildRrPoints([], 100, 100)).toEqual([]);
    expect(rrBaselineY([], 100)).toBe(50);
  });

  it('série com valor único centraliza o ponto', () => {
    const points = buildRrPoints([{ rr: 10, result: 'win' }], 200, 100);
    expect(points[0]?.x).toBe(100);
  });

  it('paths de linha e área são gerados e fechados', () => {
    const points = buildRrPoints(series, 800, 160);
    const line = buildRrLinePath(points);
    expect(line.startsWith('M')).toBe(true);
    const area = buildRrAreaPath(points, 800, 100);
    expect(area.endsWith('Z')).toBe(true);
    expect(buildRrAreaPath([], 800, 100)).toBe('');
  });

  it('threshold do 0 RR fica entre min e max', () => {
    const points = buildRrPoints(series, 800, 160);
    const baseline = rrBaselineY(points, 160);
    const ys = points.map((point) => point.y);
    expect(baseline).toBeLessThanOrEqual(Math.max(...ys));
    expect(baseline).toBeGreaterThanOrEqual(Math.min(...ys));
  });
});

describe('RrTrendChart', () => {
  it('renderiza SVG com gradiente e dots de resultado', () => {
    const html = renderToStaticMarkup(
      <RrTrendChart
        series={[
          { rr: 0, result: 'win' },
          { rr: 34, result: 'win' },
          { rr: 12, result: 'loss' },
        ]}
      />,
    );
    expect(html).toContain('data-chart="rr-trend"');
    expect(html).toContain('rr-trend-fill');
    expect(html).toContain('stroke-dasharray="3 3"');
  });

  it('série vazia renderiza estado vazio', () => {
    const html = renderToStaticMarkup(<RrTrendChart series={[]} />);
    expect(html).toContain('data-chart="rr-trend-empty"');
  });
});
