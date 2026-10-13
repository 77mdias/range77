import { describe, expect, it } from 'vitest';
import {
  aggregateWeaponKills,
  computeAdr,
  computeFirstBloods,
  computeHalfSplits,
  computeMatchHalves,
  computeRankRange,
  computeRoundTimeline,
  computeTeamTotals,
  selectMatchMvp,
} from '@/services/analytics/match-breakdown';
import type { KillEvent, MatchRound, MatchScoreboardRow } from '@/contracts/tracker';

/**
 * SUITE TDD — match-breakdown: agregações puras do detalhe de partida
 * (first bloods por jogador, kills por arma, MVP e totais por time).
 */

function kill(overrides: Partial<KillEvent> & Pick<KillEvent, 'roundNumber'>): KillEvent {
  return {
    timeInMatchMs: 0,
    timeInRoundMs: null,
    killerPuuid: 'a',
    killerName: 'A',
    victimPuuid: 'b',
    victimName: 'B',
    assistantNames: [],
    assistantPuuids: [],
    weapon: 'Vandal',
    ...overrides,
  };
}

function row(overrides: Partial<MatchScoreboardRow> & Pick<MatchScoreboardRow, 'puuid'>): MatchScoreboardRow {
  return {
    name: 'P',
    tag: 'X',
    teamId: 'Red',
    agent: 'Jett',
    tier: null,
    kills: 0,
    deaths: 0,
    assists: 0,
    score: 0,
    acs: 0,
    hsPercentage: null,
    damageDealt: 0,
    damageReceived: 0,
    kastPercentage: null,
    economy: null,
    abilityCasts: null,
    ...overrides,
  };
}

describe('computeFirstBloods', () => {
  it('conta FK/FD a partir do primeiro abate de cada round', () => {
    const table = computeFirstBloods([
      kill({ roundNumber: 1, killerPuuid: 'a', victimPuuid: 'b', timeInMatchMs: 2000 }),
      kill({ roundNumber: 1, killerPuuid: 'c', victimPuuid: 'd', timeInMatchMs: 5000 }),
      kill({ roundNumber: 2, killerPuuid: 'b', victimPuuid: 'a', timeInMatchMs: 3000 }),
    ]);
    expect(table.get('a')).toEqual({ firstBloods: 1, firstDeaths: 1 });
    expect(table.get('b')).toEqual({ firstBloods: 1, firstDeaths: 1 });
    expect(table.get('c')).toBeUndefined();
    expect(table.get('d')).toBeUndefined();
  });

  it('usa time-in-round como desempate e ignora puuids vazios', () => {
    const table = computeFirstBloods([
      kill({ roundNumber: 1, killerPuuid: 'x', victimPuuid: 'y', timeInMatchMs: 1000, timeInRoundMs: 900 }),
      kill({ roundNumber: 1, killerPuuid: 'z', victimPuuid: 'w', timeInMatchMs: 1000, timeInRoundMs: 100 }),
      kill({ roundNumber: 2, killerPuuid: '', victimPuuid: 'w', timeInMatchMs: 500 }),
      kill({ roundNumber: 3, killerPuuid: 'q', victimPuuid: 'r', timeInMatchMs: 700, timeInRoundMs: null }),
      kill({ roundNumber: 3, killerPuuid: 's', victimPuuid: 't', timeInMatchMs: 700, timeInRoundMs: 50 }),
      kill({ roundNumber: 4, killerPuuid: 'm', victimPuuid: 'n', timeInMatchMs: 800, timeInRoundMs: 30 }),
      kill({ roundNumber: 4, killerPuuid: 'o', victimPuuid: 'p', timeInMatchMs: 800, timeInRoundMs: null }),
    ]);
    // Round 1: `z` tem menor tempo no round → FK; `y` nunca aparece.
    expect(table.get('z')).toEqual({ firstBloods: 1, firstDeaths: 0 });
    expect(table.get('x')).toBeUndefined();
    expect(table.get('y')).toBeUndefined();
    // Round 2: killer vazio não conta FB, mas a vítima conta FD (2ª morte).
    expect(table.get('w')).toEqual({ firstBloods: 0, firstDeaths: 2 });
    // Round 3: tempo de round nulo cai para Infinity → `s` (50ms) leva o FK.
    expect(table.get('s')).toEqual({ firstBloods: 1, firstDeaths: 0 });
    expect(table.get('q')).toBeUndefined();
  });

  it('retorna tabela vazia sem abates', () => {
    expect(computeFirstBloods([]).size).toBe(0);
  });
});

