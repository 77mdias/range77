import { describe, expect, it } from 'vitest';
import {
  BENCHMARK_LABELS,
  BENCHMARK_REFERENCE,
  buildBenchmarkComparison,
} from '@/services/analytics/benchmark';
import type { MatchSummary } from '@/contracts/tracker';

/**
 * SUITE (100% obrigatório) — benchmark de calibração: comparação das
 * métricas reais com referências de elo, posicionamento das barras e
 * omissão honesta do que não é computável.
 */

function match(overrides: Partial<MatchSummary> = {}): MatchSummary {
  return {
    matchId: 'm',
    region: 'br',
    map: 'Ascent',
    queue: 'competitive',
    season: null,
    startedAt: '2026-01-01T00:00:00Z',
    gameLengthMs: 0,
    result: 'win',
    agent: 'Jett',
    teamId: 'Blue',
    score: { us: 13, them: 10 },
    kills: 10,
    deaths: 10,
    assists: 5,
    acs: 200,
    hsPercentage: 20,
    roundsPlayed: 20,
    ...overrides,
  };
}

describe('referências documentadas', () => {
  it('expõe valores e rótulos por métrica', () => {
    expect(BENCHMARK_REFERENCE.kdr.value).toBe(1.05);
    expect(BENCHMARK_REFERENCE.entry.value).toBe(16.4);
    expect(BENCHMARK_LABELS.kdr).toBe('K/D Geral Ponderado');
    expect(BENCHMARK_LABELS.entry).toBe('Taxa de Primeiro Duelo Vencido (FB%)');
  });
});

describe('buildBenchmarkComparison', () => {
  it('sem amostra → lista vazia', () => {
    expect(buildBenchmarkComparison([])).toEqual([]);
  });

  it('calcula K/D, ACS ponderado, HS% e FB% com posições corretas', () => {
    const metrics = buildBenchmarkComparison([
      match({
        kills: 20,
        deaths: 10,
        acs: 200,
        hsPercentage: 30,
        roundsPlayed: 25,
        firstBloods: 5,
        firstDeaths: 5,
      }),
      match({
        kills: 10,
        deaths: 10,
        acs: 300,
        hsPercentage: 20,
        roundsPlayed: 25,
        firstBloods: 3,
        firstDeaths: 7,
      }),
    ]);

    expect(metrics.map((metric) => metric.key)).toEqual(['kdr', 'acs', 'hs', 'entry']);

    const [kdr, acs, hs, entry] = metrics;
    // kills 30 / deaths 20 = 1.50 → 75%; elo 1.05 → 52.5%
    expect(kdr).toMatchObject({
      label: 'K/D Geral Ponderado',
      playerValue: '1.50',
      eloValue: '1.05',
      playerPercent: 75,
      eloPercent: 52.5,
      above: true,
      scale: ['0.00', '1.05 ELO BENCHMARK', '2.00 CAP'],
    });
    // ACS ponderado: (200·25 + 300·25) / 50 = 250 → 71.4%
    expect(acs).toMatchObject({ playerValue: '250', eloValue: '215', playerPercent: 71.4, above: true });
    // HS% médio: (30 + 20) / 2 = 25 → 50%
    expect(hs).toMatchObject({ playerValue: '25%', eloValue: '23%', playerPercent: 50, above: true });
    // FB%: 8/20 = 40% → clampado em 100%
    expect(entry).toMatchObject({
      playerValue: '40%',
      eloValue: '16.4%',
      playerPercent: 100,
      above: true,
    });
  });

  it('deaths=0 → K/D igual a kills; HS% e FB% omitidos sem dado', () => {
    const metrics = buildBenchmarkComparison([
      match({ kills: 5, deaths: 0, hsPercentage: null, roundsPlayed: 10 }),
    ]);
    expect(metrics.map((metric) => metric.key)).toEqual(['kdr', 'acs']);
    expect(metrics[0]?.playerValue).toBe('5.00');
  });

  it('rounds=0 → ACS ponderado 0 (nunca NaN)', () => {
    const metrics = buildBenchmarkComparison([
      match({ roundsPlayed: 0, hsPercentage: null, kills: 10, deaths: 10 }),
    ]);
    const acs = metrics.find((metric) => metric.key === 'acs');
    expect(acs?.playerValue).toBe('0');
    expect(acs?.playerPercent).toBe(0);
  });

  it('FB% cobre firstDeaths/firstBloods isolados e omite 0/0', () => {
    const onlyDeaths = buildBenchmarkComparison([
      match({ hsPercentage: null, firstDeaths: 5, kills: 10, deaths: 10 }),
    ]);
    // fb = 0 (campo ausente → `?? 0`), fd = 5 → 0%
    expect(onlyDeaths.find((metric) => metric.key === 'entry')?.playerValue).toBe('0%');

    const onlyBloods = buildBenchmarkComparison([
      match({ hsPercentage: null, firstBloods: 5, kills: 10, deaths: 10 }),
    ]);
    // fd = 0 (campo ausente → `?? 0`), fb = 5 → 100%
    expect(onlyBloods.find((metric) => metric.key === 'entry')?.playerValue).toBe('100%');

    const zeroDuels = buildBenchmarkComparison([
      match({ hsPercentage: null, firstBloods: 0, firstDeaths: 0 }),
    ]);
    expect(zeroDuels.some((metric) => metric.key === 'entry')).toBe(false);
  });

  it('abaixo das referências marca above=false nas duas formatações', () => {
    const metrics = buildBenchmarkComparison([
      match({ kills: 1, deaths: 10, acs: 100, hsPercentage: 5, roundsPlayed: 20, firstBloods: 0, firstDeaths: 10 }),
    ]);
    expect(metrics.find((metric) => metric.key === 'kdr')).toMatchObject({
      playerValue: '0.10',
      above: false,
    });
    expect(metrics.find((metric) => metric.key === 'hs')).toMatchObject({
      playerValue: '5%',
      above: false,
    });
  });
});
