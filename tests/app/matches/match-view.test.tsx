import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MatchView } from '@/app/matches/[matchId]/match-view';
import type { MatchDetail } from '@/contracts/tracker';

/**
 * SUITE TDD — apresentação do detalhe de partida (RSC síncrono): header,
 * placar, faixa round-a-round e scoreboard duplo.
 */

const detail: MatchDetail = {
  matchId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  region: 'br',
  map: 'Ascent',
  queue: 'competitive',
  season: 'V25A3',
  startedAt: '2026-10-01T12:00:00.000Z',
  gameLengthMs: 2_400_000,
  isCompleted: true,
  teams: [
    { teamId: 'Red', won: true, roundsWon: 13, roundsLost: 7 },
    { teamId: 'Blue', won: false, roundsWon: 7, roundsLost: 13 },
  ],
  scoreboard: [
    {
      puuid: 'p1',
      name: 'TenZ',
      tag: 'BR1',
      teamId: 'Red',
      agent: 'Jett',
      tier: 'Immortal 3',
      kills: 24,
      deaths: 14,
      assists: 6,
      score: 6000,
      acs: 300,
      hsPercentage: 30,
      damageDealt: 4000,
      damageReceived: 2500,
      economy: null,
      abilityCasts: null,
    },
    {
      puuid: 'p2',
      name: 'Enemy',
      tag: 'NA1',
      teamId: 'Blue',
      agent: 'Reyna',
      tier: null,
      kills: 10,
      deaths: 20,
      assists: 3,
      score: 3000,
      acs: 150,
      hsPercentage: null,
      damageDealt: 1000,
      damageReceived: 3000,
      economy: null,
      abilityCasts: null,
    },
  ],
  rounds: [
    { roundNumber: 1, winningTeamId: 'Red', plantSite: 'A', defused: false },
    { roundNumber: 2, winningTeamId: 'Blue', plantSite: null, defused: true },
  ],
  kills: [],
};

describe('MatchView', () => {
  it('renderiza mapa, placar, rounds e os dois scoreboards', () => {
    const html = renderToStaticMarkup(<MatchView detail={detail} />);
    expect(html).toContain('Ascent');
    expect(html).toContain('competitive');
    expect(html).toContain('Time Red');
    expect(html).toContain('Time Blue');
    expect(html).toContain('TenZ');
    expect(html).toContain('Enemy');
    expect(html).toContain('24/14/6');
    expect(html).toContain('data-round-strip');
    expect(html).toContain('data-match-score');
  });

  it('estado vazio quando a partida não trouxe times/jogadores', () => {
    const empty: MatchDetail = { ...detail, teams: [], scoreboard: [], rounds: [] };
    expect(renderToStaticMarkup(<MatchView detail={empty} />)).toContain('Sem dados da partida');
  });

  it('deriva times do scoreboard quando teams[] está ausente', () => {
    const noTeams: MatchDetail = { ...detail, teams: [] };
    const html = renderToStaticMarkup(<MatchView detail={noTeams} />);
    expect(html).toContain('Time Red');
    expect(html).toContain('Time Blue');
  });
});
