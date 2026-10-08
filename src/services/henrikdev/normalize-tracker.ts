import {
  COMPETITIVE_QUEUE_ID,
  type HenrikDevMatchV4,
  type HenrikDevPlayerV4,
  type HenrikDevRoundPlayerRef,
  type HenrikDevRoundV4,
} from '@/contracts/henrikdev';
import type {
  AbilityCastCounts,
  EconomySummary,
  KillEvent,
  MatchDetail,
  MatchRound,
  MatchScoreboardRow,
  MatchSummary,
  RoundOutcome,
} from '@/contracts/tracker';
import { roundTo } from '@/services/analytics/combat';

/**
 * PASSO 3 — IMPLEMENTAÇÃO: normalizador HenrikDev v4 → contratos do tracker.
 *
 * Extração pura (sem I/O): localiza o jogador, resolve placar/vencedor por
 * round e monta scoreboard/timeline. Tolerante a campos ausentes — partidas
 * sem dados íntegros são omitidas na lista (`null`), nunca inventadas.
 */

/** Time exibido quando a metadata não traz o mapa. */
const UNKNOWN_MAP = 'Desconhecido';
const UNKNOWN_QUEUE = 'unknown';

/** Localiza o jogador analisado pelo Riot ID (case-insensitive). */
export function findTrackerPlayer(
  match: HenrikDevMatchV4,
  name: string,
  tag: string,
): HenrikDevPlayerV4 | undefined {
  const lowerName = name.toLowerCase();
  const lowerTag = tag.toLowerCase();
  return match.players.find(
    (player) =>
      player.name?.toLowerCase() === lowerName &&
      player.tag?.toLowerCase() === lowerTag &&
      player.stats !== null &&
      typeof player.stats === 'object',
  );
}

/** Apenas partidas competitivas e concluídas entram nas agregações. */
export function isCompetitiveCompletedMatch(match: HenrikDevMatchV4): boolean {
  if (match.metadata?.queue?.id?.toLowerCase() !== COMPETITIVE_QUEUE_ID) {
    return false;
  }
  return match.metadata?.is_completed !== false;
}

function computeHsPercentage(
  headshots: number,
  bodyshots: number,
  legshots: number,
): number | null {
  const total = headshots + bodyshots + legshots;
  if (total === 0) {
    return null;
  }
  return roundTo((headshots / total) * 100, 1);
}

/**
 * Resolve o `team_id` vencedor de um round. O campo confiável é
 * `winning_team`; alguns payloads usam o rótulo legado "Team1"/"Team2",
 * que mapeamos para a ordem de `teams[]`. Retorna `null` se irresolúvel.
 */
export function resolveWinningTeamId(
  round: HenrikDevRoundV4,
  teamIds: readonly string[],
): string | null {
  const raw = round.winning_team;
  if (typeof raw !== 'string' || raw.length === 0) {
    return null;
  }
  if (teamIds.includes(raw)) {
    return raw;
  }
  const legacy = /^Team([12])$/i.exec(raw);
  if (legacy !== null) {
    const index = Number(legacy[1]) - 1;
    return teamIds[index] ?? null;
  }
  return raw;
}

function teamIdsOf(match: HenrikDevMatchV4): string[] {
  return match.teams.map((team) => team.team_id);
}

/** Rounds jogados pelo time (soma won+lost), ou nº de rounds; `null` se indeterminável. */
function resolveRoundsPlayed(match: HenrikDevMatchV4, teamId: string): number | null {
  const team = match.teams.find((candidate) => candidate.team_id === teamId);
  if (team !== undefined) {
    const rounds = (team.rounds?.won ?? 0) + (team.rounds?.lost ?? 0);
    if (rounds >= 1) {
      return rounds;
    }
  }
  if (match.rounds !== undefined && match.rounds.length > 0) {
    return match.rounds.length;
  }
  return null;
}

