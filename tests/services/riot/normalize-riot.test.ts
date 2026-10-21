import { describe, expect, it } from 'vitest';
import type { MockRankSnapshot, MockRrPoint, RiotMatchDto } from '@/contracts/riot';
import {
  agentNameById,
  mapNameById,
  seasonLabelById,
  tierNameById,
  weaponNameById,
} from '@/services/riot/catalog';
import {
  DEMO_ACCOUNT,
  generateAccount,
  generateMatch,
  generateMatchlist,
} from '@/services/riot/mock';
import {
  normalizeRiotMatchToCombat,
  normalizeRiotMatchToDetail,
  normalizeRiotMatchToSummary,
  normalizeRiotRank,
  normalizeRiotRrHistory,
} from '@/services/riot/normalize-riot';
import { riotMatchFixture } from '../../fixtures/riot/match-v1';

const match = riotMatchFixture;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;

/** Jogadores da fixture: 0–4 Blue (vence 13–5), 5–9 Red. */
const blue = match.players[0]!;
const red = match.players[5]!;

/** FB/FD esperados — menor `timeSinceRoundStartMillis` de cada round. */
function expectedEntry(puuid: string): { firstBloods: number; firstDeaths: number } {
  let firstBloods = 0;
  let firstDeaths = 0;
  for (const round of match.roundResults) {
    const kills = round.playerStats.flatMap((s) => s.kills);
    if (kills.length === 0) continue;
    const first = kills.reduce((a, b) =>
      b.timeSinceRoundStartMillis < a.timeSinceRoundStartMillis ? b : a,
    );
    if (first.killer === puuid) firstBloods += 1;
    if (first.victim === puuid) firstDeaths += 1;
  }
  return { firstBloods, firstDeaths };
}

function withInfo(overrides: Partial<RiotMatchDto['matchInfo']>): RiotMatchDto {
  return { ...match, matchInfo: { ...match.matchInfo, ...overrides } };
}

describe('catalog', () => {
  it('ids de conteúdo → nomes (case-insensitive nos UUIDs)', () => {
    expect(mapNameById('/Game/Maps/Ascent/Ascent')).toBe('Ascent');
    expect(mapNameById('/Game/Maps/Duality/Duality')).toBe('Bind');
    expect(mapNameById('/Game/Maps/Nada/Nada')).toBeNull();
    expect(agentNameById('ADD6443A-41BD-E414-F6AD-E58D267F4E95')).toBe('Jett');
    expect(agentNameById('00000000-0000-0000-0000-000000000000')).toBeNull();
    expect(weaponNameById('9C82E19D-4575-0200-1A81-3EACF00CF872')).toBe('Vandal');
    expect(weaponNameById('')).toBeNull();
  });

  it('competitiveTier → nome no formato da HenrikDev', () => {
    expect(tierNameById(0)).toBe('Unrated');
    expect(tierNameById(1)).toBeNull();
    expect(tierNameById(3)).toBe('Iron 1');
    expect(tierNameById(15)).toBe('Platinum 1');
    expect(tierNameById(23)).toBe('Ascendant 3');
    expect(tierNameById(27)).toBe('Radiant');
    expect(tierNameById(28)).toBeNull();
  });

  it('seasonId desconhecido → null (nunca um rótulo inventado)', () => {
    expect(seasonLabelById('ffffffff-ffff-ffff-ffff-ffffffffffff')).toBeNull();
  });
});

