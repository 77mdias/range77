import { describe, expect, it } from 'vitest';
import {
  applySortClick,
  displayKda,
  nextSortMode,
  sortScoreboardRows,
  type ScoreboardSortRow,
} from '@/services/analytics/scoreboard-sort';

/**
 * SUITE TDD — ordenação pura da tabela telemétrica (100% de cobertura):
 * ciclo best→worst→auto, valores ausentes sempre no fim e empate por nome.
 */

function row(overrides: Partial<ScoreboardSortRow> & Pick<ScoreboardSortRow, 'name'>): ScoreboardSortRow {
  return {
    acs: 200,
    kills: 10,
    deaths: 20,
    assists: 10,
    kdDiff: -10,
    ...overrides,
  };
}

const ROWS: readonly ScoreboardSortRow[] = [
  row({
    name: 'Alpha',
    acs: 300,
    kills: 24,
    deaths: 12,
    assists: 6,
    kdDiff: 12,
    adr: 180,
    hsPercentage: 30,
    kastPercentage: 75,
    firstBloods: 5,
    firstDeaths: 2,
    econRating: 80,
  }),
  row({ name: 'Bravo', acs: 200 }), // adr/hs/kast/fkfd/econ ausentes
  row({
    name: 'Charlie',
    acs: 250,
    kills: 15,
    deaths: 15,
    assists: 5,
    kdDiff: 0,
    adr: 140,
    hsPercentage: 20,
    kastPercentage: 60,
    firstBloods: 2,
    firstDeaths: 3,
    econRating: 70,
  }),
];

const names = (rows: readonly ScoreboardSortRow[]): string[] => rows.map((r) => r.name);

describe('displayKda', () => {
  it('divide (K+A) por D; deaths=0 devolve K+A (nunca Infinity)', () => {
    expect(displayKda(24, 12, 6)).toBeCloseTo(2.5, 6);
    expect(displayKda(24, 0, 6)).toBe(30);
  });
});

describe('nextSortMode', () => {
  it('cicla best → worst → auto → best', () => {
    expect(nextSortMode('best')).toBe('worst');
    expect(nextSortMode('worst')).toBe('auto');
    expect(nextSortMode('auto')).toBe('best');
  });
});

describe('applySortClick', () => {
  it('sem estado ou outra coluna reinicia em "melhores"', () => {
    expect(applySortClick(null, 'acs')).toEqual({ key: 'acs', mode: 'best' });
    expect(applySortClick({ key: 'acs', mode: 'best' }, 'adr')).toEqual({
      key: 'adr',
      mode: 'best',
    });
  });

  it('na mesma coluna avança o ciclo', () => {
    expect(applySortClick({ key: 'acs', mode: 'best' }, 'acs')).toEqual({
      key: 'acs',
      mode: 'worst',
    });
    expect(applySortClick({ key: 'acs', mode: 'worst' }, 'acs')).toEqual({
      key: 'acs',
      mode: 'auto',
    });
    expect(applySortClick({ key: 'acs', mode: 'auto' }, 'acs')).toEqual({
      key: 'acs',
      mode: 'best',
    });
  });
});

describe('sortScoreboardRows', () => {
  it('modo automático preserva a ordem de entrada', () => {
    expect(names(sortScoreboardRows(ROWS, 'acs', 'auto'))).toEqual([
      'Alpha',
      'Bravo',
      'Charlie',
    ]);
  });

  it('ACS: melhores→piores e piores→melhores', () => {
    expect(names(sortScoreboardRows(ROWS, 'acs', 'best'))).toEqual([
      'Alpha',
      'Charlie',
      'Bravo',
    ]);
    expect(names(sortScoreboardRows(ROWS, 'acs', 'worst'))).toEqual([
      'Bravo',
      'Charlie',
      'Alpha',
    ]);
  });

  it('cobre cada coluna ordenável', () => {
    // kda: Alpha 2.5 > Charlie 1.33 > Bravo 1.0
    expect(names(sortScoreboardRows(ROWS, 'kda', 'best'))[0]).toBe('Alpha');
    // diff: 12 > 0 > -10
    expect(names(sortScoreboardRows(ROWS, 'diff', 'best'))).toEqual([
      'Alpha',
      'Charlie',
      'Bravo',
    ]);
    // adr/hs/kast/econ: Bravo ausente → último nos dois sentidos
    for (const key of ['adr', 'hs', 'kast', 'econ'] as const) {
      expect(names(sortScoreboardRows(ROWS, key, 'best')).at(-1)).toBe('Bravo');
      expect(names(sortScoreboardRows(ROWS, key, 'worst')).at(-1)).toBe('Bravo');
    }
    // fkfd: firstBloods 5 > 2 > ausente
    expect(names(sortScoreboardRows(ROWS, 'fkfd', 'best'))).toEqual([
      'Alpha',
      'Charlie',
      'Bravo',
    ]);
  });

  it('empate desempata pelo nome (ascendente) e não muta a entrada', () => {
    const tied: readonly ScoreboardSortRow[] = [
      row({ name: 'Zulu', acs: 200 }),
      row({ name: 'Alfa', acs: 200 }),
    ];
    expect(names(sortScoreboardRows(tied, 'acs', 'best'))).toEqual(['Alfa', 'Zulu']);
    expect(names(sortScoreboardRows(tied, 'acs', 'worst'))).toEqual(['Alfa', 'Zulu']);
    expect(tied.map((r) => r.name)).toEqual(['Zulu', 'Alfa']);
  });
});
