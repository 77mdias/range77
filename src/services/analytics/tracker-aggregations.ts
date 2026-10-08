import type {
  AgentStat,
  MapStat,
  MatchResult,
  MatchSummary,
  StreakSummary,
  TrendSummary,
} from '@/contracts/tracker';
import { roundTo } from './combat';

/**
 * PASSO 3 — IMPLEMENTAÇÃO: agregações puras do tracker.
 * ======================================================================
 *
 * Funções determinísticas sobre `MatchSummary[]` (ordem de entrada livre —
 * cada agregado reordena cronologicamente quando faz sentido). Regras de
 * rigor: divisões por zero têm convenção explícita (nunca Infinity/NaN);
 * HS% médio é `null` quando nenhuma partida tem dado de tiro.
 */

const UNKNOWN_AGENT = 'Desconhecido';

/** Média aritmética; `0` para lista vazia (call sites garantem não-vazia). */
export function average(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Vitórias / total em % (0–100, 1 casa). `total ≤ 0` → 0. */
export function computeWinrate(wins: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return roundTo((wins / total) * 100, 1);
}

/** (kills+assists)/deaths. deaths=0 → kills+assists (nunca Infinity). */
export function computeKda(kills: number, assists: number, deaths: number): number {
  const numerator = kills + assists;
  return deaths === 0 ? numerator : roundTo(numerator / deaths, 2);
}

/** Ordena cronologicamente (mais antigas primeiro); empate por matchId. */
function chronological(matches: readonly MatchSummary[]): MatchSummary[] {
  return [...matches].sort((a, b) => {
    if (a.startedAt === b.startedAt) {
      return a.matchId.localeCompare(b.matchId);
    }
    return a.startedAt < b.startedAt ? -1 : 1;
  });
}

function summarizeGroup(key: string, group: readonly MatchSummary[]): AgentStat {
  const wins = group.filter((match) => match.result === 'win').length;
  const kills = group.reduce((sum, match) => sum + match.kills, 0);
  const assists = group.reduce((sum, match) => sum + match.assists, 0);
  const deaths = group.reduce((sum, match) => sum + match.deaths, 0);
  const hsValues = group
    .map((match) => match.hsPercentage)
    .filter((value): value is number => value !== null);

  return {
    key,
    matches: group.length,
    wins,
    losses: group.length - wins,
    winrate: computeWinrate(wins, group.length),
    avgKills: roundTo(average(group.map((match) => match.kills)), 2),
    avgDeaths: roundTo(average(group.map((match) => match.deaths)), 2),
    avgAssists: roundTo(average(group.map((match) => match.assists)), 2),
    kda: computeKda(kills, assists, deaths),
    avgAcs: Math.round(average(group.map((match) => match.acs))),
    avgHsPercentage: hsValues.length === 0 ? null : roundTo(average(hsValues), 1),
  };
}

function summarizeGroups(
  matches: readonly MatchSummary[],
  keyOf: (match: MatchSummary) => string,
): AgentStat[] {
  const groups = new Map<string, MatchSummary[]>();
  for (const match of matches) {
    const key = keyOf(match);
    const bucket = groups.get(key);
    if (bucket === undefined) {
      groups.set(key, [match]);
    } else {
      bucket.push(match);
    }
  }

  const stats = [...groups.entries()].map(([key, group]) => summarizeGroup(key, group));
  // Mais jogados primeiro; desempate alfabético (ordem determinística).
  stats.sort((a, b) => (a.matches === b.matches ? a.key.localeCompare(b.key) : b.matches - a.matches));
  return stats;
}

/** Agrega por agente (agente ausente vira "Desconhecido"). */
export function summarizeByAgent(matches: readonly MatchSummary[]): AgentStat[] {
  return summarizeGroups(matches, (match) => match.agent ?? UNKNOWN_AGENT);
}

/** Agrega por mapa. */
export function summarizeByMap(matches: readonly MatchSummary[]): MapStat[] {
  return summarizeGroups(matches, (match) => match.map);
}

/** Streak atual + maiores sequências de vitória/derrota (ordem cronológica). */
export function computeStreaks(matches: readonly MatchSummary[]): StreakSummary {
  const ordered = chronological(matches);

  let longestWin = 0;
  let longestLoss = 0;
  let runResult: MatchResult | null = null;
  let runLength = 0;

  for (const match of ordered) {
    if (match.result === runResult) {
      runLength += 1;
    } else {
      runResult = match.result;
      runLength = 1;
    }
    if (runResult === 'win') {
      longestWin = Math.max(longestWin, runLength);
    } else {
      longestLoss = Math.max(longestLoss, runLength);
    }
  }

  const last = ordered[ordered.length - 1];
  if (last === undefined) {
    return { current: { result: 'none', length: 0 }, longestWin: 0, longestLoss: 0 };
  }

  let currentLength = 0;
  for (let index = ordered.length - 1; index >= 0; index -= 1) {
    // `index` é válido por construção (0 ≤ index < ordered.length).
    if (ordered[index]!.result === last.result) {
      currentLength += 1;
    } else {
      break;
    }
  }

  return {
    current: { result: last.result, length: currentLength },
    longestWin,
    longestLoss,
  };
}

/** Tendência de ACS por partida (cronológica): último vs. primeiro. */
export function computeAcsTrend(matches: readonly MatchSummary[]): TrendSummary {
  const perMatch = chronological(matches).map((match) => match.acs);
  const first = perMatch[0] ?? 0;
  const last = perMatch[perMatch.length - 1] ?? 0;
  const delta = roundTo(last - first, 2);
  const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';

  return { metric: 'acs', direction, first, last, delta, perMatch };
}

/** Pacote completo de agregações do tracker (consumido pela orquestração). */
export function buildTrackerAggregations(matches: readonly MatchSummary[]): {
  readonly agents: readonly AgentStat[];
  readonly maps: readonly MapStat[];
  readonly streaks: StreakSummary;
  readonly trend: TrendSummary;
} {
  return {
    agents: summarizeByAgent(matches),
    maps: summarizeByMap(matches),
    streaks: computeStreaks(matches),
    trend: computeAcsTrend(matches),
  };
}
