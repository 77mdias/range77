import { describe, expect, it } from 'vitest';
import type { MatchCombatStats } from '@/contracts/henrikdev';
import { CombatMetricsError } from '@/services/analytics/combat';
import { buildAdrInsight, calculateAdr } from '@/services/analytics/adr';

/**
 * SUITE TDD — Average Damage per Round (services/analytics/adr.ts).
 *
 * Escrita ANTES da implementação. Cobre: média ponderada por roundsPlayed
 * (apenas partidas com dano), ADR null quando nenhuma partida fornece dano
 * (chave omitida no envelope), todas as faixas de rating (160/145/130/115),
 * hooks por banda e validação fail-fast com índice/campo na mensagem.
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

describe('calculateAdr', () => {
  it('calcula ADR como média ponderada por roundsPlayed', () => {
    const metrics = calculateAdr([
      makeMatch({ roundsPlayed: 20, damageDealt: 3000 }),
      makeMatch({ roundsPlayed: 25, damageDealt: 4000 }),
    ]);

    expect(metrics).toEqual({
      adr: 155.6, // 7000/45 = 155.55… → 155.6
      damageDealt: 7000,
      rounds: 45,
      totals: { matches: 2 },
    });
  });

  it('ignora partidas sem dano no dano total E no denominador de rounds', () => {
    const metrics = calculateAdr([
      makeMatch({ roundsPlayed: 20, damageDealt: 3000 }),
      makeMatch({ roundsPlayed: 25 }), // sem damage na fonte
      makeMatch({ roundsPlayed: 25, damageDealt: 4000 }),
    ]);

    expect(metrics.totals.matches).toBe(3);
    expect(metrics.damageDealt).toBe(7000);
    expect(metrics.rounds).toBe(45); // 20+25 — não 70
    expect(metrics.adr).toBe(155.6);
  });

  it('nenhuma partida com dano → adr null (nunca 0 enganoso)', () => {
    const metrics = calculateAdr([makeMatch(), makeMatch()]);

    expect(metrics).toEqual({
      adr: null,
      damageDealt: 0,
      rounds: 0,
      totals: { matches: 2 },
    });
  });

  it('partida única com dano exato', () => {
    const metrics = calculateAdr([makeMatch({ roundsPlayed: 10, damageDealt: 1600 })]);

    expect(metrics.adr).toBe(160);
  });

  it('rejeita entrada que não é array', () => {
    expect(() => calculateAdr(null as unknown as readonly MatchCombatStats[])).toThrowError(
      /array/i,
    );
  });

  it('rejeita amostra vazia', () => {
    expect(() => calculateAdr([])).toThrowError(CombatMetricsError);
    expect(() => calculateAdr([])).toThrowError(/Nenhuma partida/);
  });

  it.each([
    [{ damageDealt: -50 }, /Partida #0.*damageDealt/s],
    [{ damageDealt: Number.NaN }, /Partida #0.*damageDealt/s],
  ] as const)('rejeita partida inválida %j com índice e campo citados', (overrides, pattern) => {
    expect(() => calculateAdr([makeMatch(overrides)])).toThrowError(pattern);
  });
});

describe('buildAdrInsight', () => {
  it('monta o envelope de 3 camadas com dados completos (5 partidas)', () => {
    const insight = buildAdrInsight(
      Array.from({ length: 5 }, () => makeMatch({ roundsPlayed: 20, damageDealt: 3000 })),
    );

    expect(insight.raw_metrics).toEqual({
      matches: 5,
      adr: 150,
      damageDealt: 15000,
      rounds: 100,
    });
    expect(insight.contextual_rating).toEqual({ adr: 'Acima da Média' });
    expect(insight.coaching_hooks.some((h) => /faixa saudável/.test(h))).toBe(true);
    expect(insight.coaching_hooks.some((h) => /Amostra pequena/.test(h))).toBe(false);
  });

  it.each([
    [1600, 'Excelente'],
    [1450, 'Acima da Média'],
    [1300, 'Na Média'],
    [1150, 'Abaixo da Média'],
    [1000, 'Crítico'],
  ] as const)('ADR %i/10 rounds recebe rating "%s"', (damage, rating) => {
    const insight = buildAdrInsight([makeMatch({ roundsPlayed: 10, damageDealt: damage })]);

    expect(insight.contextual_rating.adr).toBe(rating);
  });

  it('hooks de ADR excelente e crítico citam o valor exato', () => {
    const excelente = buildAdrInsight([makeMatch({ roundsPlayed: 10, damageDealt: 1800 })]);
    const critico = buildAdrInsight([makeMatch({ roundsPlayed: 10, damageDealt: 1000 })]);

    expect(excelente.coaching_hooks.some((h) => /ADR de 180/.test(h))).toBe(true);
    expect(excelente.coaching_hooks.some((h) => /excelente/.test(h))).toBe(true);
    expect(critico.coaching_hooks.some((h) => /ADR de 100/.test(h))).toBe(true);
    expect(critico.coaching_hooks.some((h) => /abaixo do ideal/.test(h))).toBe(true);
  });

  it('sem dano na amostra → envelope só com matches, rating vazio e hook explicativo', () => {
    const insight = buildAdrInsight(Array.from({ length: 3 }, () => makeMatch()));

    expect(insight.raw_metrics).toEqual({ matches: 3 });
    expect(insight.contextual_rating).toEqual({});
    expect('adr' in insight.raw_metrics).toBe(false);
    expect('damageDealt' in insight.raw_metrics).toBe(false);
    expect('rounds' in insight.raw_metrics).toBe(false);
    expect(insight.coaching_hooks.some((h) => /ausente na fonte/.test(h))).toBe(true);
  });

  it('gera hook de confiabilidade para amostra pequena (<5 partidas)', () => {
    const insight = buildAdrInsight([
      makeMatch({ roundsPlayed: 20, damageDealt: 3000 }),
      makeMatch({ roundsPlayed: 20, damageDealt: 3000 }),
    ]);

    expect(insight.coaching_hooks.some((h) => /Amostra pequena.*2 partidas/.test(h))).toBe(true);
  });

  it('propaga a validação de amostra vazia', () => {
    expect(() => buildAdrInsight([])).toThrowError(/Nenhuma partida/);
  });
});