/** Placar do time do jogador ({us, them}) — por teams[] ou contando rounds. */
function resolveTeamScore(
  match: HenrikDevMatchV4,
  teamId: string,
): { readonly us: number; readonly them: number } | null {
  const team = match.teams.find((candidate) => candidate.team_id === teamId);
  if (team !== undefined) {
    return { us: team.rounds?.won ?? 0, them: team.rounds?.lost ?? 0 };
  }
  if (match.rounds !== undefined && match.rounds.length > 0) {
    const teamIds = teamIdsOf(match);
    let us = 0;
    let them = 0;
    for (const round of match.rounds) {
      if (resolveWinningTeamId(round, teamIds) === teamId) {
        us += 1;
      } else {
        them += 1;
      }
    }
    return { us, them };
  }
  return null;
}

/** Resultado a partir de teams[].won; fallback contando rounds. */
function resolveMatchResult(
  match: HenrikDevMatchV4,
  teamId: string,
): 'win' | 'loss' | null {
  const team = match.teams.find((candidate) => candidate.team_id === teamId);
  if (team !== undefined) {
    return team.won ? 'win' : 'loss';
  }
  const score = resolveTeamScore(match, teamId);
  if (score === null) {
    return null;
  }
  return score.us >= score.them ? 'win' : 'loss';
}

function normalizeEconomy(economy: HenrikDevPlayerV4['economy']): EconomySummary | null {
  if (economy === undefined) {
    return null;
  }
  const spent = economy.spent?.overall;
  const loadoutValue = economy.loadout_value?.overall;
  if (spent === undefined && loadoutValue === undefined) {
    return null;
  }
  return { spent: spent ?? 0, loadoutValue: loadoutValue ?? 0 };
}

function normalizeAbilityCasts(
  casts: HenrikDevPlayerV4['ability_casts'],
): AbilityCastCounts | null {
  if (casts === undefined) {
    return null;
  }
  return {
    ability1: casts.ability1 ?? 0,
    ability2: casts.ability2 ?? 0,
    grenade: casts.grenade ?? 0,
    ultimate: casts.ultimate ?? 0,
  };
}

function displayName(ref: HenrikDevRoundPlayerRef | undefined): string {
  if (ref === undefined || ref.name === undefined || ref.name === '') {
    return 'Desconhecido';
  }
  return ref.name;
}

/** Converte um bruto numa linha do histórico. `null` = não normalizável. */
export function normalizeMatchToSummary(
  match: HenrikDevMatchV4,
  region: string,
  name: string,
  tag: string,
): MatchSummary | null {
  if (!isCompetitiveCompletedMatch(match)) {
    return null;
  }

  const player = findTrackerPlayer(match, name, tag);
  if (player === undefined) {
    return null;
  }

  const teamId = player.team_id;
  if (teamId === undefined || teamId === '') {
    return null;
  }

  const roundsPlayed = resolveRoundsPlayed(match, teamId);
  const result = resolveMatchResult(match, teamId);
  const score = resolveTeamScore(match, teamId);
  if (roundsPlayed === null || result === null || score === null) {
    return null;
  }

  return {
    matchId: match.metadata.match_id,
    region: region.toLowerCase(),
    map: match.metadata.map?.name ?? UNKNOWN_MAP,
    queue: match.metadata.queue?.id ?? UNKNOWN_QUEUE,
    season: match.metadata.season?.short ?? null,
    startedAt: match.metadata.started_at ?? '',
    gameLengthMs: match.metadata.game_length_in_ms ?? 0,
    result,
    agent: player.agent?.name ?? null,
    teamId,
    score,
    kills: player.stats.kills,
    deaths: player.stats.deaths,
    assists: player.stats.assists,
    acs: Math.round(player.stats.score / roundsPlayed),
    hsPercentage: computeHsPercentage(
      player.stats.headshots,
      player.stats.bodyshots,
      player.stats.legshots,
    ),
    roundsPlayed,
  };
}

/** Todas as partidas válidas do jogador, MAIS RECENTES PRIMEIRO. */
export function normalizeMatchesToSummaries(
  matches: readonly HenrikDevMatchV4[] | undefined,
  player: { readonly name: string; readonly tag: string },
  region: string,
): MatchSummary[] {
  const summaries: MatchSummary[] = [];
  for (const match of matches ?? []) {
    const summary = normalizeMatchToSummary(match, region, player.name, player.tag);
    if (summary !== null) {
      summaries.push(summary);
    }
  }

  summaries.sort((a, b) => {
    if (a.startedAt === b.startedAt) {
      return a.matchId < b.matchId ? 1 : -1;
    }
    return a.startedAt < b.startedAt ? 1 : -1;
  });

  return summaries;
}

