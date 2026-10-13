import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BreakdownView } from '@/app/players/[region]/[name]/[tag]/breakdown-view';
import { MatchHistoryCard } from '@/app/players/[region]/[name]/[tag]/match-history-card';
import { MatchHistorySidebar } from '@/app/players/[region]/[name]/[tag]/match-history-sidebar';
import { MatchHistoryTab } from '@/app/players/[region]/[name]/[tag]/match-history-tab';
import { buildHistoryMetrics } from '@/services/analytics/match-history';
import type { MatchSummary, RrHistoryPoint } from '@/contracts/tracker';
import type { PlayerOverview } from '@/services/tracker/player-overview';

/**
 * SUITE TDD — apresentação da tela "Partidas & Breakdown" (Stitch
 * "match-breakdown"): duas abas, KPIs e registro de partidas. Dados REAIS do
 * overview; campos sem suporte no contrato caem em `—` (nada fabricado).
 */

const match = (overrides: Partial<MatchSummary>): MatchSummary => ({
  matchId: 'm-1',
  region: 'br',
  map: 'Ascent',
  queue: 'competitive',
  season: 'V25A3',
  startedAt: '2026-10-02T00:00:00.000Z',
  gameLengthMs: 2_100_000,
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
  firstBloods: 4,
  firstDeaths: 2,
  ...overrides,
});

const rrPoint = (overrides: Partial<RrHistoryPoint>): RrHistoryPoint => ({
  matchId: 'm-1',
  rr: 55,
  delta: 15,
  tier: 'Diamond 1',
  tierId: 18,
  result: 'win',
  date: '2026-10-02T00:00:00.000Z',
  ...overrides,
});

const matches: readonly MatchSummary[] = [
  match({ matchId: 'm-1', startedAt: '2026-10-02T00:00:00.000Z' }),
  match({
    matchId: 'm-2',
    map: 'Breeze',
    agent: 'Cypher',
    result: 'loss',
    score: { us: 9, them: 13 },
    kills: 10,
    deaths: 20,
    acs: 150,
    hsPercentage: null,
    firstBloods: 1,
    firstDeaths: 5,
    startedAt: '2026-10-03T00:00:00.000Z',
  }),
];

const rrHistory: readonly RrHistoryPoint[] = [
  rrPoint({ matchId: 'm-1', delta: 15, rr: 55, date: '2026-10-02T00:00:00.000Z' }),
  rrPoint({
    matchId: 'm-2',
    delta: -18,
    rr: 37,
    result: 'loss',
    date: '2026-10-03T00:00:00.000Z',
  }),
];

const overview: PlayerOverview = {
  player: {
    region: 'br',
    name: 'Player One',
    tag: 'BR1',
    platform: 'pc',
    level: 242,
    cardSrc: null,
  },
  rank: { tier: 'Diamond 1', imageSrc: null, rrInTier: 55 },
  combat: {
    player: { region: 'br', name: 'Player One', tag: 'BR1', platform: 'pc' },
    evaluation: { aimClass: 'Excelente', impactClass: 'Equilibrado' },
    raw_metrics: {
      kdr: 2,
      kpr: 1,
      acs: 200,
      hsPercentage: 25,
      kast: 70,
      firstBloods: 5,
      firstDeaths: 7,
      matches: 2,
      rounds: 40,
    },
    contextual_rating: { kdr: 'Excelente' },
    coaching_hooks: ['A mira é um ponto forte (HS% 25%).'],
  },
  matches,
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
  rrHistory,
};

describe('BreakdownView', () => {
  it('renderiza as duas abas do Stitch e a matriz de agentes/mapas ativa por padrão', () => {
    const html = renderToStaticMarkup(<BreakdownView overview={overview} />);
    expect(html).toContain('data-breakdown-tabs');
    expect(html).toContain('role="tablist"');
    expect(html).toContain('Desempenho por agente &amp; mapa');
    expect(html).toContain('Partidas &amp; histórico completo');
    expect(html).toContain('2 partidas');
    // Aba 1 (agentes &amp; mapas) é a ativa no SSR.
    expect(html).toContain('data-agents-maps-explorer');
    expect(html).toContain('data-tab="agentes-mapas"');
    expect(html).toContain('aria-selected="true"');
    // A antiga lista "Últimas partidas jogadas" foi removida desta tela.
    expect(html).not.toContain('Últimas partidas jogadas');
    expect(html).not.toContain('data-component="match-history-table"');
  });

  it('sem MMR history usa o título do rank como elo base', () => {
    const html = renderToStaticMarkup(
      <BreakdownView overview={{ ...overview, rank: null }} />,
    );
    expect(html).toContain('data-breakdown-tabs');
    expect(html).toContain('Desempenho por agente &amp; mapa');
  });
});

