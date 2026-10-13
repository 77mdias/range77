import { describe, expect, it } from 'vitest';
import type { HenrikDevMatchV4 } from '@/contracts/henrikdev';
import {
  findTrackerPlayer,
  isCompetitiveCompletedMatch,
  normalizeMatchToDetail,
  normalizeMatchToKills,
  normalizeMatchToPlayerRounds,
  normalizeMatchToRounds,
  normalizeMatchToScoreboard,
  normalizeMatchToSummary,
  normalizeMatchesToSummaries,
  resolveAccountLevel,
  resolveRankSummary,
  resolveWinningTeamId,
} from '@/services/henrikdev/normalize-tracker';

/**
 * SUITE TDD — normalizador v4 → contratos do tracker. Fixtures refletem o
 * schema oficial (MatchesV4Data) confirmado na pesquisa da fase 2.
 */

const SAMPLE_MATCH: HenrikDevMatchV4 = {
  metadata: {
    match_id: 'match-1',
    map: { id: 'ascent', name: 'Ascent' },
    queue: { id: 'competitive', name: 'Competitive' },
    season: { id: 's1', short: 'V25A3' },
    started_at: '2026-10-01T12:00:00.000Z',
    is_completed: true,
    game_length_in_ms: 2_400_000,
    region: 'br',
  },
  players: [
    {
      puuid: 'p1',
      name: 'TenZ',
      tag: 'BR1',
      team_id: 'Red',
      agent: { id: 'jett', name: 'Jett' },
      stats: {
        score: 6000,
        kills: 24,
        deaths: 14,
        assists: 6,
        headshots: 30,
        bodyshots: 60,
        legshots: 10,
        damage: { dealt: 4000, received: 2500 },
      },
      ability_casts: { ability1: 4, ability2: 5, grenade: 6, ultimate: 2 },
      economy: {
        spent: { overall: 20000, average: 1000 },
        loadout_value: { overall: 18000, average: 900 },
      },
      tier: { id: 24, name: 'Immortal 3' },
    },
    {
      puuid: 'p2',
      name: 'Enemy',
      tag: 'NA1',
      team_id: 'Blue',
      agent: { id: 'reyna', name: 'Reyna' },
      stats: {
        score: 3000,
        kills: 10,
        deaths: 20,
        assists: 3,
        headshots: 0,
        bodyshots: 0,
        legshots: 0,
        damage: { dealt: 1000, received: 3000 },
      },
    },
  ],
  teams: [
    { team_id: 'Red', rounds: { won: 13, lost: 7 }, won: true },
    { team_id: 'Blue', rounds: { won: 7, lost: 13 }, won: false },
  ],
  rounds: [
    {
      id: 0,
      winning_team: 'Red',
      plant: { round_time_in_ms: 30000, site: 'A', player: { puuid: 'p1', name: 'TenZ', tag: 'BR1' } },
      defuse: null,
    },
    {
      id: 1,
      winning_team: 'Blue',
      plant: null,
      defuse: { round_time_in_ms: 20000, player: { puuid: 'p2', name: 'Enemy', tag: 'NA1' } },
    },
  ],
  kills: [
    {
      round: 0,
      time_in_match_in_ms: 5000,
      time_in_round_in_ms: 5000,
      killer: { puuid: 'p1', name: 'TenZ', tag: 'BR1', team: 'Red' },
      victim: { puuid: 'p2', name: 'Enemy', tag: 'NA1', team: 'Blue' },
      assistants: [],
      weapon: { id: 'vandal', name: 'Vandal', type: 'Rifle' },
    },
    {
      round: 1,
      time_in_match_in_ms: 65000,
      killer: { puuid: 'p2', name: 'Enemy', tag: 'NA1', team: 'Blue' },
      victim: { puuid: 'p1', name: 'TenZ', tag: 'BR1', team: 'Red' },
      assistants: [{ puuid: 'p3', name: 'Mate', tag: 'BR2', team: 'Blue' }],
    },
  ],
};

const PLAYER = { name: 'TenZ', tag: 'BR1' };