describe('aggregateWeaponKills', () => {
  it('agrega kills por arma com share e ordena por kills', () => {
    const stats = aggregateWeaponKills([
      kill({ roundNumber: 1, weapon: 'Vandal' }),
      kill({ roundNumber: 1, weapon: 'Vandal' }),
      kill({ roundNumber: 2, weapon: 'Operator' }),
      kill({ roundNumber: 2, weapon: null }),
      kill({ roundNumber: 3, weapon: '' }),
    ]);
    expect(stats).toEqual([
      { weapon: 'Vandal', kills: 2, sharePercent: 66.7, firstKills: 1, rounds: 1 },
      { weapon: 'Operator', kills: 1, sharePercent: 33.3, firstKills: 1, rounds: 1 },
    ]);
  });

  it('filtra por killer quando informado', () => {
    const stats = aggregateWeaponKills(
      [
        kill({ roundNumber: 1, killerPuuid: 'a', weapon: 'Vandal' }),
        kill({ roundNumber: 2, killerPuuid: 'b', weapon: 'Vandal' }),
        kill({ roundNumber: 3, killerPuuid: 'a', weapon: 'Ghost' }),
      ],
      'a',
    );
    expect(stats).toEqual([
      { weapon: 'Ghost', kills: 1, sharePercent: 50, firstKills: 1, rounds: 1 },
      { weapon: 'Vandal', kills: 1, sharePercent: 50, firstKills: 1, rounds: 1 },
    ]);
  });

  it('desempata por nome e devolve vazio sem armas conhecidas', () => {
    const stats = aggregateWeaponKills([
      kill({ roundNumber: 1, weapon: 'Spectre' }),
      kill({ roundNumber: 1, weapon: 'Guardian' }),
    ]);
    expect(stats.map((s) => s.weapon)).toEqual(['Guardian', 'Spectre']);
    expect(aggregateWeaponKills([kill({ roundNumber: 1, weapon: null })])).toEqual([]);
    expect(aggregateWeaponKills([])).toEqual([]);
  });
});

describe('selectMatchMvp', () => {
  it('escolhe o maior ACS e desempata por kills e nome', () => {
    const mvp = selectMatchMvp([
      row({ puuid: 'c', name: 'C', acs: 250, kills: 30 }),
      row({ puuid: 'a', name: 'A', acs: 300, kills: 20 }),
      row({ puuid: 'b', name: 'B', acs: 300, kills: 22 }),
      row({ puuid: 'd', name: 'D', acs: 120, kills: 5 }),
    ]);
    expect(mvp?.puuid).toBe('b');

    const tie = selectMatchMvp([
      row({ puuid: 'z', name: 'Zed', acs: 300, kills: 20 }),
      row({ puuid: 'b', name: 'Ana', acs: 300, kills: 20 }),
      row({ puuid: 'y', name: 'Bob', acs: 300, kills: 20 }),
    ]);
    expect(tie?.puuid).toBe('b');
  });

  it('retorna null sem jogadores', () => {
    expect(selectMatchMvp([])).toBeNull();
  });
});