describe('MatchHistoryTab', () => {
  it('renders filter matrix, KPIs, registry cards and AI sidebar with real coaching hooks', () => {
    const html = renderToStaticMarkup(
      <MatchHistoryTab
        matches={matches}
        rrHistory={rrHistory}
        player={{ region: 'br', name: 'Player One', tag: 'BR1' }}
        coachingHooks={['A mira é um ponto forte (HS% 25%).']}
        eloBase="Diamond 1"
      />,
    );
    expect(html).toContain('data-match-history-tab');
    expect(html).toContain('Filtros ativos:');
    expect(html).toContain('Todos os agentes');
    expect(html).toContain('Todos os mapas');
    expect(html).toContain('Elo base: Diamond 1');
    expect(html).toContain('Indexados: 2 partidas');
    // Fita de KPIs.
    expect(html).toContain('data-history-kpis');
    expect(html).toContain('Winrate');
    expect(html).toContain('50%');
    expect(html).toContain('Net RR');
    expect(html).toContain('K/D médio');
    expect(html).toContain('ACS médio');
    expect(html).toContain('Precisão (HS%)');
    expect(html).toContain('First bloods');
    // Registro + painel IA (hooks reais).
    expect(html).toContain('data-history-registry');
    expect(html).toContain('data-history-coaching-hooks');
    expect(html).toContain('A mira é um ponto forte');
    expect(html).toContain('Registro telemétrico • 2 partidas na janela');
  });

  it('sem partidas cai no estado vazio do registro', () => {
    const html = renderToStaticMarkup(
      <MatchHistoryTab
        matches={[]}
        rrHistory={[]}
        player={{ region: 'br', name: 'Player One', tag: 'BR1' }}
        coachingHooks={[]}
      />,
    );
    expect(html).toContain('data-state="empty"');
    expect(html).toContain('Sem partidas no filtro');
    // Elo base ausente não renderiza o badge.
    expect(html).not.toContain('Elo base:');
  });
});

describe('MatchHistoryCard', () => {
  it('renderiza resultado, agente, placar/mapa, ΔRR e link real para o detalhe', () => {
    const html = renderToStaticMarkup(
      <MatchHistoryCard
        match={matches[0]!}
        region="br"
        player={{ name: 'TenZ', tag: 'BR1' }}
        rrDelta={15}
        rrPoint={rrPoint({})}
        now={new Date('2026-10-02T02:00:00.000Z')}
      />,
    );
    expect(html).toContain('data-component="match-history-card"');
    expect(html).toContain('data-result="win"');
    expect(html).toContain('Vitória');
    expect(html).toContain('Jett');
    expect(html).toContain('Ascent');
    expect(html).toContain('13 - 7');
    expect(html).toContain('+15 RR');
    expect(html).toContain('Diamond 1 • 55 RR');
    expect(html).toContain('20 / 10 / 5');
    expect(html).toContain('250');
    expect(html).toContain('30%');
    expect(html).toContain('/matches/m-1?region=br&amp;player=TenZ%23BR1');
    expect(html).toContain('Ver análise profunda');
  });

  it('campos sem suporte viram travessão e derrota usa tom de perda', () => {
    const html = renderToStaticMarkup(
      <MatchHistoryCard
        match={match({
          result: 'loss',
          agent: null,
          hsPercentage: null,
          firstBloods: undefined,
          firstDeaths: undefined,
          gameLengthMs: 0,
        })}
        region="br"
        player={{ name: 'TenZ', tag: 'BR1' }}
      />,
    );
    expect(html).toContain('data-result="loss"');
    expect(html).toContain('Derrota');
    expect(html).toContain('>—<');
    expect(html).not.toContain('+ RR');
    // Sem ΔRR não há bloco de RR.
    expect(html).not.toContain(' RR</div>');
  });
});

describe('MatchHistorySidebar', () => {
  const metrics = buildHistoryMetrics(matches, new Map([['m-1', 15], ['m-2', -18]]));

  it('renderiza diagnóstico, barras de ΔRR e rodapé telemétrico', () => {
    const html = renderToStaticMarkup(
      <MatchHistorySidebar coachingHooks={['Melhore o posicionamento.']} rrPoints={rrHistory} metrics={metrics} />,
    );
    expect(html).toContain('data-component="match-history-sidebar"');
    expect(html).toContain('Diagnóstico do Coach IA');
    expect(html).toContain('data-history-coaching-hooks');
    expect(html).toContain('Melhore o posicionamento.');
    expect(html).toContain('Tendência de ΔRR (janela)');
    expect(html).toContain('Registro telemétrico • 2 partidas na janela');
  });

  it('sem hooks nem janela de RR cai no estado vazio do painel', () => {
    const empty = buildHistoryMetrics([], new Map());
    const html = renderToStaticMarkup(
      <MatchHistorySidebar coachingHooks={[]} rrPoints={[]} metrics={empty} />,
    );
    expect(html).toContain('Nenhuma leitura de coaching disponível');
    expect(html).not.toContain('Tendência de ΔRR (janela)');
    expect(html).toContain('Registro telemétrico • 0 partidas na janela');
  });
});
