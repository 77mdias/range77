import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RoundTimeline, type RoundCellData } from '@/components/match';

const ROUNDS: readonly RoundCellData[] = [
  { number: 1, outcome: 'win-defense', economy: 'pistol' },
  { number: 2, outcome: 'win-attack', economy: 'buy' },
  { number: 3, outcome: 'loss', economy: 'eco', flagged: true },
];

describe('RoundTimeline', () => {
  it('renderiza legenda e células com outcome/economia', () => {
    const html = renderToStaticMarkup(<RoundTimeline rounds={ROUNDS} />);
    expect(html).toContain('data-component="round-timeline"');
    expect(html).toContain('Diagnóstico IA');
    expect(html).toContain('PISTOL');
    expect(html).toContain('ECO');
    expect(html).toContain('3 rounds');
  });

  it('célula marcada ganha borda vermelha e asterisco', () => {
    const html = renderToStaticMarkup(<RoundTimeline rounds={ROUNDS} />);
    expect(html).toContain('data-flagged=""');
    expect(html).toContain('border-loss');
  });

  it('sem rounds não renderiza nada', () => {
    expect(renderToStaticMarkup(<RoundTimeline rounds={[]} />)).toBe('');
  });
});
