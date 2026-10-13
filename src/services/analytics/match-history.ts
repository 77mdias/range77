import type { MatchSummary } from '@/contracts/tracker';
import { roundTo } from './combat';
import { average, computeWinrate } from './tracker-aggregations';

/**
 * PASSO 3 — IMPLEMENTAÇÃO: agregações puras da aba "Partidas & Histórico
 * Completo" (tela Breakdown). ============================================
 *
 * Determinístico e sem fabricação: métricas que dependem da timeline de
 * abates (first bloods/deaths) só viram número quando ao menos uma partida
 * traz o dado; caso contrário o campo fica `null` e a UI omite/usa `—`.
 * Divisores zero têm convenção explícita (nunca Infinity/NaN).
 */

/** K/D de exibição da partida (deaths=0 → kills, nunca Infinity). */
export function displayMatchKd(kills: number, deaths: number): number {
  return deaths === 0 ? kills : kills / deaths;
}

/** Métricas agregadas da janela exibida no histórico (KPIs do topo). */
export interface HistoryMetrics {
  readonly matches: number;
  readonly wins: number;
  readonly losses: number;
  /** % de vitórias (0–100, 1 casa). */
  readonly winrate: number;
  /** Média de K/D por partida (2 casas). */
  readonly avgKd: number;
  /** Média de ACS por partida (inteiro). */
  readonly avgAcs: number;
  /** Média de HS% das partidas computáveis; `null` se nenhuma. */
  readonly avgHsPercentage: number | null;
  /** Soma de first bloods; `null` quando nenhuma partida tem timeline. */
  readonly firstBloods: number | null;
  /** First bloods por partida; `null` junto de `firstBloods`. */
  readonly firstBloodsPerMatch: number | null;
  /** Soma de ΔRR casada por `matchId` (0 quando o MMR history não cobre). */
  readonly netRr: number;
}

/**
 * Agrega os KPIs do histórico a partir das partidas e do índice
 * `matchId → ΔRR`. Lista vazia → zeros e first bloods `null` (nada fabricado).
 */
export function buildHistoryMetrics(
  matches: readonly MatchSummary[],
  rrDeltas: ReadonlyMap<string, number>,
): HistoryMetrics {
  const wins = matches.filter((match) => match.result === 'win').length;
  const hsValues = matches
    .map((match) => match.hsPercentage)
    .filter((value): value is number => value !== null);
  const firstBloodValues = matches
    .map((match) => match.firstBloods)
    .filter((value): value is number => typeof value === 'number');
  const firstBloods =
    firstBloodValues.length === 0 ? null : firstBloodValues.reduce((sum, value) => sum + value, 0);

  let netRr = 0;
  for (const match of matches) {
    netRr += rrDeltas.get(match.matchId) ?? 0;
  }

  return {
    matches: matches.length,
    wins,
    losses: matches.length - wins,
    winrate: computeWinrate(wins, matches.length),
    avgKd:
      matches.length === 0
        ? 0
        : roundTo(average(matches.map((match) => displayMatchKd(match.kills, match.deaths))), 2),
    avgAcs: matches.length === 0 ? 0 : Math.round(average(matches.map((match) => match.acs))),
    avgHsPercentage: hsValues.length === 0 ? null : roundTo(average(hsValues), 1),
    firstBloods,
    firstBloodsPerMatch:
      firstBloods === null ? null : roundTo(firstBloods / matches.length, 2),
    netRr: roundTo(netRr, 2),
  };
}

/**
 * Ordena por recência (mais recente primeiro); empate por `matchId` desc —
 * ordem estável e determinística para a lista de partidas.
 */
export function sortMatchesByRecency(matches: readonly MatchSummary[]): readonly MatchSummary[] {
  return [...matches].sort((a, b) => {
    if (a.startedAt === b.startedAt) {
      return b.matchId.localeCompare(a.matchId);
    }
    return a.startedAt < b.startedAt ? 1 : -1;
  });
}