describe('findTrackerPlayer / isCompetitiveCompletedMatch', () => {
  it('encontra o jogador case-insensitive', () => {
    expect(findTrackerPlayer(SAMPLE_MATCH, 'tenz', 'br1')?.puuid).toBe('p1');
    expect(findTrackerPlayer(SAMPLE_MATCH, 'ghost', 'br1')).toBeUndefined();
  });

  it('classifica partida competitiva concluída', () => {
    expect(isCompetitiveCompletedMatch(SAMPLE_MATCH)).toBe(true);
    const unrated = { ...SAMPLE_MATCH, metadata: { ...SAMPLE_MATCH.metadata, queue: { id: 'unrated' } } };
    expect(isCompetitiveCompletedMatch(unrated)).toBe(false);
    const inProgress = { ...SAMPLE_MATCH, metadata: { ...SAMPLE_MATCH.metadata, is_completed: false } };
    expect(isCompetitiveCompletedMatch(inProgress)).toBe(false);
  });
});

describe('resolveWinningTeamId', () => {
  const teamIds = ['Blue', 'Red'];

  it('usa winning_team quando já é um team_id conhecido', () => {
    expect(resolveWinningTeamId({ id: 0, winning_team: 'Red' }, teamIds)).toBe('Red');
  });

  it('mapeia o rótulo legado Team1/Team2 para a ordem de teams[]', () => {
    expect(resolveWinningTeamId({ id: 0, winning_team: 'Team2' }, teamIds)).toBe('Red');
    expect(resolveWinningTeamId({ id: 0, winning_team: 'Team1' }, teamIds)).toBe('Blue');
  });

  it('retorna null para vazio e repassa valor desconhecido', () => {
    expect(resolveWinningTeamId({ id: 0, winning_team: '' }, teamIds)).toBeNull();
    expect(resolveWinningTeamId({ id: 0, winning_team: 'Green' }, teamIds)).toBe('Green');
  });
});