describe('computeTeamTotals', () => {
  it('soma dano/kills/deaths/assists do time', () => {
    const totals = computeTeamTotals('Red', [
      row({ puuid: 'a', teamId: 'Red', damageDealt: 5000, kills: 20, deaths: 10, assists: 5 }),
      row({ puuid: 'b', teamId: 'Red', damageDealt: 4000, kills: 15, deaths: 12, assists: 8 }),
      row({ puuid: 'c', teamId: 'Blue', damageDealt: 9000, kills: 25, deaths: 8, assists: 2 }),
    ]);
    expect(totals).toEqual({
      teamId: 'Red',
      players: 2,
      totalDamage: 9000,
      totalKills: 35,
      totalDeaths: 22,
      totalAssists: 13,
    });
  });

  it('devolve zeros para time sem jogadores', () => {
    expect(computeTeamTotals('Green', [])).toEqual({
      teamId: 'Green',
      players: 0,
      totalDamage: 0,
      totalKills: 0,
      totalDeaths: 0,
      totalAssists: 0,
    });
  });
});

describe('computeAdr', () => {
  it('divide o dano pelos rounds jogados (1 casa)', () => {
    expect(computeAdr(4000, 20)).toBe(200);
    expect(computeAdr(3710, 24)).toBe(154.6);
  });

  it('sem rounds devolve null (nunca divide por zero)', () => {
    expect(computeAdr(4000, 0)).toBeNull();
    expect(computeAdr(0, 0)).toBeNull();
  });
});

describe('computeMatchHalves', () => {
  function round(roundNumber: number, winningTeamId: string, plantTeamId: string | null = null): MatchRound {
    return {
      roundNumber,
      winningTeamId,
      plantSite: plantTeamId === null ? null : 'A',
      plantTeamId,
      defused: false,
    };
  }

  /** Primeiro half (1–12) e segundo (13–24) com vencedores assimétricos. */
  function regulationRounds(): MatchRound[] {
    const rounds: MatchRound[] = [];
    for (let n = 1; n <= 24; n += 1) {
      const winnerFirstHalf = n <= 4 ? 'Red' : 'Blue';
      const winnerSecondHalf = n <= 22 ? 'Red' : 'Blue';
      rounds.push(round(n, n <= 12 ? winnerFirstHalf : winnerSecondHalf));
    }
    return rounds;
  }

  it('divide DEF/ATK do time com plants nos dois halfs', () => {
    const rounds = regulationRounds().map((r) =>
      r.roundNumber === 1 ? { ...r, plantTeamId: 'Red', plantSite: 'A' } : r,
    );
    const withSecond = rounds.map((r) =>
      r.roundNumber === 13 ? { ...r, plantTeamId: 'Blue', plantSite: 'B' } : r,
    );

    expect(computeMatchHalves(withSecond, 'Red')).toEqual({
      defense: { won: 10, lost: 2 },
      attack: { won: 4, lost: 8 },
    });
    expect(computeMatchHalves(withSecond, 'Blue')).toEqual({
      defense: { won: 8, lost: 4 },
      attack: { won: 2, lost: 10 },
    });
  });

  it('infere o lado do 1º half pelo plant do 2º (lados trocam)', () => {
    const rounds = [round(1, 'Red'), round(13, 'Blue', 'Blue')];
    expect(computeMatchHalves(rounds, 'Red')).toEqual({
      defense: { won: 0, lost: 1 },
      attack: { won: 1, lost: 0 },
    });
  });

  it('infere o lado do 2º half pelo plant do 1º', () => {
    const rounds = [round(1, 'Red', 'Red'), round(13, 'Blue')];
    expect(computeMatchHalves(rounds, 'Red')).toEqual({
      defense: { won: 0, lost: 1 },
      attack: { won: 1, lost: 0 },
    });
  });

  it('devolve null sem plants (lado inicial indeterminável)', () => {
    expect(computeMatchHalves([round(1, 'Red'), round(13, 'Blue')], 'Red')).toBeNull();
  });

  it('devolve null com menos de dois times ou lista vazia', () => {
    expect(computeMatchHalves([], 'Red')).toBeNull();
    expect(computeMatchHalves([round(1, 'Red'), round(2, 'Red')], 'Red')).toBeNull();
  });

  it('devolve null em partidas com overtime (>24 rounds)', () => {
    const overtime: MatchRound[] = [];
    for (let n = 1; n <= 26; n += 1) {
      overtime.push(round(n, n % 2 === 0 ? 'Red' : 'Blue', n === 1 ? 'Red' : null));
    }
    expect(computeMatchHalves(overtime, 'Red')).toBeNull();
  });
});

