import { describe, expect, it } from 'vitest';
import type { MatchCombatStats } from '@/contracts/henrikdev';
import {
  buildCombatCoachInsight,
  calculateCombatMetrics,
  CombatMetricsError,
} from '@/services/analytics/combat';

/**
 * SUITE TDD — analytics de combate (services/analytics/combat.ts).
 *
 * Escrita ANTES da implementação. Fixtures com valores conhecidos e
 * arredondamento verificado à mão. Cobre: agregação, guardas de divisão
 * por zero (deaths=0, shots=0), dados opcionais ausentes (KAST, FB/FD,
 * tiros) e validação fail-fast de entrada com índice da partida inválida.
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

describe('calculateCombatMetrics', () => {
  it('calcula KDR, KPR, ACS e HS% de uma partida e classifica mira/impacto', () => {
    const metrics = calculateCombatMetrics([makeMatch()]);

    expect(metrics.kdr).toBe(2);
    expect(metrics.kpr).toBe(1);
    expect(metrics.acs).toBe(200);
    expect(metrics.hsPercentage).toBe(25);
    expect(metrics.kast).toBeNull();
    expect(metrics.firstBloods).toBeNull();
    expect(metrics.firstDeaths).toBeNull();
    expect(metrics.evaluation).toEqual({ aimClass: 'Excelente', impactClass: 'Equilibrado' });
    expect(metrics.totals).toEqual({
      matches: 1,
      rounds: 20,
      kills: 20,
      deaths: 10,
      assists: 5,
      headshots: 10,
      bodyshots: 20,
      legshots: 10,
    });
  });

  it('agrega múltiplas partidas com arredondamento correto', () => {
    const metrics = calculateCombatMetrics([
      makeMatch(),
      makeMatch({
        kills: 15,
        deaths: 20,
        headshots: 5,
        bodyshots: 25,
        legshots: 5,
        score: 3000,
      }),
    ]);

    // kills 35 / deaths 30 = 1.1666… → 1.17 | kills 35 / rounds 40 = 0.875 → 0.88
    expect(metrics.kdr).toBe(1.17);
    expect(metrics.kpr).toBe(0.88);
    expect(metrics.acs).toBe(175); // (4000+3000)/40
    expect(metrics.hsPercentage).toBe(20); // 15/(75)
    expect(metrics.totals).toEqual({
      matches: 2,
      rounds: 40,
      kills: 35,
      deaths: 30,
      assists: 10,
      headshots: 15,
      bodyshots: 45,
      legshots: 15,
    });
  });

  it('deaths=0 → KDR igual aos kills (convenção de amostra sem mortes, nunca Infinity)', () => {
    const metrics = calculateCombatMetrics([makeMatch({ deaths: 0, kills: 13 })]);

    expect(metrics.kdr).toBe(13);
  });

  it('KAST é agregado ponderado por rounds quando fornecido', () => {
    const metrics = calculateCombatMetrics([
      makeMatch({ roundsPlayed: 10, kast: 80 }),
      makeMatch({ roundsPlayed: 30, kast: 60 }),
    ]);

    // (80×10 + 60×30) / 40 = 65
    expect(metrics.kast).toBe(65);
  });

  it('sem dados de tiro → hsPercentage null e aimClass "Indeterminado" (não 0%)', () => {
    const metrics = calculateCombatMetrics([
      makeMatch({ headshots: 0, bodyshots: 0, legshots: 0 }),
    ]);

    expect(metrics.hsPercentage).toBeNull();
    expect(metrics.evaluation.aimClass).toBe('Indeterminado');
  });

  it('classifica mira como Regular na faixa intermediária (HS% 20)', () => {
    const metrics = calculateCombatMetrics([
      makeMatch({ headshots: 12, bodyshots: 38, legshots: 10 }),
    ]);

    expect(metrics.hsPercentage).toBe(20);
    expect(metrics.evaluation.aimClass).toBe('Regular');
  });

  it('classifica mira como Crítica (HS% 5)', () => {
    const metrics = calculateCombatMetrics([
      makeMatch({ headshots: 2, bodyshots: 30, legshots: 8 }),
    ]);

    expect(metrics.hsPercentage).toBe(5);
    expect(metrics.evaluation.aimClass).toBe('Crítico');
  });

  it('classifica impacto Passivo / Equilibrado / Carregador por ACS', () => {
    const passivo = calculateCombatMetrics([makeMatch({ score: 2600 })]); // ACS 130
    const equilibrado = calculateCombatMetrics([makeMatch()]); // ACS 200
    const carregador = calculateCombatMetrics([makeMatch({ score: 5000 })]); // ACS 250

    expect(passivo.evaluation.impactClass).toBe('Passivo');
    expect(equilibrado.evaluation.impactClass).toBe('Equilibrado');
    expect(carregador.evaluation.impactClass).toBe('Carregador');
  });

  it('agrega first bloods/deaths quando presentes e ignora partidas sem o dado', () => {
    const metrics = calculateCombatMetrics([
      makeMatch({ firstBloods: 3, firstDeaths: 7 }),
      makeMatch(),
    ]);

    expect(metrics.firstBloods).toBe(3);
    expect(metrics.firstDeaths).toBe(7);
  });

  it('rejeita entrada que não é array (defesa em runtime na borda da API)', () => {
    expect(() =>
      calculateCombatMetrics(null as unknown as readonly MatchCombatStats[]),
    ).toThrowError(/array/i);
  });

  it('rejeita amostra vazia', () => {
    expect(() => calculateCombatMetrics([])).toThrowError(CombatMetricsError);
    expect(() => calculateCombatMetrics([])).toThrowError(/Nenhuma partida/);
  });

  it.each([
    [{ kills: -1 }, /Partida #0.*kills/s],
    [{ roundsPlayed: 0 }, /Partida #0.*roundsPlayed/s],
    [{ kills: Number.NaN }, /Partida #0.*kills/s],
    [{ kast: 101 }, /Partida #0.*kast/i],
    [{ firstBloods: -1 }, /Partida #0.*firstBloods/s],
    [{ firstDeaths: -2 }, /Partida #0.*firstDeaths/s],
    [{ damageDealt: -50 }, /Partida #0.*damageDealt/s],
  ] as const)('rejeita partida inválida %j com índice e campo citados', (overrides, pattern) => {
    expect(() => calculateCombatMetrics([makeMatch(overrides)])).toThrowError(pattern);
  });
});

describe('buildCombatCoachInsight', () => {
  it('monta o envelope de 3 camadas com dados completos (5 partidas)', () => {
    const insight = buildCombatCoachInsight(
      Array.from({ length: 5 }, () => makeMatch({ kast: 70, firstBloods: 4, firstDeaths: 6 })),
    );

    // Camada 1: números exatos
    expect(insight.raw_metrics).toMatchObject({
      kdr: 2,
      kpr: 1,
      acs: 200,
      hsPercentage: 25,
      kast: 70,
      firstBloods: 20,
      firstDeaths: 30,
      matches: 5,
      rounds: 100,
    });

    // Camada 2: rating semântico por métrica
    expect(insight.contextual_rating).toEqual({
      kdr: 'Excelente',
      kpr: 'Excelente',
      acs: 'Na Média',
      hsPercentage: 'Acima da Média',
      kast: 'Na Média',
    });

    // Camada 3: hooks pré-calculados (mira forte, impacto consistente, entradas perdidas)
    expect(insight.coaching_hooks.some((h) => /ponto forte/.test(h))).toBe(true);
    expect(insight.coaching_hooks.some((h) => /recuado/.test(h))).toBe(true);
    expect(insight.coaching_hooks.some((h) => /Amostra pequena/.test(h))).toBe(false);
    expect(insight.coaching_hooks.some((h) => /sem contribuição/.test(h))).toBe(false);
  });

  it('gera hook de confiabilidade para amostra pequena (<5 partidas)', () => {
    const insight = buildCombatCoachInsight([makeMatch(), makeMatch()]);

    expect(insight.raw_metrics.matches).toBe(2);
    expect(insight.coaching_hooks.some((h) => /Amostra pequena.*2 partidas/.test(h))).toBe(true);
  });

  it('hook de mira regular (HS% 20) prescreve aquecimento focado', () => {
    const insight = buildCombatCoachInsight(
      Array.from({ length: 5 }, () => makeMatch({ headshots: 12, bodyshots: 38, legshots: 10 })),
    );

    expect(insight.coaching_hooks.some((h) => /A mira é regular/.test(h))).toBe(true);
  });

  it('hook de mira crítica prescreve treino de headshot-level aim', () => {
    const insight = buildCombatCoachInsight(
      Array.from({ length: 5 }, () => makeMatch({ headshots: 2, bodyshots: 30, legshots: 8 })),
    );

    expect(insight.coaching_hooks.some((h) => /mirando no corpo/.test(h))).toBe(true);
  });

  it('hooks de impacto Passivo e Carregador citam o ACS exato', () => {
    const passivo = buildCombatCoachInsight(Array.from({ length: 5 }, () => makeMatch({ score: 2600 })));
    const carregador = buildCombatCoachInsight(Array.from({ length: 5 }, () => makeMatch({ score: 5000 })));

    expect(passivo.coaching_hooks.some((h) => /ACS 130/.test(h))).toBe(true);
    expect(passivo.coaching_hooks.some((h) => /participação mais ativa/.test(h))).toBe(true);
    expect(carregador.coaching_hooks.some((h) => /carregando/.test(h))).toBe(true);
  });

  it('KAST baixo gera hook sobre rodadas sem contribuição', () => {
    const insight = buildCombatCoachInsight(Array.from({ length: 5 }, () => makeMatch({ kast: 55 })));

    expect(insight.coaching_hooks.some((h) => /sem contribuição/.test(h))).toBe(true);
  });

  it('dados ausentes omitem chaves (nunca enviam null/0 enganoso ao chatbot)', () => {
    const insight = buildCombatCoachInsight(
      Array.from({ length: 3 }, () => makeMatch({ headshots: 0, bodyshots: 0, legshots: 0 })),
    );

    expect('hsPercentage' in insight.raw_metrics).toBe(false);
    expect('kast' in insight.raw_metrics).toBe(false);
    expect('firstBloods' in insight.raw_metrics).toBe(false);
    expect('hsPercentage' in insight.contextual_rating).toBe(false);
    expect('kast' in insight.contextual_rating).toBe(false);
    expect(insight.coaching_hooks.some((h) => /mira|KAST|duelos iniciais/.test(h))).toBe(false);
  });

  it('first deaths zerados com first bloods positivos geram hook positivo de entradas', () => {
    const insight = buildCombatCoachInsight([makeMatch({ firstBloods: 5, firstDeaths: 0 })]);

    expect(insight.coaching_hooks.some((h) => /vence os duelos iniciais/.test(h))).toBe(true);
  });

  it('propaga a validação de amostra vazia', () => {
    expect(() => buildCombatCoachInsight([])).toThrowError(/Nenhuma partida/);
  });
});