describe('normalizeMatchToSummary', () => {
  it('extrai placar, ACS, HS% e resultado do jogador', () => {
    const summary = normalizeMatchToSummary(SAMPLE_MATCH, 'br', PLAYER.name, PLAYER.tag);
    expect(summary).toEqual({
      matchId: 'match-1',
      region: 'br',
      map: 'Ascent',
      queue: 'competitive',
      season: 'V25A3',
      startedAt: '2026-10-01T12:00:00.000Z',
      gameLengthMs: 2_400_000,
      result: 'win',
      agent: 'Jett',
      teamId: 'Red',
      score: { us: 13, them: 7 },
      kills: 24,
      deaths: 14,
      assists: 6,
      acs: 300,
      hsPercentage: 30,
      firstBloods: 1,
      firstDeaths: 1,
      roundsPlayed: 20,
    });
  });

  it('extrai splits DEF/ATK do jogador quando os plants permitem inferir os lados', () => {
    const withPlants: HenrikDevMatchV4 = {
      ...SAMPLE_MATCH,
      rounds: [
        {
          id: 0,
          winning_team: 'Red',
          plant: { round_time_in_ms: 30000, site: 'A', player: { puuid: 'p1', team: 'Red' } },
          defuse: null,
        },
        {
          id: 12,
          winning_team: 'Blue',
          plant: { round_time_in_ms: 30000, site: 'B', player: { puuid: 'p2', team: 'Blue' } },
          defuse: null,
        },
      ],
    };

    const summary = normalizeMatchToSummary(withPlants, 'br', 'TenZ', 'BR1');
    // Red é o time do jogador: 1º half ataca (plant Red), 2º half defende.
    expect(summary?.halves).toEqual({
      defense: { won: 0, lost: 1 },
      attack: { won: 1, lost: 0 },
    });
  });

  it('retorna null para partida não competitiva ou incompleta', () => {
    const unrated = { ...SAMPLE_MATCH, metadata: { ...SAMPLE_MATCH.metadata, queue: { id: 'unrated' } } };
    expect(normalizeMatchToSummary(unrated, 'br', 'TenZ', 'BR1')).toBeNull();
    const incomplete = { ...SAMPLE_MATCH, metadata: { ...SAMPLE_MATCH.metadata, is_completed: false } };
    expect(normalizeMatchToSummary(incomplete, 'br', 'TenZ', 'BR1')).toBeNull();
  });

  it('retorna null quando o jogador não está na partida ou sem time', () => {
    expect(normalizeMatchToSummary(SAMPLE_MATCH, 'br', 'Ninguem', 'XX1')).toBeNull();
    const noTeam = {
      ...SAMPLE_MATCH,
      players: [{ ...SAMPLE_MATCH.players[0]!, team_id: undefined }],
    };
    expect(normalizeMatchToSummary(noTeam, 'br', 'TenZ', 'BR1')).toBeNull();
  });

  it('retorna null quando o placar é indeterminável (sem teams e sem rounds)', () => {
    const bare = { ...SAMPLE_MATCH, teams: [], rounds: undefined };
    expect(normalizeMatchToSummary(bare, 'br', 'TenZ', 'BR1')).toBeNull();
  });

  it('cai para a contagem de rounds quando teams[] está ausente', () => {
    const noTeams = { ...SAMPLE_MATCH, teams: [] };
    const summary = normalizeMatchToSummary(noTeams, 'br', 'TenZ', 'BR1');
    expect(summary?.roundsPlayed).toBe(2);
    expect(summary?.score).toEqual({ us: 1, them: 1 });
    expect(summary?.result).toBe('win');
  });

  it('deixa result=loss no fallback de rounds quando o time perde a maioria', () => {
    const lost = {
      ...SAMPLE_MATCH,
      teams: [],
      rounds: [
        { id: 0, winning_team: 'Blue' },
        { id: 1, winning_team: 'Blue' },
        { id: 2, winning_team: 'Red' },
      ],
    };
    expect(normalizeMatchToSummary(lost, 'br', 'TenZ', 'BR1')?.result).toBe('loss');
  });

  it('HS% é null quando não há tiros conectados', () => {
    const summary = normalizeMatchToSummary(SAMPLE_MATCH, 'br', 'Enemy', 'NA1');
    expect(summary?.hsPercentage).toBeNull();
    expect(summary?.acs).toBe(150);
  });
});

describe('normalizeMatchesToSummaries', () => {
  const older = {
    ...SAMPLE_MATCH,
    metadata: { ...SAMPLE_MATCH.metadata, match_id: 'match-0', started_at: '2026-09-01T12:00:00.000Z' },
  };

  it('filtra inválidas e ordena as mais recentes primeiro', () => {
    const unrated = { ...SAMPLE_MATCH, metadata: { ...SAMPLE_MATCH.metadata, match_id: 'm3', queue: { id: 'unrated' } } };
    const summaries = normalizeMatchesToSummaries([older, unrated, SAMPLE_MATCH], PLAYER, 'br');
    expect(summaries.map((summary) => summary.matchId)).toEqual(['match-1', 'match-0']);
  });

  it('desempata por matchId (desc) e aceita lista vazia/undefined', () => {
    const a = { ...SAMPLE_MATCH, metadata: { ...SAMPLE_MATCH.metadata, match_id: 'aaa' } };
    const b = { ...SAMPLE_MATCH, metadata: { ...SAMPLE_MATCH.metadata, match_id: 'bbb' } };
    expect(normalizeMatchesToSummaries([b, a], PLAYER, 'br').map((s) => s.matchId)).toEqual([
      'bbb',
      'aaa',
    ]);
    expect(normalizeMatchesToSummaries(undefined, PLAYER, 'br')).toEqual([]);
  });
});

