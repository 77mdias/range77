import { describe, expect, it } from 'vitest';
import type { AgentStat, KillEvent, MatchRound } from '@/contracts/tracker';
import {
  buildAgentRadar,
  buildRoundHeatmapCells,
  buildTrendPoints,
  buildWinrateBars,
  RADAR_GUIDE_RATIOS,
  radarPolygonPoints,
  valueDomain,
} from '@/services/analytics/chart-transforms';

/**
 * SUITE TDD — transformações puras dos charts (100% de cobertura).
 */

describe('buildTrendPoints / valueDomain', () => {
  it('mapeia a série cronológica em pontos (index, value)', () => {
    expect(buildTrendPoints([180, 240])).toEqual([
      { index: 0, value: 180 },
      { index: 1, value: 240 },
    ]);
    expect(buildTrendPoints([])).toEqual([]);
  });

  it('domínio: vazia → [0,1]; plana → ±1; com dados → folga de 5%', () => {
    expect(valueDomain([])).toEqual([0, 1]);
    expect(valueDomain([200, 200])).toEqual([199, 201]);
    expect(valueDomain([0, 100])).toEqual([-5, 105]);
    // span pequeno → folga mínima de 0.5
    expect(valueDomain([10, 10.5])).toEqual([9.5, 11]);
  });
});

describe('buildWinrateBars', () => {
  const stat = (key: string, winrate: number, matches: number) => ({
    key,
    matches,
    wins: winrate >= 50 ? matches : 0,
    losses: 0,
    winrate,
    avgKills: 0,
    avgDeaths: 0,
    avgAssists: 0,
    kda: 0,
    avgAcs: 0,
    avgHsPercentage: null,
  });

  it('ordena por winrate desc, depois partidas desc, depois chave asc', () => {
    const bars = buildWinrateBars([
      stat('Icebox', 50, 2),
      stat('Ascent', 66.7, 3),
      stat('Bind', 66.7, 5),
      stat('Haven', 33.3, 4),
      stat('Split', 66.7, 5),
    ]);

    expect(bars.map((bar) => bar.key)).toEqual(['Bind', 'Split', 'Ascent', 'Icebox', 'Haven']);
    expect(bars[0]).toMatchObject({ key: 'Bind', winrate: 66.7, matches: 5 });
  });

  it('lista vazia → barras vazias', () => {
    expect(buildWinrateBars([])).toEqual([]);
  });
});

describe('buildRoundHeatmapCells', () => {
  const rounds: MatchRound[] = [
    { roundNumber: 1, winningTeamId: 'Red', plantSite: 'A', plantTeamId: 'Red', defused: false },
    { roundNumber: 2, winningTeamId: 'Blue', plantSite: null, plantTeamId: null, defused: true },
  ];

  const kill = (roundNumber: number): KillEvent => ({
    roundNumber,
    timeInMatchMs: 0,
    timeInRoundMs: null,
    killerPuuid: 'k',
    killerName: 'K',
    victimPuuid: 'v',
    victimName: 'V',
    assistantNames: [],
    assistantPuuids: [],
    weapon: null,
  });

  it('cor = resultado relativo ao teamId; kills contados por round', () => {
    const cells = buildRoundHeatmapCells(rounds, [kill(1), kill(1), kill(2), kill(2), kill(2)], 'Red');

    expect(cells).toEqual([
      { roundNumber: 1, result: 'win', kills: 2, plantSite: 'A', defused: false },
      { roundNumber: 2, result: 'loss', kills: 3, plantSite: null, defused: true },
    ]);
  });

  it('round sem abates → kills 0', () => {
    const cells = buildRoundHeatmapCells(rounds, [], 'Blue');
    expect(cells.map((cell) => cell.kills)).toEqual([0, 0]);
    expect(cells.map((cell) => cell.result)).toEqual(['loss', 'win']);
  });
});

describe('buildAgentRadar', () => {
  const agent = (key: string, overrides: Partial<AgentStat> = {}): AgentStat => ({
    key,
    matches: 2,
    wins: 1,
    losses: 1,
    winrate: 50,
    avgKills: 15,
    avgDeaths: 12,
    avgAssists: 5,
    kda: 2,
    avgAcs: 200,
    avgHsPercentage: 25,
    ...overrides,
  });

  it('retorna null para agente ausente nas agregações', () => {
    expect(buildAgentRadar([agent('Jett')], 'Reyna')).toBeNull();
  });

  it('normaliza os 4 eixos (Winrate/KDA/ACS/HS%) com média como baseline', () => {
    const axes = buildAgentRadar(
      [agent('Jett', { winrate: 50, kda: 2.5, avgAcs: 175, avgHsPercentage: 25 }), agent('Reyna')],
      'Jett',
    );

    expect(axes).toEqual([
      { axis: 'Winrate', value: 0.5, baseline: 0.5 }, // (50+50)/(100*2)
      { axis: 'KDA', value: 0.5, baseline: 0.45 }, // (2.5+2)/(5*2)
      { axis: 'ACS', value: 0.5, baseline: 0.536 }, // (175+200)/(350*2) → 0.5357
      { axis: 'HS%', value: 0.5, baseline: 0.5 }, // (25+25)/(50*2)
    ]);
  });

  it('satura em 1 quando a métrica passa o cap e usa 0 sem dados de HS%', () => {
    const axes = buildAgentRadar(
      [agent('Jett', { kda: 8, avgAcs: 999, winrate: 100, avgHsPercentage: null })],
      'Jett',
    );

    expect(axes).toEqual([
      { axis: 'Winrate', value: 1, baseline: 1 },
      { axis: 'KDA', value: 1, baseline: 1 }, // 8/5=1.6 → clamp01
      { axis: 'ACS', value: 1, baseline: 1 }, // 999/350=2.85 → clamp01
      { axis: 'HS%', value: 0, baseline: 0 },
    ]);
  });
});

describe('radarPolygonPoints', () => {
  it('primeiro eixo no topo; raio escala com o valor', () => {
    const points = radarPolygonPoints([1, 0], 100, 100, 80);
    expect(points[0]).toEqual({ x: 100, y: 20 }); // topo: (100, 100-80)
    expect(points[1]).toEqual({ x: 100, y: 100 }); // valor 0 → centro
  });

  it('satura valores acima de 1 e lida com lista vazia', () => {
    expect(radarPolygonPoints([], 0, 0, 10)).toEqual([]);
    const [saturated] = radarPolygonPoints([2], 0, 0, 10);
    expect(saturated).toEqual({ x: 0, y: -10 });
  });

  it('expõe os anéis-guia (0.25–1)', () => {
    expect(RADAR_GUIDE_RATIOS).toEqual([0.25, 0.5, 0.75, 1]);
  });
});