describe('normalizeRiotMatchToSummary', () => {
  const summary = normalizeRiotMatchToSummary(match, blue.puuid, 'BR')!;

  it('mapa e agente por nome (não id/UUID)', () => {
    expect(summary.map).toBe('Ascent');
    expect(summary.agent).toBe('Jett');
    expect(summary.map).not.toMatch(UUID);
    expect(summary.agent).not.toMatch(UUID);
  });

  it('metadados: região do parâmetro (minúscula), fila, ISO de início', () => {
    expect(summary.matchId).toBe(match.matchInfo.matchId);
    expect(summary.region).toBe('br');
    expect(normalizeRiotMatchToSummary(match, blue.puuid, 'NA')!.region).toBe('na');
    expect(summary.queue).toBe('competitive');
    expect(summary.startedAt).toBe(new Date(match.matchInfo.gameStartMillis).toISOString());
    expect(summary.gameLengthMs).toBe(match.matchInfo.gameLengthMillis);
  });

  it('resultado e placar coerentes com `winningTeam` dos rounds', () => {
    const won = (team: string) => match.roundResults.filter((r) => r.winningTeam === team).length;
    expect(summary.result).toBe(won('Blue') > won('Red') ? 'win' : 'loss');
    expect(summary.score).toEqual({ us: won('Blue'), them: won('Red') });
    const redSummary = normalizeRiotMatchToSummary(match, red.puuid, 'br')!;
    expect(redSummary.result).toBe('loss');
    expect(redSummary.score).toEqual({ us: won('Red'), them: won('Blue') });
    expect(summary.roundsPlayed).toBe(match.roundResults.length);
  });

  it('K/D/A, ACS e HS% do jogador', () => {
    const stats = blue.stats!;
    expect(summary.kills).toBe(stats.kills);
    expect(summary.deaths).toBe(stats.deaths);
    expect(summary.assists).toBe(stats.assists);
    expect(summary.acs).toBe(Math.round(stats.score / match.roundResults.length));
    // Fixture: cada abate gera 1 headshot + 1 bodyshot.
    expect(summary.hsPercentage).toBe(stats.kills > 0 ? 50 : null);
  });

  it('firstBloods/firstDeaths pelo menor timeSinceRoundStartMillis por round', () => {
    for (const player of match.players) {
      const s = normalizeRiotMatchToSummary(match, player.puuid, 'br')!;
      const expected = expectedEntry(player.puuid);
      expect(s.firstBloods).toBe(expected.firstBloods);
      expect(s.firstDeaths).toBe(expected.firstDeaths);
    }
    const totalFb = match.players.reduce(
      (sum, p) => sum + (normalizeRiotMatchToSummary(match, p.puuid, 'br')!.firstBloods ?? 0),
      0,
    );
    expect(totalFb).toBe(match.roundResults.length);
  });

  it('halves DEF/ATK derivados dos plants', () => {
    expect(summary.halves).not.toBeNull();
    const halves = summary.halves!;
    expect(halves.attack.won + halves.defense.won).toBe(summary.score.us);
    expect(halves.attack.lost + halves.defense.lost).toBe(summary.score.them);
  });

  it('partida não concluída → null', () => {
    expect(normalizeRiotMatchToSummary(withInfo({ isCompleted: false }), blue.puuid, 'br')).toBeNull();
  });

  it('fila não competitiva → null', () => {
    expect(normalizeRiotMatchToSummary(withInfo({ queueId: 'unrated' }), blue.puuid, 'br')).toBeNull();
  });

  it('puuid ausente ou jogador sem stats (observador) → null', () => {
    expect(normalizeRiotMatchToSummary(match, 'outro-puuid', 'br')).toBeNull();
    const observer: RiotMatchDto = {
      ...match,
      players: match.players.map((p) => (p.puuid === blue.puuid ? { ...p, stats: null } : p)),
    };
    expect(normalizeRiotMatchToSummary(observer, blue.puuid, 'br')).toBeNull();
  });

  it('mapa/agente fora do catálogo → fallback, nunca o id cru', () => {
    const odd: RiotMatchDto = {
      ...withInfo({ mapId: '/Game/Maps/Nada/Nada' }),
      players: match.players.map((p) => ({ ...p, characterId: 'ffffffff-0000-0000-0000-000000000000' })),
    };
    const s = normalizeRiotMatchToSummary(odd, blue.puuid, 'br')!;
    expect(s.map).toBe('Desconhecido');
    expect(s.agent).toBeNull();
  });

  it('sem `teams[]`: placar/resultado contados nos rounds', () => {
    const noTeams: RiotMatchDto = { ...match, teams: [] };
    const s = normalizeRiotMatchToSummary(noTeams, blue.puuid, 'br')!;
    expect(s.score).toEqual(summary.score);
    expect(s.result).toBe('win');
    expect(s.roundsPlayed).toBe(match.roundResults.length);
  });

  it('sem `teams[]` e sem rounds → null (indeterminável)', () => {
    expect(
      normalizeRiotMatchToSummary({ ...match, teams: [], roundResults: [] }, blue.puuid, 'br'),
    ).toBeNull();
  });
});

