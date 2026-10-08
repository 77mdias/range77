import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  GroupedStatTable,
  MatchesTab,
  PlayerProfileView,
} from '@/app/players/[region]/[name]/[tag]/profile-view';
import type { PlayerOverview } from '@/services/tracker/player-overview';

/**
 * SUITE TDD — apresentação do perfil (RSC síncrono). O `Tabs` só renderiza o
 * painel ATIVO no SSR (Activity hidden), então testamos a view completa
 * (header + aba ativa) e as sub-views das abas separadamente.
 */

const overview: PlayerOverview = {
  player: { region: 'br', name: 'Player One', tag: 'BR1', platform: 'pc' },
  combat: {
    player: { region: 'br', name: 'Player One', tag: 'BR1', platform: 'pc' },
    evaluation: { aimClass: 'Excelente', impactClass: 'Equilibrado' },
    raw_metrics: {
      kdr: 2,
      kpr: 1,
      acs: 200,
      hsPercentage: 25,
      kast: 70,
      firstBloods: 3,
      firstDeaths: 2,
      matches: 2,
      rounds: 40,
    },
    contextual_rating: { kdr: 'Excelente' },
    coaching_hooks: ['A mira é um ponto forte (HS% 25%).'],
  },
  matches: [
    {
      matchId: 'm-1',
      region: 'br',
      map: 'Ascent',
      queue: 'competitive',
      season: 'V25A3',
      startedAt: '2026-10-02T00:00:00.000Z',
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
    },
  ],
  agents: [
    {
      key: 'Jett',
      matches: 1,
      wins: 1,
      losses: 0,
      winrate: 100,
      avgKills: 20,
      avgDeaths: 10,
      avgAssists: 5,
      kda: 2.5,
      avgAcs: 250,
      avgHsPercentage: 30,
    },
  ],
  maps: [
    {
      key: 'Ascent',
      matches: 1,
      wins: 1,
      losses: 0,
      winrate: 100,
      avgKills: 20,
      avgDeaths: 10,
      avgAssists: 5,
      kda: 2.5,
      avgAcs: 250,
      avgHsPercentage: null,
    },
  ],
  streaks: { current: { result: 'win', length: 1 }, longestWin: 1, longestLoss: 0 },
  trend: { metric: 'acs', direction: 'up', first: 200, last: 250, delta: 50, perMatch: [200, 250] },
};

describe('PlayerProfileView', () => {
  it('renderiza header, métricas, avaliação e hooks (aba ativa)', () => {
    const html = renderToStaticMarkup(<PlayerProfileView overview={overview} />);
    expect(html).toContain('Player One');
    expect(html).toContain('#BR1');
    expect(html).toContain('KDR');
    expect(html).toContain('HS%');
    expect(html).toContain('ACS');
    expect(html).toContain('Mira: Excelente');
    expect(html).toContain('Impacto: Equilibrado');
    expect(html).toContain('1 vitórias seguidas');
    expect(html).toContain('A mira é um ponto forte');
  });

  it('expõe as 4 abas', () => {
    const html = renderToStaticMarkup(<PlayerProfileView overview={overview} />);
    for (const label of ['Visão Geral', 'Partidas', 'Agentes', 'Mapas']) {
      expect(html).toContain(label);
    }
  });

  it('mostra "Sem sequência" quando não há streak atual', () => {
    const noStreak: PlayerOverview = {
      ...overview,
      streaks: { current: { result: 'none', length: 0 }, longestWin: 0, longestLoss: 0 },
    };
    expect(renderToStaticMarkup(<PlayerProfileView overview={noStreak} />)).toContain(
      'Sem sequência',
    );
  });
});

describe('MatchesTab', () => {
  it('lista as partidas com link para o detalhe', () => {
    const html = renderToStaticMarkup(<MatchesTab matches={overview.matches} region="br" />);
    expect(html).toContain('Ascent');
    expect(html).toContain('/matches/m-1?region=br');
    expect(html).toContain('20/10/5');
  });

  it('estado vazio sem partidas', () => {
    expect(renderToStaticMarkup(<MatchesTab matches={[]} region="br" />)).toContain('Sem partidas');
  });
});

describe('GroupedStatTable', () => {
  it('renderiza as linhas agregadas', () => {
    const html = renderToStaticMarkup(<GroupedStatTable rows={overview.agents} keyLabel="Agente" />);
    expect(html).toContain('Agente');
    expect(html).toContain('Jett');
    expect(html).toContain('100%');
    expect(html).toContain('2.5');
  });

  it('estado vazio sem agregações', () => {
    expect(
      renderToStaticMarkup(<GroupedStatTable rows={[]} keyLabel="Mapa" />),
    ).toContain('Sem dados');
  });
});
