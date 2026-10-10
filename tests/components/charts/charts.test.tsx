import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AgentStat, GroupedStat, KillEvent, MatchRound } from '@/contracts/tracker';
import {
  AgentRadar,
  MapWinrateBars,
  RoundHeatmap,
  TrendLine,
} from '@/components/charts';

/**
 * SUITE TDD — componentes de chart (visx): só renderizam o que as
 * transformações puras produzem (server-safe, sem estado).
 */

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

const grouped = (key: string, winrate: number, matches: number): GroupedStat => ({
  key,
  matches,
  wins: 1,
  losses: matches - 1,
  winrate,
  avgKills: 15,
  avgDeaths: 12,
  avgAssists: 5,
  kda: 2,
  avgAcs: 200,
  avgHsPercentage: 25,
});

describe('TrendLine', () => {
  it('renderiza linha, pontos e eixo (SVG)', () => {
    const html = renderToStaticMarkup(<TrendLine values={[180, 240, 200]} />);

    expect(html).toContain('data-chart="trend-line"');
    expect(html).toContain('role="img"');
    expect(html).toContain('<path');
    expect(html).toContain('<circle');
    expect(html).toContain('ACS');
  });

  it('estado vazio sem partidas', () => {
    expect(renderToStaticMarkup(<TrendLine values={[]} />)).toContain(
      'Sem partidas suficientes',
    );
  });
});

describe('MapWinrateBars', () => {
  it('renderiza barras com rótulo e winrate ordenados', () => {
    const html = renderToStaticMarkup(
      <MapWinrateBars stats={[grouped('Haven', 33.3, 3), grouped('Ascent', 66.7, 3)]} />,
    );

    expect(html).toContain('data-chart="map-winrate-bars"');
    expect(html).toContain('Ascent');
    expect(html).toContain('66.7%');
    expect(html).toContain('33.3%');
    expect(html).toContain('var(--color-win)');
    expect(html).toContain('var(--color-loss)');
  });

  it('estado vazio sem mapas', () => {
    expect(renderToStaticMarkup(<MapWinrateBars stats={[]} />)).toContain(
      'Sem mapas jogados',
    );
  });
});

describe('AgentRadar', () => {
  it('renderiza polígono do agente + baseline + eixos', () => {
    const html = renderToStaticMarkup(<AgentRadar agents={[agent('Jett'), agent('Reyna')]} />);

    expect(html).toContain('data-chart="agent-radar"');
    for (const axis of ['Winrate', 'KDA', 'ACS', 'HS%']) {
      expect(html).toContain(axis);
    }
    expect(html).toContain('<polygon');
    expect(html).toContain('Jett (tinta) vs. média do jogador');
  });

  it('agente ausente nas agregações → estado vazio', () => {
    expect(renderToStaticMarkup(<AgentRadar agents={[]} />)).toContain(
      'Sem dados de agente',
    );
  });
});

describe('RoundHeatmap', () => {
  const rounds: MatchRound[] = [
    { roundNumber: 1, winningTeamId: 'Red', plantSite: 'A', defused: false },
    { roundNumber: 2, winningTeamId: 'Blue', plantSite: null, defused: true },
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
    weapon: null,
  });

  it('renderiza uma célula por round com marcadores plant/defuse', () => {
    const html = renderToStaticMarkup(
      <RoundHeatmap rounds={rounds} kills={[kill(1), kill(1), kill(2)]} teamId="Red" />,
    );

    expect(html).toContain('data-chart="round-heatmap"');
    expect((html.match(/<rect /g) ?? []).length).toBe(2);
    expect(html).toContain('Round 1');
    expect(html).toContain('2 abate(s)');
    expect(html).toContain('plant A');
    expect(html).toContain('defuse');
  });

  it('estado vazio sem rounds', () => {
    expect(
      renderToStaticMarkup(<RoundHeatmap rounds={[]} kills={[]} teamId="Red" />),
    ).toContain('Sem timeline de rounds');
  });
});