describe('computeHalfSplits', () => {
  function round(roundNumber: number, winningTeamId: string): MatchRound {
    return {
      roundNumber,
      winningTeamId,
      plantSite: null,
      plantTeamId: null,
      defused: false,
    };
  }

  /** Red vence 1–4 e 13–22; Blue vence o resto (24 rounds regulamentares). */
  function regulationRounds(): MatchRound[] {
    const rounds: MatchRound[] = [];
    for (let n = 1; n <= 24; n += 1) {
      const redWins = n <= 12 ? n <= 4 : n <= 22;
      rounds.push(round(n, redWins ? 'Red' : 'Blue'));
    }
    return rounds;
  }

  it('divide os rounds em HALF-ONE (1–12) e HALF-TWO (13–24) na perspectiva do time', () => {
    const rounds = regulationRounds();
    expect(computeHalfSplits(rounds, 'Red')).toEqual({
      first: { won: 4, lost: 8 },
      second: { won: 10, lost: 2 },
    });
    expect(computeHalfSplits(rounds, 'Blue')).toEqual({
      first: { won: 8, lost: 4 },
      second: { won: 2, lost: 10 },
    });
  });

  it('time que perde tudo devolve 0 vitórias no primeiro half', () => {
    const rounds = [round(1, 'Blue'), round(2, 'Blue')];
    expect(computeHalfSplits(rounds, 'Red')).toEqual({
      first: { won: 0, lost: 2 },
      second: { won: 0, lost: 0 },
    });
  });

  it('inclui os rounds de overtime na segunda metade', () => {
    const overtime: MatchRound[] = [];
    for (let n = 1; n <= 25; n += 1) {
      overtime.push(round(n, n === 13 ? 'Blue' : 'Red'));
    }
    expect(computeHalfSplits(overtime, 'Red')).toEqual({
      first: { won: 12, lost: 0 },
      second: { won: 12, lost: 1 },
    });
  });

  it('lista vazia devolve null', () => {
    expect(computeHalfSplits([], 'Red')).toBeNull();
  });
});

