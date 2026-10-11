import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  RoundTimeline,
  type RoundCellData,
  type RoundSummaryData,
} from '@/components/match';

const ROUNDS: readonly RoundCellData[] = [
  { number: 1, won: true, side: 'defense', kind: 'elim', pistol: true, score: '1-0' },
  { number: 2, won: false, side: 'defense', kind: 'plant', score: '1-1' },
  { number: 13, won: true, side: 'attack', kind: 'retake', score: '2-1' },
];

const SUMMARY: RoundSummaryData = {
  roundsWon: 2,
  roundsLost: 1,
  roundsTotal: 3,
  winPercent: 66.7,
  pistol: { won: 1, played: 1, percent: 100 },
};

describe('RoundTimeline', () => {
  it('renderiza legenda, tipos de encerramento e placar progressivo', () => {
    const html = renderToStaticMarkup(<RoundTimeline rounds={ROUNDS} />);
    expect(html).toContain('data-component="round-timeline"');
    expect(html).toContain('Vitória def');
    expect(html).toContain('Vitória atk');
    expect(html).toContain('ELIM');
    expect(html).toContain('PLNT');
    expect(html).toContain('RETK');
    expect(html).toContain('PIST');
    expect(html).toContain('1-0');
    expect(html).toContain('3 rounds');
  });

  it('colore vitória de ataque com acento e separa o 2º half', () => {
    const html = renderToStaticMarkup(<RoundTimeline rounds={ROUNDS} />);
    expect(html).toContain('bg-accent');
    expect(html).toContain('border-l-2');
    expect(html).toContain('data-round="13"');
  });

  it('renderiza o resumo agregado quando informado', () => {
    const html = renderToStaticMarkup(<RoundTimeline rounds={ROUNDS} summary={SUMMARY} />);
    expect(html).toContain('Conversão pistols');
    expect(html).toContain('1 / 1 (100%)');
    expect(html).toContain('2 / 3');
    expect(html).toContain('66.7%');
  });

  it('sem rounds não renderiza nada', () => {
    expect(renderToStaticMarkup(<RoundTimeline rounds={[]} />)).toBe('');
  });
});
