import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  buildSparklinePath,
  Sparkline,
  sparklineTrend,
} from '@/components/ui/sparkline';

/**
 * SUITE TDD — Sparkline: geometria pura (path/tendência) + SVG.
 */

describe('sparklineTrend', () => {
  it('decide a tendência pelo último vs. primeiro ponto', () => {
    expect(sparklineTrend([1, 2, 3])).toBe('up');
    expect(sparklineTrend([3, 2, 1])).toBe('down');
    expect(sparklineTrend([2, 2, 2])).toBe('flat');
  });

  it('é flat com menos de 2 pontos', () => {
    expect(sparklineTrend([])).toBe('flat');
    expect(sparklineTrend([5])).toBe('flat');
  });
});

describe('buildSparklinePath', () => {
  it('normaliza os pontos no viewBox', () => {
    expect(buildSparklinePath([0, 10], 100, 20)).toBe('M 0 20 L 100 0');
  });

  it('desenha linha central quando todos os valores são iguais', () => {
    expect(buildSparklinePath([5, 5], 100, 20)).toBe('M 0 10 L 100 10');
  });

  it('retorna vazio com menos de 2 pontos ou dimensão inválida', () => {
    expect(buildSparklinePath([1], 100, 20)).toBe('');
    expect(buildSparklinePath([1, 2], 0, 20)).toBe('');
    expect(buildSparklinePath([1, 2], 100, 0)).toBe('');
  });
});

describe('Sparkline (SVG)', () => {
  it('colore por tendência de alta (win)', () => {
    const html = renderToStaticMarkup(<Sparkline points={[1, 2, 3]} />);
    expect(html).toContain('data-trend="up"');
    expect(html).toContain('stroke="var(--color-win)"');
    expect(html).toContain('d="M 0 32 L 60 16 L 120 0"');
  });

  it('colore por tendência de baixa (loss)', () => {
    const html = renderToStaticMarkup(<Sparkline points={[3, 2, 1]} />);
    expect(html).toContain('data-trend="down"');
    expect(html).toContain('stroke="var(--color-loss)"');
  });

  it('sem pontos não renderiza path', () => {
    const html = renderToStaticMarkup(<Sparkline points={[]} />);
    expect(html).not.toContain('<path');
  });
});