describe('normalizeRiotMatchToDetail', () => {
  const detail = normalizeRiotMatchToDetail(match, 'BR');

  it('metadados e times', () => {
    expect(detail.matchId).toBe(match.matchInfo.matchId);
    expect(detail.region).toBe('br');
    expect(detail.map).toBe('Ascent');
    expect(detail.isCompleted).toBe(true);
    const blueTeam = detail.teams.find((t) => t.teamId === 'Blue')!;
    expect(blueTeam).toEqual({ teamId: 'Blue', won: true, roundsWon: 13, roundsLost: 5 });
  });

  it('scoreboard com os 10 jogadores, nomes e KAST não nulo', () => {
    expect(detail.scoreboard).toHaveLength(10);
    for (const row of detail.scoreboard) {
      expect(row.agent).not.toMatch(UUID);
      expect(row.kastPercentage).not.toBeNull();
      expect(row.tier).not.toBeNull();
      expect(row.abilityCasts).not.toBeNull();
      expect(row.economy).not.toBeNull();
    }
    const first = detail.scoreboard[0]!;
    expect(first).toMatchObject({ name: 'Lumen', tag: 'VC01', teamId: 'Blue', agent: 'Jett', tier: 'Platinum 1' });
    expect(first.damageDealt).toBe(blue.stats!.kills * 150);
  });

  it('kills ordenados por timeInMatchMs, rounds 1-based, nomes e arma resolvidos', () => {
    const total = match.roundResults.reduce(
      (sum, r) => sum + r.playerStats.reduce((s, p) => s + p.kills.length, 0),
      0,
    );
    expect(detail.kills).toHaveLength(total);
    for (let i = 1; i < detail.kills.length; i += 1) {
      expect(detail.kills[i]!.timeInMatchMs).toBeGreaterThanOrEqual(detail.kills[i - 1]!.timeInMatchMs);
    }
    const kill = detail.kills[0]!;
    expect(kill.roundNumber).toBe(1);
    expect(kill.killerName).not.toBe('Desconhecido');
    expect(kill.weapon).toBe('Classic');
  });

  it('rounds 1-based com plant/defuse e time que plantou', () => {
    expect(detail.rounds).toHaveLength(match.roundResults.length);
    expect(detail.rounds[0]).toEqual({
      roundNumber: 1,
      winningTeamId: 'Blue',
      plantSite: null,
      plantTeamId: null,
      defused: false,
    });
    expect(detail.rounds[3]).toMatchObject({ roundNumber: 4, plantSite: 'B', plantTeamId: 'Red', defused: true });
  });

  it('observadores e jogadores sem stats ficam fora do scoreboard', () => {
    const withObserver: RiotMatchDto = {
      ...match,
      players: [...match.players, { ...blue, puuid: 'observer', isObserver: true, stats: null }],
    };
    expect(normalizeRiotMatchToDetail(withObserver, 'br').scoreboard).toHaveLength(10);
  });

  it('dados ausentes viram fallbacks neutros', () => {
    const sparse: RiotMatchDto = {
      ...withInfo({ mapId: '', seasonId: '' }),
      players: match.players.map((p) => ({
        ...p,
        characterId: '',
        competitiveTier: 2,
        stats: p.stats === null ? null : { ...p.stats, abilityCasts: null },
      })),
      roundResults: match.roundResults.map((r) => ({
        ...r,
        playerStats: r.playerStats.map((s) => ({
          ...s,
          economy: null,
          kills: s.kills.map((k) => ({
            ...k,
            killer: 'fantasma',
            finishingDamage: { ...k.finishingDamage, damageItem: 'Ultimate' },
          })),
        })),
      })),
    };
    const d = normalizeRiotMatchToDetail(sparse, 'br');
    expect(d.map).toBe('Desconhecido');
    expect(d.season).toBeNull();
    const row = d.scoreboard[0]!;
    expect(row).toMatchObject({ agent: 'Desconhecido', tier: null, economy: null, abilityCasts: null });
    expect(d.kills[0]).toMatchObject({ killerName: 'Desconhecido', weapon: null });
  });
});

