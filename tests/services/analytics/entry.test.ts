import { describe, expect, it } from 'vitest';
import type { MatchCombatStats } from '@/contracts/henrikdev';
import { CombatMetricsError } from '@/services/analytics/combat';
import {
  buildEntryInsight,
  calculateEntryAggressiveness,
} from '@/services/analytics/entry';

/**
 * SUITE TDD — agressividade de entrada (services/analytics/entry.ts).
 *
 * Escrita ANTES da implementação. Fixtures com valores conhecidos e
 * arredondamento verificado à mão. Cobre: agregação FB/FD, guardas de
 * divisão por zero (0/0 → null, FD=0 → convenção), amostra sem timeline
 * (chave omitida no envelope), todos os branches de classificação e
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
  score: 4000,
};

const makeMatch = (overrides: Partial<MatchCombatStats> = {}): MatchCombatStats => ({
  ...baseMatch,
  ...overrides,
});

describe('calculateEntryAggressiveness', () => {
  it('calcula tentativas, ratios e classifica uma partida (FB 3 / FD 7)', () => {
    const metrics = calculateEntryAggressiveness([
      makeMatch({ firstBloods: 3, firstDeaths: 7 }),
    ]);

    expect(metrics).toEqual({
      attempts: 10,
      firstBloods: 3,
      firstDeaths: 7,
      entryRatio: 0.3, // 3/10
      entryRatePerRound: 0.15, // 3/20
      killDeathEntryRatio: 0.43, // 3/7 = 0.428571… → 0.43
      classification: 'Recuado',
      totals: { matches: 1, rounds: 20 },
    });
  });

  it.each([
    [6, 4, 'Agressivo'],
    [11, 9, 'Agressivo'], // boundary exato 0.55
    [5, 5, 'Equilibrado'],
    [9, 11, 'Equilibrado'], // boundary exato 0.45
    [2, 8, 'Recuado'],
  ] as const)('classifica FB %i / FD %i (limites de banda) como "%s"', (fb, fd, expected) => {
    const metrics = calculateEntryAggressiveness([
      makeMatch({ firstBloods: fb, firstDeaths: fd }),
    ]);

    expect(metrics.classification).toBe(expected);
  });

  it('timeline parcial (apenas firstDeaths) conta como dado de entrada presente', () => {
    const metrics = calculateEntryAggressiveness([makeMatch({ firstDeaths: 4 })]);

    expect(metrics.firstBloods).toBe(0);
    expect(metrics.firstDeaths).toBe(4);
    expect(metrics.attempts).toBe(4);
    expect(metrics.entryRatio).toBe(0);
  });

  it('FD=0 → killDeathEntryRatio igual aos firstBloods (convenção, nunca Infinity)', () => {
    const metrics = calculateEntryAggressiveness([
      makeMatch({ firstBloods: 5, firstDeaths: 0 }),
    ]);

    expect(metrics.killDeathEntryRatio).toBe(5);
    expect(metrics.entryRatio).toBe(1);
    expect(metrics.classification).toBe('Agressivo');
  });

  it('FB=FD=0 → entryRatio null e classificação "Indeterminado" (guarda 0/0)', () => {
    const metrics = calculateEntryAggressiveness([
      makeMatch({ firstBloods: 0, firstDeaths: 0 }),
    ]);

    expect(metrics.attempts).toBe(0);
    expect(metrics.entryRatio).toBeNull();
    expect(metrics.killDeathEntryRatio).toBe(0);
    expect(metrics.entryRatePerRound).toBe(0);
    expect(metrics.classification).toBe('Indeterminado');
  });

  it('soma partidas mistas: partida sem timeline conta rounds mas não FB/FD', () => {
    const metrics = calculateEntryAggressiveness([
      makeMatch({ firstBloods: 3, firstDeaths: 7 }),
      makeMatch(),
    ]);

    expect(metrics.firstBloods).toBe(3);
    expect(metrics.firstDeaths).toBe(7);
    expect(metrics.totals).toEqual({ matches: 2, rounds: 40 });
    expect(metrics.entryRatePerRound).toBe(0.08); // 3/40 = 0.075 → 0.08
  });

  it('amostra sem timeline → todas as métricas de entrada null (nunca 0 enganoso)', () => {
    const metrics = calculateEntryAggressiveness([makeMatch(), makeMatch()]);

    expect(metrics).toEqual({
      attempts: null,
      firstBloods: null,
      firstDeaths: null,
      entryRatio: null,
      entryRatePerRound: null,
      killDeathEntryRatio: null,
      classification: 'Indeterminado',
      totals: { matches: 2, rounds: 40 },
    });
  });

  it('rejeita entrada que não é array', () => {
    expect(() =>
      calculateEntryAggressiveness(null as unknown as readonly MatchCombatStats[]),
    ).toThrowError(/array/i);
  });

  it('rejeita amostra vazia', () => {
    expect(() => calculateEntryAggressiveness([])).toThrowError(CombatMetricsError);
    expect(() => calculateEntryAggressiveness([])).toThrowError(/Nenhuma partida/);
  });

  it.each([
    [{ firstBloods: -1 }, /Partida #0.*firstBloods/s],
    [{ firstDeaths: Number.NaN }, /Partida #0.*firstDeaths/s],
    [{ roundsPlayed: 0 }, /Partida #0.*roundsPlayed/s],
  ] as const)('rejeita partida inválida %j com índice e campo citados', (overrides, pattern) => {
    expect(() => calculateEntryAggressiveness([makeMatch(overrides)])).toThrowError(pattern);
  });
});

describe('buildEntryInsight', () => {
  it('monta o envelope de 3 camadas com dados completos (5 partidas agressivas)', () => {
    const insight = buildEntryInsight(
      Array.from({ length: 5 }, () => makeMatch({ firstBloods: 6, firstDeaths: 4 })),
    );

    // Camada 1: números exatos (FB 30 / FD 20 / 100 rounds)
    expect(insight.raw_metrics).toEqual({
      matches: 5,
      rounds: 100,
      attempts: 50,
      firstBloods: 30,
      firstDeaths: 20,
      entryRatio: 0.6,
      entryRatePerRound: 0.3,
      killDeathEntryRatio: 1.5,
    });

    // Camada 2: rating semântico por métrica
    expect(insight.contextual_rating).toEqual({
      entryRatio: 'Acima da Média',
      entryRatePerRound: 'Excelente',
      killDeathEntryRatio: 'Excelente',
    });

    // Camada 3: hooks (estilo agressivo; sem alerta de amostra)
    expect(insight.coaching_hooks.some((h) => /entrada agressivo/.test(h))).toBe(true);
    expect(insight.coaching_hooks.some((h) => /Amostra pequena/.test(h))).toBe(false);
  });

  it('hooks de estilo Equilibrado e Recuado citam números exatos', () => {
    const equilibrado = buildEntryInsight(
      Array.from({ length: 5 }, () => makeMatch({ firstBloods: 5, firstDeaths: 5 })),
    );
    const recuado = buildEntryInsight(
      Array.from({ length: 5 }, () => makeMatch({ firstBloods: 2, firstDeaths: 8 })),
    );

    expect(equilibrado.coaching_hooks.some((h) => /Entrada equilibrada/.test(h))).toBe(true);
    expect(recuado.coaching_hooks.some((h) => /Entrada recuada/.test(h))).toBe(true);
    expect(recuado.coaching_hooks.some((h) => /trade/.test(h))).toBe(true);
  });

  it('FB=FD=0 → entryRatio omitido do envelope e hook de estilo indeterminado', () => {
    const insight = buildEntryInsight(
      Array.from({ length: 5 }, () => makeMatch({ firstBloods: 0, firstDeaths: 0 })),
    );

    expect(insight.raw_metrics.attempts).toBe(0);
    expect('entryRatio' in insight.raw_metrics).toBe(false);
    expect('entryRatio' in insight.contextual_rating).toBe(false);
    expect(insight.coaching_hooks.some((h) => /Nenhum duelo de abertura/.test(h))).toBe(true);
  });

  it('sem timeline → envelope só com contexto (matches/rounds) e rating vazio', () => {
    const insight = buildEntryInsight(Array.from({ length: 3 }, () => makeMatch()));

    expect(insight.raw_metrics).toEqual({ matches: 3, rounds: 60 });
    expect(insight.contextual_rating).toEqual({});
    expect(insight.coaching_hooks.some((h) => /timeline/.test(h))).toBe(true);
  });

  it('gera hook de confiabilidade para amostra pequena (<5 partidas)', () => {
    const insight = buildEntryInsight([
      makeMatch({ firstBloods: 6, firstDeaths: 4 }),
      makeMatch({ firstBloods: 6, firstDeaths: 4 }),
    ]);

    expect(insight.coaching_hooks.some((h) => /Amostra pequena.*2 partidas/.test(h))).toBe(true);
  });

  it('propaga a validação de amostra vazia', () => {
    expect(() => buildEntryInsight([])).toThrowError(/Nenhuma partida/);
  });
});
