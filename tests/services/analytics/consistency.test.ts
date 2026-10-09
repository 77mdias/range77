import { describe, expect, it } from 'vitest';
import type { MatchCombatStats } from '@/contracts/henrikdev';
import { CombatMetricsError } from '@/services/analytics/combat';
import {
  buildConsistencyInsight,
  calculateAcsConsistency,
} from '@/services/analytics/consistency';

/**
 * SUITE TDD — consistência de ACS (services/analytics/consistency.ts).
 *
 * Escrita ANTES da implementação. Valores verificados à mão (desvio padrão
 * POPULACIONAL por partida de score/roundsPlayed, sem ponderação por rounds).
 * Cobre: CV com guarda average=0 → null, amostra < 2 → "Indeterminado",
 * todas as classes de estabilidade, omissão de chave no envelope e
 * validação fail-fast com índice/campo na mensagem.
 */

const baseMatch: MatchCombatStats = {
  kills: 20,
  deaths: 10,
  assists: 5,
  roundsPlayed: 20,
  headshots: 10,
  bodyshots: 20,
  legshots: 10,
  score: 4000, // ACS por partida = 200
};

const makeMatch = (overrides: Partial<MatchCombatStats> = {}): MatchCombatStats => ({
  ...baseMatch,
  ...overrides,
});

