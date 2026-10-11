import { describe, expect, it } from 'vitest';
import {
  computePerformanceRating,
  RATING_BASELINES,
  RATING_WEIGHTS,
} from '@/services/analytics/rating';

/**
 * SUITE TDD — Rating ValCoach: métrica composta documentada. Um jogador na
 * média de todas as dimensões recebe 1.00; componentes ausentes são omitidos
 * com renormalização dos pesos (nada de preencher com zero).
 */

describe('computePerformanceRating', () => {
  it('devolve 1.00 quando todas as dimensões estão na referência', () => {
    const rating = computePerformanceRating({
      kills: 70,
      deaths: 50,
      assists: 25,
      rounds: 100,
      firstKills: 13,
      kastPercentage: 70,
    });
    expect(rating).toBe(1);
  });

  it('omite KAST e first kills ausentes e renormaliza os pesos', () => {
    const rating = computePerformanceRating({
      kills: 7,
      deaths: 5,
      assists: 2.5,
      rounds: 10,
      firstKills: null,
      kastPercentage: null,
    });
    // KPR/APR/survival na referência → 1.00 mesmo com 3 dimensões.
    expect(rating).toBe(1);
  });

  it('trata KAST/first kills undefined como ausentes', () => {
    const rating = computePerformanceRating({
      kills: 7,
      deaths: 5,
      assists: 2.5,
      rounds: 10,
      firstKills: undefined,
      kastPercentage: undefined,
    });
    expect(rating).toBe(1);
  });

  it('premia desempenho acima da média com rating > 1', () => {
    const rating = computePerformanceRating({
      kills: 26,
      deaths: 13,
      assists: 4,
      rounds: 22,
      firstKills: 4,
      kastPercentage: 81.8,
    });
    expect(rating).not.toBeNull();
    expect(rating as number).toBeGreaterThan(1.2);
  });

  it('nunca fica negativo quando as mortes superam os rounds', () => {
    const rating = computePerformanceRating({
      kills: 0,
      deaths: 30,
      assists: 0,
      rounds: 10,
    });
    expect(rating).not.toBeNull();
    expect(rating as number).toBeGreaterThanOrEqual(0);
  });

  it('devolve null sem rounds válidos', () => {
    expect(
      computePerformanceRating({ kills: 1, deaths: 1, assists: 0, rounds: 0 }),
    ).toBeNull();
    expect(
      computePerformanceRating({ kills: 1, deaths: 1, assists: 0, rounds: Number.NaN }),
    ).toBeNull();
  });
});

describe('referências e pesos', () => {
  it('mantém os pesos somando 1 (quando há todas as dimensões)', () => {
    const total =
      RATING_WEIGHTS.kill +
      RATING_WEIGHTS.assist +
      RATING_WEIGHTS.survival +
      RATING_WEIGHTS.kast +
      RATING_WEIGHTS.entry;
    expect(total).toBeCloseTo(1);
    expect(RATING_BASELINES.kpr).toBeGreaterThan(0);
  });
});
