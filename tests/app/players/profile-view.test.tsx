import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PlayerProfileView, MatchesTab } from '@/app/players/[region]/[name]/[tag]/profile-view';
import {
  AgentsTab,
  GroupedStatTable,
  MapsTab,
} from '@/app/players/[region]/[name]/[tag]/agents-maps-sections';
import { AgentsMapsExplorer } from '@/app/players/[region]/[name]/[tag]/agents-maps-explorer';
import type { PlayerOverview } from '@/services/tracker/player-overview';
import type { GroupedStat } from '@/contracts/tracker';

/**
 * SUITE TDD — apresentação do perfil (RSC síncrono). O `Tabs` só renderiza o
 * painel ATIVO no SSR (Activity hidden), então testamos a view completa
 * (header + aba ativa) e as sub-views das abas separadamente.
 */

const overview: PlayerOverview = {
  player: {
    region: 'br',
    name: 'Player One',
    tag: 'BR1',
    platform: 'pc',
    level: 242,
    cardSrc: 'https://media.valorant-api.com/playercards/large.png',
  },
  rank: { tier: 'Diamond 1', imageSrc: 'https://media/rank-small.png', rrInTier: 55 },
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
  rrHistory: [
    {
      matchId: 'm-1',
      rr: 40,
      delta: 15,
      tier: 'Diamond 1',
      tierId: 18,
      result: 'win',
      date: '2026-10-02T00:00:00.000Z',
    },
    {
      matchId: 'm-2',
      rr: 55,
      delta: -5,
      tier: 'Diamond 1',
      tierId: 18,
      result: 'loss',
      date: '2026-10-03T00:00:00.000Z',
    },
  ],
};

