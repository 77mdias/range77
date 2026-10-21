import { COMPETITIVE_QUEUE_ID, type MatchCombatStats } from '@/contracts/henrikdev';
import type {
  MockRankSnapshot,
  MockRrPoint,
  RiotMatchDto,
  RiotPlayerDto,
  RiotPlayerStatsDto,
} from '@/contracts/riot';
import type {
  AbilityCastCounts,
  KillEvent,
  MatchDetail,
  MatchRound,
  MatchScoreboardRow,
  MatchSummary,
  RrHistoryPoint,
} from '@/contracts/tracker';
import { rankIconSrc } from '@/lib/valorant-assets';
import { computePlayerKast, computeKastByPlayer, type KastInput } from '@/services/analytics/kast';
import { computeFirstBloods, computeMatchHalves } from '@/services/analytics/match-breakdown';
import {
  aggregateRiotPlayerTotals,
  computeAcs,
  computeHeadshotPercentage,
} from '@/services/analytics/riot-match-stats';
import { classifyRrDelta } from '@/services/analytics/rr-trend';
import type { PlayerRankSummary } from '@/services/henrikdev/normalize-tracker';
import {
  agentNameById,
  mapNameById,
  seasonLabelById,
  tierNameById,
  weaponNameById,
} from './catalog';

/**
 * Normalizador Riot VAL-MATCH-V1 → contratos do tracker.
 * ======================================================================
 *
 * O MESMO normalizador serve ao mock (agora) e à API oficial (quando a
 * Production Key chegar). Espelha a semântica de
 * `services/henrikdev/normalize-tracker.ts` para que as duas fontes produzam
 * valores comparáveis: só partidas competitivas e concluídas entram no
 * histórico/combate; ids de conteúdo viram nomes (`./catalog`); `roundNum`
 * (0-based) vira `roundNumber` (1-based).
 *
 * Extração pura (sem I/O, sem cálculo próprio): somas, HS%, ACS, KAST, first
 * bloods e lados vêm de `services/analytics/**`. A `region` do parâmetro
 * prevalece sobre `matchInfo.region`. PUUIDs são opacos (tamanho variável).
 */

const UNKNOWN = 'Desconhecido';

/** Apenas partidas competitivas e concluídas entram nas agregações. */
export function isRiotCompetitiveCompleted(match: RiotMatchDto): boolean {
  return (
    match.matchInfo.queueId.toLowerCase() === COMPETITIVE_QUEUE_ID &&
    match.matchInfo.isCompleted
  );
}

type PlayerWithStats = RiotPlayerDto & { readonly stats: RiotPlayerStatsDto };

function hasStats(player: RiotPlayerDto): player is PlayerWithStats {
  return player.stats !== null && !player.isObserver;
}

function findPlayer(match: RiotMatchDto, puuid: string): PlayerWithStats | undefined {
  return match.players.find(
    (player): player is PlayerWithStats => player.puuid === puuid && hasStats(player),
  );
}

/** Rounds jogados pelo time (`teams[]`), com fallback em `roundResults`. */
function resolveRoundsPlayed(match: RiotMatchDto, teamId: string): number | null {
  const team = match.teams.find((candidate) => candidate.teamId === teamId);
  if (team !== undefined && team.roundsPlayed >= 1) {
    return team.roundsPlayed;
  }
  return match.roundResults.length > 0 ? match.roundResults.length : null;
}

/** Placar {us, them}: `teams[]` (roundsWon/roundsPlayed) ou contando `winningTeam`. */
function resolveScore(
  match: RiotMatchDto,
  teamId: string,
): { readonly us: number; readonly them: number } | null {
  const team = match.teams.find((candidate) => candidate.teamId === teamId);
  if (team !== undefined) {
    return { us: team.roundsWon, them: team.roundsPlayed - team.roundsWon };
  }
  if (match.roundResults.length === 0) {
    return null;
  }
  const us = match.roundResults.filter((round) => round.winningTeam === teamId).length;
  return { us, them: match.roundResults.length - us };
}

/** `teams[].won`; sem o time, compara o placar contado. */
function resolveResult(
  match: RiotMatchDto,
  teamId: string,
  score: { readonly us: number; readonly them: number },
): 'win' | 'loss' {
  const team = match.teams.find((candidate) => candidate.teamId === teamId);
  if (team !== undefined) {
    return team.won ? 'win' : 'loss';
  }
  return score.us >= score.them ? 'win' : 'loss';
}

function teamByPuuid(match: RiotMatchDto): Map<string, string> {
  const teams = new Map<string, string>();
  for (const player of match.players) {
    teams.set(player.puuid, player.teamId);
  }
  return teams;
}

function startedAtIso(match: RiotMatchDto): string {
  return new Date(match.matchInfo.gameStartMillis).toISOString();
}

