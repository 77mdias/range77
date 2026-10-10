import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  AgentsTab,
  GroupedStatTable,
  MapsTab,
  MatchesTab,
  PlayerProfileView,
} from '@/app/players/[region]/[name]/[tag]/profile-view';
import type { PlayerOverview } from '@/services/tracker/player-overview';
import type { GroupedStat } from '@/contracts/tracker';

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
  it('renderiza header do jogador, KPI strip, avaliação e hooks (aba ativa)', () => {
    const html = renderToStaticMarkup(<PlayerProfileView overview={overview} />);
    expect(html).toContain('data-component="player-header"');
    expect(html).toContain('Player One');
    expect(html).toContain('#BR1');
    expect(html).toContain('data-component="kpi-tile"');
    expect(html).toContain('K/D');
    expect(html).toContain('HS%');
    expect(html).toContain('KAST');
    expect(html).toContain('▲ +50 ACS');
    expect(html).toContain('Mira: Excelente');
    expect(html).toContain('Impacto: Equilibrado');
    expect(html).toContain('1 vitórias seguidas');
    expect(html).toContain('A mira é um ponto forte');
  });

  it('tendência de queda usa tom negativo no KPI', () => {
    const down: PlayerOverview = {
      ...overview,
      trend: { ...overview.trend, direction: 'down', delta: -30 },
    };
    const html = renderToStaticMarkup(<PlayerProfileView overview={down} />);
    expect(html).toContain('▼ -30 ACS');
    expect(html).toContain('text-loss');
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

function groupStat(key: string, overrides: Partial<GroupedStat> = {}): GroupedStat {
  return {
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
    key: overrides.key ?? key,
  };
}

describe('AgentsTab', () => {
  it('classifica tier, nota tática e mantém radar + tabela', () => {
    const agents = [
      groupStat('Jett', { winrate: 65, avgAcs: 265, avgKills: 18, avgDeaths: 11 }),
      groupStat('Cypher', { key: 'Cypher', winrate: 40, avgKills: 10, avgDeaths: 15 }),
      groupStat('Omen', { key: 'Omen', winrate: 52, avgKills: 13, avgDeaths: 12 }),
    ];
    const html = renderToStaticMarkup(<AgentsTab agents={agents} />);
    expect(html).toContain('data-agent-cards');
    expect(html).toContain('Tier S main');
    expect(html).toContain('Status tático // recomendado:');
    expect(html).toContain('Bottleneck');
    expect(html).toContain('Alerta // gargalo crítico:');
    expect(html).toContain('Solid sec');
    expect(html).toContain('// Viável:');
  });

  it('role ausente no payload não quebra o card', () => {
    const html = renderToStaticMarkup(<AgentsTab agents={[groupStat('Phoenix', { winrate: 47 })]} />);
    expect(html).toContain('Phoenix');
    expect(html).toContain('10 partidas');
  });

  it('K/D derivado exibe 2 casas e HS% nulo vira travessão', () => {
    const html = renderToStaticMarkup(
      <AgentsTab agents={[groupStat('Jett', { avgKills: 18, avgDeaths: 11, avgHsPercentage: null })]} />,
    );
    expect(html).toContain('1.64');
    expect(html).toContain('—');
  });

  it('estado vazio sem agregações de agente', () => {
    expect(renderToStaticMarkup(<AgentsTab agents={[]} />)).toContain('Sem agentes');
  });
});

describe('MapsTab', () => {
  it('classifica o map pool e usa barra única de WR', () => {
    const maps = [
      groupStat('Ascent', { winrate: 72, matches: 18, wins: 13, losses: 5 }),
      groupStat('Breeze', { winrate: 31, matches: 8, wins: 2, losses: 6 }),
      groupStat('Haven', { winrate: 55 }),
      groupStat('Split', { winrate: 48 }),
    ];
    const html = renderToStaticMarkup(<MapsTab maps={maps} />);
    expect(html).toContain('data-map-cards');
    expect(html).toContain('Melhor mapa');
    expect(html).toContain('Pior mapa');
    expect(html).toContain('Estável');
    expect(html).toContain('Neutro');
    expect(html).toContain('WR 72%');
    expect(html).toContain('13V');
  });

  it('estado vazio sem agregações de mapa', () => {
    expect(renderToStaticMarkup(<MapsTab maps={[]} />)).toContain('Sem mapas');
  });
});