describe('resolveAccountLevel', () => {
  const withLevel = (
    matchId: string,
    startedAt: string,
    level: number | undefined,
  ): HenrikDevMatchV4 => ({
    ...SAMPLE_MATCH,
    metadata: { ...SAMPLE_MATCH.metadata, match_id: matchId, started_at: startedAt },
    players: SAMPLE_MATCH.players.map((player) =>
      player.puuid === 'p1' && level !== undefined ? { ...player, account_level: level } : player,
    ),
  });

  it('usa o nível da partida MAIS RECENTE que traz o campo', () => {
    const recent = withLevel('m-recent', '2026-10-03T00:00:00.000Z', 242);
    const old = withLevel('m-old', '2026-10-01T00:00:00.000Z', 100);
    expect(resolveAccountLevel([old, recent], PLAYER)).toBe(242);
  });

  it('ignora partidas sem account_level e retorna null quando ausente em todas', () => {
    const untracked = withLevel('m-x', '2026-10-05T00:00:00.000Z', undefined);
    expect(
      resolveAccountLevel([untracked, withLevel('m-y', '2026-10-01T00:00:00.000Z', 50)], PLAYER),
    ).toBe(50);
    expect(resolveAccountLevel([untracked], PLAYER)).toBeNull();
    expect(resolveAccountLevel(undefined, PLAYER)).toBeNull();
  });
});

describe('normalizeMatchToScoreboard', () => {
  it('normaliza todos os jogadores (economia, habilidades, tier)', () => {
    const rows = normalizeMatchToScoreboard(SAMPLE_MATCH);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      puuid: 'p1',
      agent: 'Jett',
      tier: 'Immortal 3',
      acs: 300,
      damageDealt: 4000,
      damageReceived: 2500,
      kastPercentage: 50,
      economy: { spent: 20000, loadoutValue: 18000 },
      abilityCasts: { ability1: 4, ability2: 5, grenade: 6, ultimate: 2 },
    });
    expect(rows[1]).toMatchObject({
      puuid: 'p2',
      hsPercentage: null,
      kastPercentage: 50,
      economy: null,
      abilityCasts: null,
      tier: null,
    });
  });

  it('ACS=0 quando os rounds são indetermináveis', () => {
    const bare = { ...SAMPLE_MATCH, teams: [], rounds: undefined };
    const rows = normalizeMatchToScoreboard(bare);
    expect(rows.every((row) => row.acs === 0)).toBe(true);
  });

  it('slots de habilidade nulos viram 0 e economia parcial é aceita', () => {
    const partial = {
      ...SAMPLE_MATCH,
      players: [
        {
          ...SAMPLE_MATCH.players[0]!,
          ability_casts: { ability1: null, ultimate: null },
          economy: { spent: { overall: 100, average: 10 } },
        },
      ],
    };
    const row = normalizeMatchToScoreboard(partial)[0]!;
    expect(row.abilityCasts).toEqual({ ability1: 0, ability2: 0, grenade: 0, ultimate: 0 });
    expect(row.economy).toEqual({ spent: 100, loadoutValue: 0 });
  });
});

describe('rounds', () => {
  it('normaliza rounds genéricos com plant/defuse', () => {
    expect(normalizeMatchToRounds(SAMPLE_MATCH)).toEqual([
      { roundNumber: 1, winningTeamId: 'Red', plantSite: 'A', plantTeamId: null, defused: false },
      { roundNumber: 2, winningTeamId: 'Blue', plantSite: null, plantTeamId: null, defused: true },
    ]);
  });

  it('captura o time que plantou (atacante do round)', () => {
    const withTeam = {
      ...SAMPLE_MATCH,
      rounds: [
        {
          id: 0,
          winning_team: 'Red',
          plant: { round_time_in_ms: 30000, site: 'B', player: { puuid: 'p1', team: 'Red' } },
          defuse: null,
        },
      ],
    };
    expect(normalizeMatchToRounds(withTeam)).toEqual([
      { roundNumber: 1, winningTeamId: 'Red', plantSite: 'B', plantTeamId: 'Red', defused: false },
    ]);
  });

  it('normaliza rounds relativos ao jogador', () => {
    expect(normalizeMatchToPlayerRounds(SAMPLE_MATCH, 'Red')).toEqual([
      { roundNumber: 1, winningTeamId: 'Red', plantSite: 'A', plantTeamId: null, defused: false, playerTeamId: 'Red', won: true },
      { roundNumber: 2, winningTeamId: 'Blue', plantSite: null, plantTeamId: null, defused: true, playerTeamId: 'Red', won: false },
    ]);
  });

  it('ignora rounds sem vencedor resolvível e lida com rounds ausentes', () => {
    const noWinner = { ...SAMPLE_MATCH, rounds: [{ id: 0, winning_team: '' }] };
    expect(normalizeMatchToRounds(noWinner)).toEqual([]);
    expect(normalizeMatchToRounds({ ...SAMPLE_MATCH, rounds: undefined })).toEqual([]);
  });
});