/** Rounds genéricos (sem jogador); `plantTeamId` = time de quem plantou. */
export function normalizeRiotRounds(match: RiotMatchDto): MatchRound[] {
  const teams = teamByPuuid(match);
  return match.roundResults.map((round) => ({
    roundNumber: round.roundNum + 1,
    winningTeamId: round.winningTeam,
    plantSite: round.plantSite ?? null,
    plantTeamId: round.bombPlanter === undefined ? null : (teams.get(round.bombPlanter) ?? null),
    defused: round.bombDefuser !== undefined,
  }));
}

/** Timeline de abates (os KillDto vivem em `roundResults[].playerStats[].kills`), em ordem de partida. */
export function normalizeRiotKills(match: RiotMatchDto): KillEvent[] {
  const names = new Map<string, string>();
  for (const player of match.players) {
    names.set(player.puuid, player.gameName);
  }
  const nameOf = (puuid: string): string => names.get(puuid) || UNKNOWN;

  const kills: KillEvent[] = [];
  for (const round of match.roundResults) {
    for (const stats of round.playerStats) {
      for (const kill of stats.kills) {
        kills.push({
          roundNumber: round.roundNum + 1,
          timeInMatchMs: kill.timeSinceGameStartMillis,
          timeInRoundMs: kill.timeSinceRoundStartMillis,
          killerPuuid: kill.killer,
          killerName: nameOf(kill.killer),
          victimPuuid: kill.victim,
          victimName: nameOf(kill.victim),
          assistantNames: kill.assistants.map(nameOf),
          assistantPuuids: [...kill.assistants],
          weapon: weaponNameById(kill.finishingDamage.damageItem),
        });
      }
    }
  }
  return kills.sort(
    (a, b) =>
      a.timeInMatchMs - b.timeInMatchMs ||
      a.roundNumber - b.roundNumber ||
      (a.timeInRoundMs ?? 0) - (b.timeInRoundMs ?? 0),
  );
}

/** Entrada neutra do KAST (rounds declarados + abates com time e timestamp). */
function buildKastInput(match: RiotMatchDto, kills: readonly KillEvent[]): KastInput {
  return {
    roundNumbers: match.roundResults.map((round) => round.roundNum + 1),
    kills,
    teamByPuuid: teamByPuuid(match),
  };
}

function normalizeAbilityCasts(stats: RiotPlayerStatsDto): AbilityCastCounts | null {
  const casts = stats.abilityCasts;
  if (casts === null) {
    return null;
  }
  return {
    ability1: casts.ability1Casts,
    ability2: casts.ability2Casts,
    grenade: casts.grenadeCasts,
    ultimate: casts.ultimateCasts,
  };
}

/** Linha do histórico do jogador `puuid`. `null` = fora do filtro / não normalizável. */
export function normalizeRiotMatchToSummary(
  match: RiotMatchDto,
  puuid: string,
  region: string,
): MatchSummary | null {
  if (!isRiotCompetitiveCompleted(match)) {
    return null;
  }
  const player = findPlayer(match, puuid);
  if (player === undefined) {
    return null;
  }

  const teamId = player.teamId;
  const roundsPlayed = resolveRoundsPlayed(match, teamId);
  const score = resolveScore(match, teamId);
  if (roundsPlayed === null || score === null) {
    return null;
  }

  const kills = normalizeRiotKills(match);
  const entry = computeFirstBloods(kills).get(puuid);
  const totals = aggregateRiotPlayerTotals(match.roundResults).get(puuid);
  const halves = computeMatchHalves(normalizeRiotRounds(match), teamId);

  return {
    matchId: match.matchInfo.matchId,
    region: region.toLowerCase(),
    map: mapNameById(match.matchInfo.mapId) ?? UNKNOWN,
    queue: match.matchInfo.queueId,
    season: seasonLabelById(match.matchInfo.seasonId),
    startedAt: startedAtIso(match),
    gameLengthMs: match.matchInfo.gameLengthMillis,
    result: resolveResult(match, teamId, score),
    agent: agentNameById(player.characterId),
    teamId,
    score,
    kills: player.stats.kills,
    deaths: player.stats.deaths,
    assists: player.stats.assists,
    acs: computeAcs(player.stats.score, roundsPlayed),
    hsPercentage:
      totals === undefined
        ? null
        : computeHeadshotPercentage(totals.headshots, totals.bodyshots, totals.legshots),
    // A Riot sempre traz a timeline: ausência na tabela = 0 (valor real).
    firstBloods: entry?.firstBloods ?? 0,
    firstDeaths: entry?.firstDeaths ?? 0,
    ...(halves !== null ? { halves } : {}),
    roundsPlayed,
  };
}

