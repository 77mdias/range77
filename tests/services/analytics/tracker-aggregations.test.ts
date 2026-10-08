import { describe, expect, it } from 'vitest';
import type { MatchSummary } from '@/contracts/tracker';
import {
  average,
  buildTrackerAggregations,
  computeAcsTrend,
  computeKda,
  computeStreaks,
  computeWinrate,
  summarizeByAgent,
  summarizeByMap,
} from '@/services/analytics/tracker-aggregations';

/**
 * SUITE TDD — agregações puras do tracker (200% ... 100% de cobertura).
 */

const BASE: MatchSummary = {
  matchId: 'm1',
  region: 'br',
  map: 'Ascent',
  queue: 'competitive',
  season: null,
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

describe('helpers', () => {
  it('average lida com lista vazia e não-vazia', () => {
    expect(average([])).toBe(0);
    expect(average([2, 4])).toBe(3);
  });

  it('computeWinrate', () => {
    expect(computeWinrate(3, 4)).toBe(75);
    expect(computeWinrate(0, 4)).toBe(0);
    expect(computeWinrate(0, 0)).toBe(0);
    expect(computeWinrate(1, 0)).toBe(0);
  });

  it('computeKda evita divisão por zero', () => {
    expect(computeKda(10, 5, 0)).toBe(15);
    expect(computeKda(10, 5, 5)).toBe(3);
  });
});

describe('summarizeByAgent', () => {
  const matches: MatchSummary[] = [
    summary({ matchId: 'm1', agent: 'Jett', result: 'win', kills: 20, deaths: 10, assists: 5, acs: 250, hsPercentage: 30 }),
    summary({ matchId: 'm2', agent: 'Jett', result: 'loss', kills: 10, deaths: 15, assists: 3, acs: 150, hsPercentage: null }),
    summary({ matchId: 'm3', agent: 'Reyna', result: 'win', kills: 25, deaths: 5, assists: 2, acs: 300, hsPercentage: null }),
    summary({ matchId: 'm4', agent: null, result: 'win', kills: 15, deaths: 12, assists: 4, acs: 200, hsPercentage: 20 }),
  ];

  it('agrupa, calcula médias/kda e ordena por partidas (desempate alfabético)', () => {
    const stats = summarizeByAgent(matches);
    expect(stats.map((stat) => stat.key)).toEqual(['Jett', 'Desconhecido', 'Reyna']);

    const jett = stats[0]!;
    expect(jett).toEqual({
      key: 'Jett',
      matches: 2,
      wins: 1,
      losses: 1,
      winrate: 50,
      avgKills: 15,
      avgDeaths: 12.5,
      avgAssists: 4,
      kda: 1.52,
      avgAcs: 200,
      avgHsPercentage: 30,
    });

    expect(stats[2]!.avgHsPercentage).toBeNull();
  });

  it('lista vazia gera agregação vazia', () => {
    expect(summarizeByAgent([])).toEqual([]);
  });
});

describe('summarizeByMap', () => {
  it('agrupa por mapa e ordena por volume', () => {
    const stats = summarizeByMap([
      summary({ matchId: 'm1', map: 'Ascent' }),
      summary({ matchId: 'm2', map: 'Ascent' }),
      summary({ matchId: 'm3', map: 'Haven' }),
    ]);
    expect(stats.map((stat) => stat.key)).toEqual(['Ascent', 'Haven']);
    expect(stats[0]).toMatchObject({ key: 'Ascent', matches: 2, wins: 2, winrate: 100 });
  });
});

describe('computeStreaks', () => {
  const chrono = (result: 'win' | 'loss', index: number) =>
    summary({ matchId: `m${index}`, result, startedAt: `2026-10-0${index + 1}T00:00:00.000Z` });

  it('lista vazia → sem streak', () => {
    expect(computeStreaks([])).toEqual({
      current: { result: 'none', length: 0 },
      longestWin: 0,
      longestLoss: 0,
    });
  });

  it('calcula streak atual e maiores sequências', () => {
    const streaks = computeStreaks([chrono('win', 0), chrono('win', 1), chrono('loss', 2), chrono('win', 3)]);
    expect(streaks).toEqual({ current: { result: 'win', length: 1 }, longestWin: 2, longestLoss: 1 });
  });

  it('sequência inteira de derrotas', () => {
    const streaks = computeStreaks([chrono('loss', 0), chrono('loss', 1), chrono('loss', 2)]);
    expect(streaks).toEqual({ current: { result: 'loss', length: 3 }, longestWin: 0, longestLoss: 3 });
  });

  it('reordena cronologicamente e desempata por matchId', () => {
    const newer = summary({ matchId: 'b', result: 'loss', startedAt: '2026-10-01T00:00:00.000Z' });
    const older = summary({ matchId: 'a', result: 'win', startedAt: '2026-10-01T00:00:00.000Z' });
    const streaks = computeStreaks([newer, older]);
    expect(streaks).toEqual({ current: { result: 'loss', length: 1 }, longestWin: 1, longestLoss: 1 });
  });
});

describe('computeAcsTrend', () => {
  const at = (index: number, acs: number) =>
    summary({ matchId: `m${index}`, acs, startedAt: `2026-10-0${index + 1}T00:00:00.000Z` });

  it('lista vazia → flat com zeros', () => {
    expect(computeAcsTrend([])).toEqual({
      metric: 'acs',
      direction: 'flat',
      first: 0,
      last: 0,
      delta: 0,
      perMatch: [],
    });
  });

  it('detecta tendência de alta (ordem cronológica a partir de entrada desordenada)', () => {
    const trend = computeAcsTrend([at(1, 240), at(0, 180)]);
    expect(trend).toEqual({ metric: 'acs', direction: 'up', first: 180, last: 240, delta: 60, perMatch: [180, 240] });
  });

  it('detecta tendência de baixa', () => {
    const trend = computeAcsTrend([at(0, 300), at(1, 200)]);
    expect(trend.direction).toBe('down');
    expect(trend.delta).toBe(-100);
  });

  it('detecta estabilidade', () => {
    expect(computeAcsTrend([at(0, 200), at(1, 200)]).direction).toBe('flat');
  });
});

describe('buildTrackerAggregations', () => {
  it('entrega o pacote completo', () => {
    const result = buildTrackerAggregations([summary({ matchId: 'm1' })]);
    expect(result.agents).toHaveLength(1);
    expect(result.maps).toHaveLength(1);
    expect(result.streaks.current).toEqual({ result: 'win', length: 1 });
    expect(result.trend.perMatch).toEqual([250]);
  });
});