describe('computeRoundTimeline', () => {
  const roster: readonly MatchScoreboardRow[] = [
    row({ puuid: 'r1', teamId: 'Red' }),
    row({ puuid: 'r2', teamId: 'Red' }),
    row({ puuid: 'r3', teamId: 'Red' }),
    row({ puuid: 'b1', teamId: 'Blue' }),
    row({ puuid: 'b2', teamId: 'Blue' }),
    row({ puuid: 'b3', teamId: 'Blue' }),
  ];

  function round(
    roundNumber: number,
    winningTeamId: string,
    plantTeamId: string | null = null,
    defused = false,
  ): MatchRound {
    return {
      roundNumber,
      winningTeamId,
      plantSite: plantTeamId === null ? null : 'A',
      plantTeamId,
      defused,
    };
  }

  /** 1..12 com plants do Red; 13 com plant do Blue (troca de lado). */
  function buildRounds(): MatchRound[] {
    const list: MatchRound[] = [];
    for (let n = 1; n <= 12; n += 1) {
      if (n === 2) {
        list.push(round(n, 'Blue', 'Red'));
      } else if (n === 3) {
        list.push(round(n, 'Red', 'Red', true));
      } else if (n === 4) {
        list.push(round(n, 'Red', null));
      } else if (n === 5) {
        list.push(round(n, 'Blue', null));
      } else {
        list.push(round(n, 'Red', 'Red'));
      }
    }
    list.push(round(13, 'Blue', 'Blue'));
    return list;
  }

  const kills: readonly KillEvent[] = [
    kill({ roundNumber: 4, victimPuuid: 'b1', killerPuuid: 'r1' }),
    kill({ roundNumber: 4, victimPuuid: 'b2', killerPuuid: 'r1' }),
    kill({ roundNumber: 4, victimPuuid: 'b3', killerPuuid: 'r2' }),
    // Vítima fora do roster → ignorada na contagem de mortes.
    kill({ roundNumber: 3, victimPuuid: 'ghost', killerPuuid: 'r1' }),
  ];

  it('classifica encerramento, lado, pistola e placar progressivo', () => {
    const { rounds: insights, summary } = computeRoundTimeline(
      buildRounds(),
      kills,
      roster,
      'Red',
    );

    expect(insights).toHaveLength(13);
    expect(insights[0]).toEqual({
      roundNumber: 1,
      winningTeamId: 'Red',
      won: true,
      side: 'attack',
      kind: 'plant',
      pistol: true,
      score: { us: 1, them: 0 },
    });
    expect(insights[1]).toMatchObject({
      roundNumber: 2,
      won: false,
      side: 'attack',
      kind: 'retake',
      pistol: false,
      score: { us: 1, them: 1 },
    });
    expect(insights[2]).toMatchObject({ roundNumber: 3, kind: 'defuse', score: { us: 2, them: 1 } });
    expect(insights[3]).toMatchObject({ roundNumber: 4, kind: 'elim', score: { us: 3, them: 1 } });
    expect(insights[4]).toMatchObject({
      roundNumber: 5,
      won: false,
      kind: 'time',
      score: { us: 3, them: 2 },
    });
    expect(insights[12]).toMatchObject({
      roundNumber: 13,
      won: false,
      side: 'defense',
      kind: 'plant',
      pistol: true,
      score: { us: 10, them: 3 },
    });
    expect(summary).toEqual({
      roundsWon: 10,
      roundsLost: 3,
      roundsTotal: 13,
      winPercent: 76.9,
      pistol: { won: 1, played: 2, percent: 50 },
    });
  });

  it('omite o lado quando não há plant (base indeterminável)', () => {
    const result = computeRoundTimeline([round(1, 'Red')], [], roster, 'Red');
    expect(result.rounds[0]).toMatchObject({ side: null, kind: 'time' });
  });

  it('partida sem rounds devolve resumo zerado e percentuais null', () => {
    const result = computeRoundTimeline([], [], roster, 'Red');
    expect(result.rounds).toEqual([]);
    expect(result.summary).toEqual({
      roundsWon: 0,
      roundsLost: 0,
      roundsTotal: 0,
      winPercent: null,
      pistol: { won: 0, played: 0, percent: null },
    });
  });
});

describe('computeRankRange', () => {
  it('deriva a faixa de MMR do menor ao maior tier', () => {
    expect(
      computeRankRange([
        row({ puuid: 'a', tier: 'Ascendant 1' }),
        row({ puuid: 'b', tier: 'Immortal 2' }),
        row({ puuid: 'c', tier: 'Diamond 3' }),
      ]),
    ).toBe('DIA 3 — IMM 2');
  });

  it('um único tier reconhecido devolve o próprio chip', () => {
    expect(computeRankRange([row({ puuid: 'a', tier: 'Radiant' })])).toBe('RAD');
  });

  it('devolve null sem tiers reconhecidos', () => {
    expect(computeRankRange([])).toBeNull();
    expect(
      computeRankRange([row({ puuid: 'a', tier: null }), row({ puuid: 'b', tier: '  ' })]),
    ).toBeNull();
    expect(computeRankRange([row({ puuid: 'a', tier: 'Mystery 3' })])).toBeNull();
  });

  it('ignora divisão não numérica (mantém o chip do tier)', () => {
    expect(computeRankRange([row({ puuid: 'a', tier: 'Immortal X' })])).toBe('IMM X');
  });
});
