import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MatchView } from '@/app/(app)/matches/[matchId]/match-view';
import type { MatchDetail } from '@/contracts/tracker';

/**
 * SUITE TDD — apresentação do detalhe de partida (RSC síncrono) no design
 * Stitch: MatchMetaBar, ScoreBanner, RoundTimeline classificada e scoreboard
 * duplo via o componente `ScoreboardTable` do design system.
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
      kastPercentage: 50,
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
      kastPercentage: null,
      economy: null,
      abilityCasts: null,
    },
  ],
  rounds: [
    { roundNumber: 1, winningTeamId: 'Red', plantSite: 'A', plantTeamId: 'Red', defused: false },
    { roundNumber: 2, winningTeamId: 'Blue', plantSite: null, plantTeamId: null, defused: true },
  ],
  kills: [],
};

describe('MatchView', () => {
  it('renderiza meta bar, banner de placar, timeline e os dois scoreboards', () => {
    const html = renderToStaticMarkup(<MatchView detail={detail} />);
    expect(html).toContain('data-component="match-meta-bar"');
    expect(html).toContain('COMPETITIVE');
    expect(html).toContain('Ascent');
    expect(html).toContain('Duração: 40:00');
    expect(html).toContain('data-component="score-banner"');
    expect(html).toContain('13');
    expect(html).toContain('data-component="round-timeline"');
    expect(html).toContain('Tabela telemétrica da partida');
    expect(html).toContain('Ranked MMR range');
    expect(html).toContain('Time Red');
    expect(html).toContain('Time Blue');
    expect(html).toContain('TenZ');
    expect(html).toContain('Enemy');
    expect(html).toContain('24 / 14 / 6');
    expect(html).toContain('+10');
    expect(html).toContain('Immortal 3');
    // Logo do elo derivado do tier do scoreboard (tabela local de assets).
    expect(html).toContain('/assets/images/ranks/immortal-3.png');
  });

  it('usa a perspectiva do jogador buscado: VOCÊ, W/L e DEF/ATK do time dele', () => {
    const html = renderToStaticMarkup(
      <MatchView
        detail={detail}
        viewer={{ name: 'TenZ', tag: 'BR1' }}
        mvpCardSrc="/assets/images/cards/player-card.png"
      />,
    );
    expect(html).toContain('VOCÊ');
    expect(html).toContain('Vitória');
    expect(html).toContain('Time aliado');
    expect(html).toContain('Time adversário');
    // Metades do time do jogador: ATK 1-1 (rounds 1 e 2), DEF 0-0.
    expect(html).toContain('DEF: 0-0 • ATK: 1-1');
    // Splits por metade (HALF-ONE 1–12 / HALF-TWO 13+): rounds 1 e 2.
    expect(html).toContain('data-half-splits');
    expect(html).toContain('Half-One');
    expect(html).toContain('Half-Two');
    expect(html).toContain('1-1');
    expect(html).toContain('/assets/images/cards/player-card.png');
  });

  it('sem jogador informado a página fica neutra (sem VOCÊ nem DEF/ATK)', () => {
    const html = renderToStaticMarkup(<MatchView detail={detail} />);
    expect(html).not.toContain('VOCÊ');
    expect(html).not.toContain('DEF:');
    expect(html).toContain('Time Red');
    expect(html).toContain('Time Blue');
  });

  it('HS% indisponível vira travessão no scoreboard', () => {
    const html = renderToStaticMarkup(<MatchView detail={detail} />);
    expect(html).toContain('—');
  });

  it('monta MVP (maior ACS) com FK/FD dos eventos e dano total por time', () => {
    const withKills: MatchDetail = {
      ...detail,
      kills: [
        {
          roundNumber: 1,
          timeInMatchMs: 1000,
          timeInRoundMs: 1000,
          killerPuuid: 'p1',
          killerName: 'TenZ',
          victimPuuid: 'p2',
          victimName: 'Enemy',
          assistantNames: [],
          assistantPuuids: [],
          weapon: 'Vandal',
        },
        {
          roundNumber: 2,
          timeInMatchMs: 2000,
          timeInRoundMs: 1000,
          killerPuuid: 'p2',
          killerName: 'Enemy',
          victimPuuid: 'p1',
          victimName: 'TenZ',
          assistantNames: [],
          assistantPuuids: [],
          weapon: 'Operator',
        },
      ],
    };
    const html = renderToStaticMarkup(<MatchView detail={withKills} />);
    expect(html).toContain('data-component="mvp-callout"');
    expect(html).toContain('TenZ#BR1');
    expect(html).toContain('Rating Global');
    expect(html).toContain('KAST');
    expect(html).toContain('Eficiência de arsenal');
    expect(html).toContain('Vandal');
    expect(html).toContain('Share');
    // Hero do Stitch: banner + MVP lado a lado
    expect(html).toContain('data-mvp-slot');
    // Minimapa real do mapa + ícone do agente (assets locais)
    expect(html).toContain('/assets/images/maps/ascent-map.png');
    expect(html).toContain('/assets/images/agents/jett.png');
    // MVP (TenZ, tier "Immortal 3") também exibe o logo do elo.
    expect(html).toContain('/assets/images/ranks/immortal-3.png');
    // Match ID real na meta bar
    expect(html).toContain('Match ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890');
  });

  it('não monta armas quando não há eventos de abate (MVP segue do scoreboard)', () => {
    const html = renderToStaticMarkup(<MatchView detail={detail} />);
    expect(html).toContain('data-component="mvp-callout"');
    expect(html).not.toContain('Eficiência de arsenal');
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

  it('selo DADOS SIMULADOS só com simulated', () => {
    expect(renderToStaticMarkup(<MatchView detail={detail} simulated />)).toContain(
      'data-simulated-badge',
    );
    expect(renderToStaticMarkup(<MatchView detail={detail} />)).not.toContain(
      'data-simulated-badge',
    );
  });
});