describe('PlayerProfileView', () => {
  it('renderiza header do jogador, KPI strip, avaliação e coaching tips', () => {
    const html = renderToStaticMarkup(<PlayerProfileView overview={overview} />);
    expect(html).toContain('data-component="player-header"');
    expect(html).toContain('Player One');
    expect(html).toContain('#BR1');
    // Cartão + ícone de rank reais (HenrikDev) com preload
    expect(html).toContain('playercards/large.png');
    expect(html).toContain('data-player-rank');
    expect(html).toContain('rank-small.png');
    expect(html).toContain('data-player-level');
    expect(html).toContain('LVL 242');
    expect(html).toContain('Verificado');
    expect(html).toContain('RR Pool');
    expect(html).toContain('55 / 100');
    // Faixas de contexto e pipeline (Stitch)
    expect(html).toContain('data-context-strip');
    expect(html).toContain('data-pipeline-strip');
    // KPI strip com dados reais
    expect(html).toContain('data-kpi-strip');
    expect(html).toContain('K/D Ratio');
    expect(html).toContain('Win Rate');
    expect(html).toContain('1W 0D');
    expect(html).toContain('Headshot %');
    expect(html).toContain('KAST %');
    expect(html).toContain('First Blood / RD');
    expect(html).toContain('FB 3 / FD 2');
    expect(html).toContain('▲ +50 ACS');
    expect(html).toContain('Mira: Excelente');
    expect(html).toContain('Impacto: Equilibrado');
    expect(html).toContain('1 vitórias seguidas');
    expect(html).toContain('A mira é um ponto forte');
    // Hooks de coaching viram CoachingTips (Protocol advice, sem impacto inventado)
    expect(html).toContain('data-component="coaching-tip"');
    expect(html).toContain('data-coaching-tips');
    expect(html).not.toContain('IMPACTO ESTIMADO');
    // Trajetória de RR (dados reais do MMR history) + net da janela
    expect(html).toContain('Trajetória RR');
    expect(html).toContain('NET: +10 RR');
    expect(html).toContain('Atual: 55 RR (Diamond 1)');
    expect(html).toContain('data-chart="rr-trend"');
    // Últimas partidas jogadas embutidas no overview (Stitch)
    expect(html).toContain('Últimas 5 partidas jogadas');
    expect(html).toContain('data-component="match-history-table"');
    // Sandbox de IA rotulado como demo (reuso do console)
    expect(html).toContain('data-profile-ai-sandbox');
    expect(html).toContain('SANDBOX DEMO');
  });

  it('sem MMR history cai no estado vazio da trajetória', () => {
    const semRr: PlayerOverview = { ...overview, rrHistory: [] };
    const html = renderToStaticMarkup(<PlayerProfileView overview={semRr} />);
    expect(html).toContain('data-chart="rr-trend-empty"');
  });

  it('tendência de queda usa tom negativo no KPI e alimenta os pontos críticos', () => {
    const down: PlayerOverview = {
      ...overview,
      trend: { ...overview.trend, direction: 'down', delta: -30 },
    };
    const html = renderToStaticMarkup(<PlayerProfileView overview={down} />);
    expect(html).toContain('▼ -30 ACS');
    expect(html).toContain('text-loss');
    expect(html).toContain('Pontos críticos identificados');
    expect(html).toContain('tendência ACS: -30');
  });

  it('tela única VISÃO GERAL: sem seções ancoradas nem abas (navegação é o shell)', () => {
    const html = renderToStaticMarkup(<PlayerProfileView overview={overview} />);
    expect(html).toContain('data-player-profile');
    expect(html).toContain('data-insight-columns');
    expect(html).toContain('Pontos fortes computados');
    // Sem seção de agentes/mapas nem nav de âncoras (mudou para /breakdown)
    expect(html).not.toContain('data-agents-maps-explorer');
    expect(html).not.toContain('data-profile-section-nav');
    expect(html).not.toContain('role="tablist"');
  });

  it('motor de insights classifica tiers de agente em fortes/críticos', () => {
    const comAgentes: PlayerOverview = {
      ...overview,
      agents: [
        {
          key: 'Jett',
          matches: 10,
          wins: 7,
          losses: 3,
          winrate: 70,
          avgKills: 18,
          avgDeaths: 11,
          avgAssists: 5,
          kda: 2.09,
          avgAcs: 265,
          avgHsPercentage: 31,
        },
        {
          key: 'Cypher',
          matches: 8,
          wins: 3,
          losses: 5,
          winrate: 37.5,
          avgKills: 10,
          avgDeaths: 15,
          avgAssists: 4,
          kda: 0.93,
          avgAcs: 180,
          avgHsPercentage: 22,
        },
      ],
    };
    const html = renderToStaticMarkup(<PlayerProfileView overview={comAgentes} />);
    expect(html).toContain('main: Jett');
    expect(html).toContain('gargalo: Cypher');
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
  it('lista as partidas com link para o detalhe (com perspectiva do jogador)', () => {
    const html = renderToStaticMarkup(
      <MatchesTab matches={overview.matches} region="br" player={{ name: 'TenZ', tag: 'BR1' }} />,
    );
    expect(html).toContain('Ascent');
    expect(html).toContain('/matches/m-1?region=br&amp;player=TenZ%23BR1');
    expect(html).toContain('20/10/5');
  });

  it('preenche o ΔRR quando o MMR history casa por matchId', () => {
    const deltas = new Map([['m-1', 15]]);
    const html = renderToStaticMarkup(
      <MatchesTab
        matches={overview.matches}
        region="br"
        player={{ name: 'TenZ', tag: 'BR1' }}
        rrDeltas={deltas}
      />,
    );
    expect(html).toContain('+15');
  });

  it('estado vazio sem partidas', () => {
    expect(
      renderToStaticMarkup(
        <MatchesTab matches={[]} region="br" player={{ name: 'TenZ', tag: 'BR1' }} />,
      ),
    ).toContain('Sem partidas');
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
  it('classifica tier e nota tática na matriz de cards (sem radar nem tabela de agentes)', () => {
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
    // Radar e tabela de agentes foram removidos desta tela.
    expect(html).not.toContain('data-chart="agent-radar"');
    expect(html).not.toContain('Win%');
  });

  it('aplica a ordenação escolhida na matriz', () => {
    const agents = [
      groupStat('Jett', { winrate: 65, avgAcs: 265, avgKills: 18, avgDeaths: 11 }),
      groupStat('Omen', { key: 'Omen', winrate: 52, avgAcs: 210, avgKills: 13, avgDeaths: 12 }),
    ];
    const html = renderToStaticMarkup(
      <AgentsTab agents={agents} sort="winrate" direction="asc" />,
    );
    expect(html.indexOf('Omen')).toBeLessThan(html.indexOf('Jett'));
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
  it('classifica o map pool por faixa de WR e renderiza a barra de WR geral', () => {
    const maps = [
      groupStat('Ascent', { winrate: 72, matches: 18, wins: 13, losses: 5 }),
      groupStat('Breeze', { winrate: 31, matches: 8, wins: 2, losses: 6 }),
      groupStat('Haven', { winrate: 55 }),
      groupStat('Split', { winrate: 48 }),
    ];
    const html = renderToStaticMarkup(<MapsTab maps={maps} />);
    expect(html).toContain('data-map-cards');
    expect(html).toContain('Melhor mapa');
    expect(html).toContain('Positivo');
    expect(html).toContain('Neutro');
    expect(html).toContain('Desfavorável');
    expect(html).toContain('13V');
  });

  it('usa os splits DEF/ATK reais quando fornecidos', () => {
    const maps = [groupStat('Ascent', { winrate: 72, matches: 18 })];
    const sides = new Map([['Ascent', { attackPercent: 64, defensePercent: 80 }]]);
    const html = renderToStaticMarkup(<MapsTab maps={maps} sides={sides} />);
    expect(html).toContain('DEF');
    expect(html).toContain('80%');
    expect(html).toContain('ATK');
    expect(html).toContain('64%');
  });

  it('estado vazio sem agregações de mapa', () => {
    expect(renderToStaticMarkup(<MapsTab maps={[]} />)).toContain('Sem mapas');
  });
});

describe('AgentsMapsExplorer', () => {
  it('renderiza FilterBar com filtros reais e recomputa agentes/mapas do histórico', () => {
    const html = renderToStaticMarkup(<AgentsMapsExplorer matches={overview.matches} />);
    expect(html).toContain('data-agents-maps-explorer');
    expect(html).toContain('Filtros ativos:');
    expect(html).toContain('Temporada');
    expect(html).toContain('Todas as temporadas');
    expect(html).toContain('Fila');
    expect(html).toContain('Mínimo de 3 jogos');
    expect(html).toContain('data-sample-total');
    expect(html).toContain('Amostra total: 1 partidas');
    // Controles da matriz de agentes (papel + ordenação).
    expect(html).toContain('data-agent-controls');
    expect(html).toContain('Todos os papéis');
    expect(html).toContain('Ordenar por');
    expect(html).toContain('data-sort-direction="desc"');
    expect(html).toContain('1 agentes na amostra');
    // Recomputou agente/mapa a partir de overview.matches (não dos props prontos)
    expect(html).toContain('data-agent-cards');
    expect(html).toContain('Jett');
    expect(html).toContain('data-map-cards');
    expect(html).toContain('Ascent');
  });

  it('sem partidas cai nos estados vazios das duas seções', () => {
    const html = renderToStaticMarkup(<AgentsMapsExplorer matches={[]} />);
    expect(html).toContain('Amostra total: 0 partidas');
    expect(html).toContain('Sem agentes');
    expect(html).toContain('Sem mapas');
  });
});