/** Scoreboard completo (todos os jogadores da partida). */
export function normalizeMatchToScoreboard(match: HenrikDevMatchV4): MatchScoreboardRow[] {
  return match.players.map((player) => {
    const teamId = player.team_id ?? '';
    const roundsPlayed = resolveRoundsPlayed(match, teamId);
    return {
      puuid: player.puuid,
      name: player.name ?? 'Desconhecido',
      tag: player.tag ?? '',
      teamId,
      agent: player.agent?.name ?? 'Desconhecido',
      tier: player.tier?.name ?? null,
      kills: player.stats.kills,
      deaths: player.stats.deaths,
      assists: player.stats.assists,
      score: player.stats.score,
      acs: roundsPlayed === null ? 0 : Math.round(player.stats.score / roundsPlayed),
      hsPercentage: computeHsPercentage(
        player.stats.headshots,
        player.stats.bodyshots,
        player.stats.legshots,
      ),
      damageDealt: player.stats.damage?.dealt ?? 0,
      damageReceived: player.stats.damage?.received ?? 0,
      economy: normalizeEconomy(player.economy),
      abilityCasts: normalizeAbilityCasts(player.ability_casts),
    };
  });
}

/** Rounds genéricos (sem jogador) — para o detalhe da partida. */
export function normalizeMatchToRounds(match: HenrikDevMatchV4): MatchRound[] {
  const teamIds = teamIdsOf(match);
  const rounds: MatchRound[] = [];
  for (const round of match.rounds ?? []) {
    const winningTeamId = resolveWinningTeamId(round, teamIds);
    if (winningTeamId === null) {
      continue;
    }
    rounds.push({
      roundNumber: round.id + 1,
      winningTeamId,
      plantSite: round.plant?.site ?? null,
      defused: round.defuse !== undefined && round.defuse !== null,
    });
  }
  return rounds;
}

/** Rounds relativos ao jogador analisado. */
export function normalizeMatchToPlayerRounds(
  match: HenrikDevMatchV4,
  playerTeamId: string,
): RoundOutcome[] {
  return normalizeMatchToRounds(match).map((round) => ({
    ...round,
    playerTeamId,
    won: round.winningTeamId === playerTeamId,
  }));
}

/** Timeline de abates normalizada. */
export function normalizeMatchToKills(match: HenrikDevMatchV4): KillEvent[] {
  const kills: KillEvent[] = [];
  for (const kill of match.kills ?? []) {
    kills.push({
      roundNumber: kill.round + 1,
      timeInMatchMs: kill.time_in_match_in_ms,
      timeInRoundMs: kill.time_in_round_in_ms ?? null,
      killerPuuid: kill.killer?.puuid ?? '',
      killerName: displayName(kill.killer),
      victimPuuid: kill.victim?.puuid ?? '',
      victimName: displayName(kill.victim),
      assistantNames: (kill.assistants ?? []).map(displayName),
      weapon: kill.weapon?.name ?? null,
    });
  }
  return kills;
}

/** Detalhe completo de uma partida (scoreboard duplo + rounds + timeline). */
export function normalizeMatchToDetail(match: HenrikDevMatchV4, region: string): MatchDetail {
  return {
    matchId: match.metadata.match_id,
    region: region.toLowerCase(),
    map: match.metadata.map?.name ?? UNKNOWN_MAP,
    queue: match.metadata.queue?.id ?? UNKNOWN_QUEUE,
    season: match.metadata.season?.short ?? null,
    startedAt: match.metadata.started_at ?? '',
    gameLengthMs: match.metadata.game_length_in_ms ?? 0,
    isCompleted: match.metadata.is_completed !== false,
    teams: match.teams.map((team) => ({
      teamId: team.team_id,
      won: team.won,
      roundsWon: team.rounds?.won ?? 0,
      roundsLost: team.rounds?.lost ?? 0,
    })),
    scoreboard: normalizeMatchToScoreboard(match),
    rounds: normalizeMatchToRounds(match),
    kills: normalizeMatchToKills(match),
  };
}