/** Scoreboard completo (jogadores com stats; observadores ficam fora). */
export function normalizeRiotScoreboard(
  match: RiotMatchDto,
  kills: readonly KillEvent[] = normalizeRiotKills(match),
): MatchScoreboardRow[] {
  const kastByPlayer = computeKastByPlayer(buildKastInput(match, kills));
  const totalsByPlayer = aggregateRiotPlayerTotals(match.roundResults);
  return match.players.filter(hasStats).map((player) => {
    const totals = totalsByPlayer.get(player.puuid);
    const roundsPlayed = resolveRoundsPlayed(match, player.teamId) ?? 0;
    return {
      puuid: player.puuid,
      name: player.gameName || UNKNOWN,
      tag: player.tagLine,
      teamId: player.teamId,
      agent: agentNameById(player.characterId) ?? UNKNOWN,
      tier: tierNameById(player.competitiveTier),
      kills: player.stats.kills,
      deaths: player.stats.deaths,
      assists: player.stats.assists,
      score: player.stats.score,
      acs: computeAcs(player.stats.score, roundsPlayed),
      hsPercentage:
        totals === undefined
          ? null
          : computeHeadshotPercentage(totals.headshots, totals.bodyshots, totals.legshots),
      damageDealt: totals?.damageDealt ?? 0,
      damageReceived: totals?.damageReceived ?? 0,
      kastPercentage: kastByPlayer.get(player.puuid) ?? null,
      economy: totals?.economy ?? null,
      abilityCasts: normalizeAbilityCasts(player.stats),
    };
  });
}

/** Detalhe completo (scoreboard duplo + rounds + timeline). Sem filtro de fila. */
export function normalizeRiotMatchToDetail(match: RiotMatchDto, region: string): MatchDetail {
  const kills = normalizeRiotKills(match);
  return {
    matchId: match.matchInfo.matchId,
    region: region.toLowerCase(),
    map: mapNameById(match.matchInfo.mapId) ?? UNKNOWN,
    queue: match.matchInfo.queueId,
    season: seasonLabelById(match.matchInfo.seasonId),
    startedAt: startedAtIso(match),
    gameLengthMs: match.matchInfo.gameLengthMillis,
    isCompleted: match.matchInfo.isCompleted,
    teams: match.teams.map((team) => ({
      teamId: team.teamId,
      won: team.won,
      roundsWon: team.roundsWon,
      roundsLost: team.roundsPlayed - team.roundsWon,
    })),
    scoreboard: normalizeRiotScoreboard(match, kills),
    rounds: normalizeRiotRounds(match),
    kills,
  };
}

/** Amostra canônica de combate do jogador (mesmos filtros do histórico). */
export function normalizeRiotMatchToCombat(
  match: RiotMatchDto,
  puuid: string,
): MatchCombatStats | null {
  if (!isRiotCompetitiveCompleted(match)) {
    return null;
  }
  const player = findPlayer(match, puuid);
  if (player === undefined) {
    return null;
  }
  const roundsPlayed = resolveRoundsPlayed(match, player.teamId);
  if (roundsPlayed === null) {
    return null;
  }

  const kills = normalizeRiotKills(match);
  const entry = computeFirstBloods(kills).get(puuid);
  const kast = kills.length > 0 ? computePlayerKast(buildKastInput(match, kills), puuid) : null;
  const totals = aggregateRiotPlayerTotals(match.roundResults).get(puuid);

  return {
    kills: player.stats.kills,
    deaths: player.stats.deaths,
    assists: player.stats.assists,
    roundsPlayed,
    headshots: totals?.headshots ?? 0,
    bodyshots: totals?.bodyshots ?? 0,
    legshots: totals?.legshots ?? 0,
    score: player.stats.score,
    ...(kast !== null ? { kast } : {}),
    firstBloods: entry?.firstBloods ?? 0,
    firstDeaths: entry?.firstDeaths ?? 0,
    damageDealt: totals?.damageDealt ?? 0,
  };
}

/**
 * Rank atual (snapshot SEM EQUIVALENTE OFICIAL — ver `MockRankSnapshot`) →
 * resumo do header do perfil. Sem snapshot → `null`.
 */
export function normalizeRiotRank(snapshot: MockRankSnapshot | null): PlayerRankSummary | null {
  if (snapshot === null) {
    return null;
  }
  const tier = tierNameById(snapshot.competitiveTier);
  return {
    tier,
    imageSrc: tier === null ? null : rankIconSrc(tier),
    rrInTier: snapshot.rankedRating,
  };
}

/** Histórico de RR (mock) → pontos ORDENADOS no tempo (antigo → recente). */
export function normalizeRiotRrHistory(points: readonly MockRrPoint[]): RrHistoryPoint[] {
  return [...points]
    .sort(
      (a, b) => a.matchStartMillis - b.matchStartMillis || a.matchId.localeCompare(b.matchId),
    )
    .map((point) => ({
      matchId: point.matchId,
      rr: point.rankedRatingAfterUpdate,
      delta: point.rankedRatingEarned,
      tier: tierNameById(point.tierAfterUpdate) ?? '—',
      tierId: point.tierAfterUpdate,
      result: classifyRrDelta(point.rankedRatingEarned),
      date: new Date(point.matchStartMillis).toISOString(),
    }));
}