describe('kills / detail', () => {
  it('normaliza a timeline de abates', () => {
    const kills = normalizeMatchToKills(SAMPLE_MATCH);
    expect(kills).toHaveLength(2);
    expect(kills[0]).toMatchObject({
      roundNumber: 1,
      killerName: 'TenZ',
      victimName: 'Enemy',
      weapon: 'Vandal',
      timeInRoundMs: 5000,
      assistantNames: [],
    });
    expect(kills[1]).toMatchObject({
      roundNumber: 2,
      timeInRoundMs: null,
      assistantNames: ['Mate'],
      weapon: null,
    });
  });

  it('usa "Desconhecido" para refs sem nome e tolera kills ausentes', () => {
    const partial = {
      ...SAMPLE_MATCH,
      kills: [
        {
          round: 0,
          time_in_match_in_ms: 1,
          killer: { puuid: 'x' },
          victim: { puuid: 'y' },
        },
      ],
    };
    expect(normalizeMatchToKills(partial)[0]).toMatchObject({
      killerName: 'Desconhecido',
      victimName: 'Desconhecido',
      assistantNames: [],
      weapon: null,
    });
    expect(normalizeMatchToKills({ ...SAMPLE_MATCH, kills: undefined })).toEqual([]);
  });

  it('monta o detalhe completo da partida', () => {
    const detail = normalizeMatchToDetail(SAMPLE_MATCH, 'BR');
    expect(detail).toMatchObject({
      matchId: 'match-1',
      region: 'br',
      map: 'Ascent',
      queue: 'competitive',
      season: 'V25A3',
      isCompleted: true,
      teams: [
        { teamId: 'Red', won: true, roundsWon: 13, roundsLost: 7 },
        { teamId: 'Blue', won: false, roundsWon: 7, roundsLost: 13 },
      ],
    });
    expect(detail.scoreboard).toHaveLength(2);
    expect(detail.rounds).toHaveLength(2);
    expect(detail.kills).toHaveLength(2);
  });

  it('detalhe tolera metadata ausente (mapa/queue/season)', () => {
    const bare: HenrikDevMatchV4 = {
      metadata: { match_id: 'x' },
      players: [],
      teams: [],
      rounds: [],
      kills: [],
    };
    const detail = normalizeMatchToDetail(bare, 'na');
    expect(detail).toMatchObject({
      map: 'Desconhecido',
      queue: 'unknown',
      season: null,
      startedAt: '',
      gameLengthMs: 0,
      isCompleted: true,
    });
  });
});

describe('resolveRankSummary (v2/mmr)', () => {
  it('lê o ranque aninhado em `current_data` (formato real da API)', () => {
    expect(
      resolveRankSummary({
        current_data: {
          currenttierpatched: 'Ascendant 1',
          images: { small: 'https://media/small.png' },
          ranking_in_tier: 30,
        },
      }),
    ).toEqual({ tier: 'Ascendant 1', imageSrc: 'https://media/small.png', rrInTier: 30 });
  });

  it('aceita o formato achatado (retrocompatibilidade)', () => {
    expect(
      resolveRankSummary({
        currenttierpatched: 'Diamond 2',
        images: { large: 'https://media/large.png' },
        ranking_in_tier: 10,
      }),
    ).toEqual({ tier: 'Diamond 2', imageSrc: 'https://media/large.png', rrInTier: 10 });
  });

  it('sem MMR → campos nulos', () => {
    expect(resolveRankSummary(undefined)).toEqual({ tier: null, imageSrc: null, rrInTier: null });
  });
});
