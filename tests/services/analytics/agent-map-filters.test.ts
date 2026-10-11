import { describe, expect, it } from 'vitest';
import {
  FILTER_ALL,
  distinctSortedDesc,
  filterByMinMatches,
  filterMatchesForProfiles,
  queueOptions,
  seasonOptions,
} from '@/services/analytics/agent-map-filters';
import type { GroupedStat, MatchSummary } from '@/contracts/tracker';

/**
 * SUITE TDD — agent-map-filters: filtros REAIS da seção "Agentes & Mapas"
 * (temporada/fila sobre `MatchSummary`, amostra mínima sobre `GroupedStat`).
 */

function match(overrides: Partial<MatchSummary> = {}): MatchSummary {
  return {
    matchId: 'm',
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
    ...overrides,
  };
}

function stat(overrides: Partial<GroupedStat> = {}): GroupedStat {
  return {
    key: 'Jett',
    matches: 10,
    wins: 6,
    losses: 4,
    winrate: 60,
    avgKills: 15,
    avgDeaths: 12,
    avgAssists: 5,
    kda: 1.67,
    avgAcs: 230,
    avgHsPercentage: 25,
    ...overrides,
  };
}

describe('filterMatchesForProfiles', () => {
  const matches = [
    match({ matchId: 'a', season: 'V25A3', queue: 'competitive' }),
    match({ matchId: 'b', season: 'V25A1', queue: 'competitive' }),
    match({ matchId: 'c', season: 'V25A3', queue: 'premier' }),
  ];

  it('sem filtros ativos devolve todas as partidas', () => {
    const filtered = filterMatchesForProfiles(matches, { season: null, queue: null });
    expect(filtered.map((m) => m.matchId)).toEqual(['a', 'b', 'c']);
  });

  it('filtra por temporada', () => {
    const filtered = filterMatchesForProfiles(matches, { season: 'V25A1', queue: null });
    expect(filtered.map((m) => m.matchId)).toEqual(['b']);
  });

  it('filtra por fila e combina com temporada', () => {
    expect(
      filterMatchesForProfiles(matches, { season: null, queue: 'premier' }).map((m) => m.matchId),
    ).toEqual(['c']);
    expect(
      filterMatchesForProfiles(matches, { season: 'V25A3', queue: 'competitive' }).map(
        (m) => m.matchId,
      ),
    ).toEqual(['a']);
  });

  it('temporada nula na partida nunca casa com filtro ativo', () => {
    const noSeason = [match({ matchId: 'x', season: null })];
    expect(filterMatchesForProfiles(noSeason, { season: 'V25A3', queue: null })).toEqual([]);
    expect(filterMatchesForProfiles(noSeason, { season: null, queue: null })).toEqual(noSeason);
  });

  it('lista vazia devolve lista vazia', () => {
    expect(filterMatchesForProfiles([], { season: null, queue: null })).toEqual([]);
  });
});

describe('filterByMinMatches', () => {
  it('mantém apenas grupos com amostra >= mínimo', () => {
    const stats = [stat({ key: 'A', matches: 3 }), stat({ key: 'B', matches: 2 })];
    expect(filterByMinMatches(stats, 3).map((s) => s.key)).toEqual(['A']);
  });

  it('mínimo nulo devolve a lista intacta', () => {
    const stats = [stat({ matches: 1 })];
    expect(filterByMinMatches(stats, null)).toBe(stats);
  });

  it('lista vazia devolve lista vazia', () => {
    expect(filterByMinMatches([], 3)).toEqual([]);
  });
});

describe('distinctSortedDesc', () => {
  it('remove nulos/duplicados e ordena desc', () => {
    expect(
      distinctSortedDesc(['V25A1', null, 'V25A3', 'V25A1', null, 'V24A3']),
    ).toEqual(['V25A3', 'V25A1', 'V24A3']);
  });

  it('lista sem valores vira lista vazia', () => {
    expect(distinctSortedDesc([])).toEqual([]);
    expect(distinctSortedDesc([null, null])).toEqual([]);
  });
});

describe('seasonOptions / queueOptions', () => {
  it('temporadas: opção "todas" + valores distintos desc', () => {
    const options = seasonOptions([
      match({ season: 'V25A1' }),
      match({ season: 'V25A3' }),
      match({ season: null }),
    ]);
    expect(options[0]).toEqual({ value: FILTER_ALL, label: 'Todas as temporadas' });
    expect(options.slice(1).map((o) => o.value)).toEqual(['V25A3', 'V25A1']);
  });

  it('filas: opção "todas" + rótulo capitalizado', () => {
    const options = queueOptions([match({ queue: 'competitive' }), match({ queue: 'premier' })]);
    expect(options[0]).toEqual({ value: FILTER_ALL, label: 'Todas as filas' });
    expect(options.slice(1)).toEqual([
      { value: 'premier', label: 'Premier' },
      { value: 'competitive', label: 'Competitive' },
    ]);
  });

  it('sem partidas: apenas a opção "todas"', () => {
    expect(seasonOptions([])).toEqual([{ value: FILTER_ALL, label: 'Todas as temporadas' }]);
    expect(queueOptions([])).toEqual([{ value: FILTER_ALL, label: 'Todas as filas' }]);
  });
});
