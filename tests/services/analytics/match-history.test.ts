import { describe, expect, it } from 'vitest';
import type { MatchSummary } from '@/contracts/tracker';
import {
  buildHistoryMetrics,
  displayMatchKd,
  sortMatchesByRecency,
} from '@/services/analytics/match-history';

/**
 * SUITE TDD — agregações puras da aba "Partidas & Histórico Completo"
 * (100% de cobertura: ramos de lista vazia, HS% nulo, first bloods nulo e
 * ΔRR ausente).
 */

const BASE: MatchSummary = {
  matchId: 'm1',
  region: 'br',
  map: 'Ascent',
  queue: 'competitive',
  season: 'V25A3',
  startedAt: '2026-10-01T00:00:00.000Z',
  gameLengthMs: 0,
  result: 'win',
  agent: 'Jett',
  teamId: 'Red',
  score: { us: 13, them: 7 },
  kills: 20,
  deaths: 10,
  assists: 5,
  acs: 250,
  hsPercentage: 30,
  roundsPlayed: 20,
};

const summary = (overrides: Partial<MatchSummary>): MatchSummary => ({ ...BASE, ...overrides });

describe('displayMatchKd', () => {
  it('divide por deaths; deaths=0 devolve kills (nunca Infinity)', () => {
    expect(displayMatchKd(20, 10)).toBe(2);
    expect(displayMatchKd(20, 0)).toBe(20);
  });
});

describe('buildHistoryMetrics', () => {
  const rr = new Map<string, number>([
    ['m1', 22],
    ['m2', -16],
  ]);

  it('agrega vitórias, médias, HS% e ΔRR casado por matchId', () => {
    const matches = [
      summary({ matchId: 'm1', result: 'win', kills: 20, deaths: 10, acs: 250, hsPercentage: 30, firstBloods: 4 }),
      summary({ matchId: 'm2', result: 'loss', kills: 10, deaths: 20, acs: 150, hsPercentage: 20, firstBloods: 0 }),
    ];

    expect(buildHistoryMetrics(matches, rr)).toEqual({
      matches: 2,
      wins: 1,
      losses: 1,
      winrate: 50,
      avgKd: 1.25,
      avgAcs: 200,
      avgHsPercentage: 25,
      firstBloods: 4,
      firstBloodsPerMatch: 2,
      netRr: 6,
    });
  });

  it('sem timeline de abates first bloods fica nulo (nada fabricado)', () => {
    const metrics = buildHistoryMetrics([summary({})], new Map());
    expect(metrics.firstBloods).toBeNull();
    expect(metrics.firstBloodsPerMatch).toBeNull();
    expect(metrics.netRr).toBe(0);
  });

  it('sem HS% computável devolve nulo e trata deaths=0 na média de K/D', () => {
    const metrics = buildHistoryMetrics(
      [summary({ hsPercentage: null, kills: 12, deaths: 0 })],
      new Map(),
    );
    expect(metrics.avgHsPercentage).toBeNull();
    expect(metrics.avgKd).toBe(12);
    expect(metrics.avgAcs).toBe(250);
  });

  it('lista vazia → zeros e nulos', () => {
    expect(buildHistoryMetrics([], new Map())).toEqual({
      matches: 0,
      wins: 0,
      losses: 0,
      winrate: 0,
      avgKd: 0,
      avgAcs: 0,
      avgHsPercentage: null,
      firstBloods: null,
      firstBloodsPerMatch: null,
      netRr: 0,
    });
  });
});

describe('sortMatchesByRecency', () => {
  it('mais recente primeiro e empate por matchId desc', () => {
    const older = summary({ matchId: 'a', startedAt: '2026-10-01T00:00:00.000Z' });
    const equalA = summary({ matchId: 'b', startedAt: '2026-10-02T00:00:00.000Z' });
    const equalB = summary({ matchId: 'c', startedAt: '2026-10-02T00:00:00.000Z' });
    expect(sortMatchesByRecency([older, equalA, equalB]).map((m) => m.matchId)).toEqual([
      'c',
      'b',
      'a',
    ]);
  });

  it('ordena par a par nos dois sentidos (cobre o ternário de recência)', () => {
    const older = summary({ matchId: 'a', startedAt: '2026-10-01T00:00:00.000Z' });
    const newer = summary({ matchId: 'b', startedAt: '2026-10-02T00:00:00.000Z' });
    expect(sortMatchesByRecency([older, newer]).map((m) => m.matchId)).toEqual(['b', 'a']);
    expect(sortMatchesByRecency([newer, older]).map((m) => m.matchId)).toEqual(['b', 'a']);
  });

  it('não muta a lista de entrada', () => {
    const matches = [summary({ matchId: 'a' })];
    sortMatchesByRecency(matches);
    expect(matches).toHaveLength(1);
  });
});