describe('normalizeRiotMatchToCombat', () => {
  it('amostra de combate do jogador (KAST, FB/FD, dano)', () => {
    const combat = normalizeRiotMatchToCombat(match, blue.puuid)!;
    const stats = blue.stats!;
    expect(combat).toMatchObject({
      kills: stats.kills,
      deaths: stats.deaths,
      assists: stats.assists,
      roundsPlayed: match.roundResults.length,
      score: stats.score,
      damageDealt: stats.kills * 150,
      headshots: stats.kills,
      bodyshots: stats.kills,
      legshots: 0,
      ...expectedEntry(blue.puuid),
    });
    expect(combat.kast).toBeGreaterThan(0);
  });

  it('mesmos filtros do resumo: não competitiva, incompleta ou jogador ausente → null', () => {
    expect(normalizeRiotMatchToCombat(withInfo({ queueId: 'deathmatch' }), blue.puuid)).toBeNull();
    expect(normalizeRiotMatchToCombat(withInfo({ isCompleted: false }), blue.puuid)).toBeNull();
    expect(normalizeRiotMatchToCombat(match, 'ninguem')).toBeNull();
    expect(normalizeRiotMatchToCombat({ ...match, teams: [], roundResults: [] }, blue.puuid)).toBeNull();
  });

  it('sem abates na partida → KAST omitido', () => {
    const noKills: RiotMatchDto = {
      ...match,
      roundResults: match.roundResults.map((r) => ({
        ...r,
        playerStats: r.playerStats.map((s) => ({ ...s, kills: [] })),
      })),
    };
    const combat = normalizeRiotMatchToCombat(noKills, blue.puuid)!;
    expect(combat.kast).toBeUndefined();
    expect(combat.firstBloods).toBe(0);
  });
});

describe('normalizeRiotRank / normalizeRiotRrHistory', () => {
  it('snapshot → resumo de rank com tier por nome e ícone', () => {
    const snapshot: MockRankSnapshot = { puuid: 'p', competitiveTier: 21, rankedRating: 42, seasonId: 's' };
    expect(normalizeRiotRank(snapshot)).toEqual({
      tier: 'Ascendant 1',
      imageSrc: '/assets/images/ranks/ascendant-1.png',
      rrInTier: 42,
    });
    expect(normalizeRiotRank({ ...snapshot, competitiveTier: 1 })).toEqual({
      tier: null,
      imageSrc: null,
      rrInTier: 42,
    });
    expect(normalizeRiotRank(null)).toBeNull();
  });

  it('pontos de RR em ordem cronológica, com resultado pelo sinal', () => {
    const points: MockRrPoint[] = [
      { matchId: 'm2', matchStartMillis: 2_000, tierBeforeUpdate: 12, tierAfterUpdate: 12, rankedRatingAfterUpdate: 30, rankedRatingEarned: -15 },
      { matchId: 'm1', matchStartMillis: 1_000, tierBeforeUpdate: 11, tierAfterUpdate: 12, rankedRatingAfterUpdate: 45, rankedRatingEarned: 20 },
      { matchId: 'm0', matchStartMillis: 1_000, tierBeforeUpdate: 11, tierAfterUpdate: 1, rankedRatingAfterUpdate: 25, rankedRatingEarned: 0 },
    ];
    const history = normalizeRiotRrHistory(points);
    expect(history.map((p) => p.matchId)).toEqual(['m0', 'm1', 'm2']);
    expect(history[1]).toEqual({
      matchId: 'm1',
      rr: 45,
      delta: 20,
      tier: 'Gold 1',
      tierId: 12,
      result: 'win',
      date: new Date(1_000).toISOString(),
    });
    expect(history[2]!.result).toBe('loss');
    expect(history[0]).toMatchObject({ result: 'neutral', tier: '—' });
  });
});

describe('volume — partidas geradas', () => {
  it('50 partidas do gerador normalizam sem lançar', () => {
    const account = generateAccount(DEMO_ACCOUNT.gameName, DEMO_ACCOUNT.tagLine);
    const list = generateMatchlist(account, 50);
    expect(list.history).toHaveLength(50);
    for (const entry of list.history) {
      const generated = generateMatch(entry.matchId, account);
      const summary = normalizeRiotMatchToSummary(generated, account.puuid, 'br');
      const detail = normalizeRiotMatchToDetail(generated, 'br');
      const combat = normalizeRiotMatchToCombat(generated, account.puuid);
      expect(summary).not.toBeNull();
      expect(combat).not.toBeNull();
      expect(summary!.map).not.toBe('Desconhecido');
      expect(summary!.agent).not.toBeNull();
      expect(summary!.season).not.toBeNull();
      expect(detail.scoreboard).toHaveLength(10);
      expect(detail.scoreboard.every((row) => row.kastPercentage !== null)).toBe(true);
      expect(detail.kills.every((k) => k.weapon !== null)).toBe(true);
      expect(summary!.score.us + summary!.score.them).toBe(summary!.roundsPlayed);
    }
  });
});