describe('calculateAcsConsistency', () => {
  it('ACS idêntico em 2 partidas → desvio 0, CV 0, "Muito estável"', () => {
    const metrics = calculateAcsConsistency([makeMatch(), makeMatch()]);

    expect(metrics).toEqual({
      average: 200,
      stdDeviation: 0,
      coefficientVariation: 0,
      classification: 'Muito estável',
      totals: { matches: 2 },
    });
  });

  it('oscilação média → "Estável" (ACS 130/200: média 165, desvio 35, CV 0.21)', () => {
    const metrics = calculateAcsConsistency([
      makeMatch({ score: 2600 }), // ACS 130
      makeMatch({ score: 4000 }), // ACS 200
    ]);

    expect(metrics).toEqual({
      average: 165,
      stdDeviation: 35,
      coefficientVariation: 0.21, // 35/165 = 0.2121… → 0.21
      classification: 'Estável',
      totals: { matches: 2 },
    });
  });

  it('oscilação alta em 5 partidas → "Volátil" (média 160, desvio 49, CV 0.31)', () => {
    const metrics = calculateAcsConsistency([
      makeMatch({ score: 4000 }),
      makeMatch({ score: 2000 }),
      makeMatch({ score: 4000 }),
      makeMatch({ score: 2000 }),
      makeMatch({ score: 4000 }),
    ]);

    expect(metrics).toEqual({
      average: 160,
      stdDeviation: 49, // sqrt(2400) = 48.989… → 49
      coefficientVariation: 0.31, // 48.989…/160 = 0.3061… → 0.31
      classification: 'Volátil',
      totals: { matches: 5 },
    });
  });

  it('desvio populacional NÃO ponderado por rounds (por partida)', () => {
    const metrics = calculateAcsConsistency([
      makeMatch({ roundsPlayed: 10, score: 2000 }), // ACS 200
      makeMatch({ roundsPlayed: 30, score: 6000 }), // ACS 200
    ]);

    expect(metrics.average).toBe(200);
    expect(metrics.stdDeviation).toBe(0);
  });

  it('amostra de 1 partida → classificação "Indeterminado" (mesmo com números definidos)', () => {
    const metrics = calculateAcsConsistency([makeMatch()]);

    expect(metrics).toEqual({
      average: 200,
      stdDeviation: 0,
      coefficientVariation: 0,
      classification: 'Indeterminado',
      totals: { matches: 1 },
    });
  });

  it('average=0 (todos os scores 0) → CV null e "Indeterminado" (guarda de divisão por zero)', () => {
    const metrics = calculateAcsConsistency([
      makeMatch({ score: 0 }),
      makeMatch({ score: 0 }),
    ]);

    expect(metrics.average).toBe(0);
    expect(metrics.stdDeviation).toBe(0);
    expect(metrics.coefficientVariation).toBeNull();
    expect(metrics.classification).toBe('Indeterminado');
  });

  it('rejeita entrada que não é array', () => {
    expect(() =>
      calculateAcsConsistency(null as unknown as readonly MatchCombatStats[]),
    ).toThrowError(/array/i);
  });

  it('rejeita amostra vazia', () => {
    expect(() => calculateAcsConsistency([])).toThrowError(CombatMetricsError);
    expect(() => calculateAcsConsistency([])).toThrowError(/Nenhuma partida/);
  });

  it.each([
    [{ roundsPlayed: 0 }, /Partida #0.*roundsPlayed/s],
    [{ score: -1 }, /Partida #0.*score/s],
  ] as const)('rejeita partida inválida %j com índice e campo citados', (overrides, pattern) => {
    expect(() => calculateAcsConsistency([makeMatch(overrides)])).toThrowError(pattern);
  });
});

describe('buildConsistencyInsight', () => {
  it('monta o envelope de 3 camadas para amostra volátil (5 partidas)', () => {
    const insight = buildConsistencyInsight([
      makeMatch({ score: 4000 }),
      makeMatch({ score: 2000 }),
      makeMatch({ score: 4000 }),
      makeMatch({ score: 2000 }),
      makeMatch({ score: 4000 }),
    ]);

    expect(insight.raw_metrics).toEqual({
      matches: 5,
      average: 160,
      stdDeviation: 49,
      coefficientVariation: 0.31,
    });
    expect(insight.contextual_rating).toEqual({
      average: 'Abaixo da Média',
      coefficientVariation: 'Abaixo da Média',
    });
    expect(insight.coaching_hooks.some((h) => /volátil/.test(h))).toBe(true);
    expect(insight.coaching_hooks.some((h) => /Amostra pequena/.test(h))).toBe(false);
  });

  it('amostra estável pequena → hook de amostra + hook "Muito estável"', () => {
    const insight = buildConsistencyInsight([makeMatch(), makeMatch()]);

    expect(insight.contextual_rating).toEqual({
      average: 'Na Média',
      coefficientVariation: 'Excelente',
    });
    expect(insight.coaching_hooks.some((h) => /muito estável/.test(h))).toBe(true);
    expect(insight.coaching_hooks.some((h) => /Amostra pequena.*2 partidas/.test(h))).toBe(true);
  });

  it('hook de "Estável" distinto do "Muito estável"', () => {
    const insight = buildConsistencyInsight([
      makeMatch({ score: 2600 }),
      makeMatch({ score: 4000 }),
    ]);

    expect(insight.coaching_hooks.some((h) => /Desempenho estável/.test(h))).toBe(true);
    expect(insight.coaching_hooks.some((h) => /muito estável/.test(h))).toBe(false);
  });

  it('partida única → hook de amostra insuficiente, sem hook de classificação', () => {
    const insight = buildConsistencyInsight([makeMatch()]);

    expect(insight.coaching_hooks.some((h) => /apenas 1 partida/.test(h))).toBe(true);
    expect(insight.coaching_hooks.some((h) => /Desempenho/.test(h))).toBe(false);
    expect(insight.raw_metrics.coefficientVariation).toBe(0);
  });

  it('average=0 → coefficientVariation omitido do envelope e hook de dados íntegros', () => {
    const insight = buildConsistencyInsight([makeMatch({ score: 0 }), makeMatch({ score: 0 })]);

    expect('coefficientVariation' in insight.raw_metrics).toBe(false);
    expect('coefficientVariation' in insight.contextual_rating).toBe(false);
    expect(insight.contextual_rating.average).toBe('Crítico');
    expect(insight.coaching_hooks.some((h) => /igual a zero/.test(h))).toBe(true);
  });

  it('propaga a validação de amostra vazia', () => {
    expect(() => buildConsistencyInsight([])).toThrowError(/Nenhuma partida/);
  });
});
