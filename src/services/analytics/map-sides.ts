/**
 * Splits DEF/ATK agregados por mapa a partir do histórico normalizado. Puro:
 * soma os `halves` REAIS de cada partida (perspectiva do jogador) e nunca
 * chuta — mapas sem nenhuma partida com lados inferíveis ficam de fora e
 * cada lado ausente vira `null`.
 */

import type { MatchHalves, MatchSummary } from '@/contracts/tracker';
import { roundTo } from './combat';

export interface MapSideStat {
  /** % de rounds vencidos no ataque (0–100, 1 casa); `null` sem rounds. */
  readonly attackPercent: number | null;
  /** % de rounds vencidos na defesa (0–100, 1 casa); `null` sem rounds. */
  readonly defensePercent: number | null;
}

interface SideTally {
  won: number;
  total: number;
}

function accumulate(tally: SideTally, half: { readonly won: number; readonly lost: number }): void {
  tally.won += half.won;
  tally.total += half.won + half.lost;
}

function toPercent(tally: SideTally): number | null {
  if (tally.total === 0) {
    return null;
  }
  return roundTo((tally.won / tally.total) * 100, 1);
}

/** Indexa os halves computáveis por mapa (descarta partidas sem split real). */
function groupHalvesByMap(
  matches: readonly MatchSummary[],
): ReadonlyMap<string, readonly MatchHalves[]> {
  const grouped = new Map<string, MatchHalves[]>();
  for (const match of matches) {
    const { halves } = match;
    if (halves === undefined || halves === null) {
      continue;
    }
    const bucket = grouped.get(match.map);
    if (bucket === undefined) {
      grouped.set(match.map, [halves]);
    } else {
      bucket.push(halves);
    }
  }
  return grouped;
}

/**
 * Percentuais de vitória por lado (DEF/ATK) em cada mapa. Só entram mapas com
 * ao menos um split real; `null` num lado sem rounds computáveis.
 */
export function buildMapSideStats(
  matches: readonly MatchSummary[],
): ReadonlyMap<string, MapSideStat> {
  const stats = new Map<string, MapSideStat>();
  for (const [map, halves] of groupHalvesByMap(matches)) {
    const attack: SideTally = { won: 0, total: 0 };
    const defense: SideTally = { won: 0, total: 0 };
    for (const half of halves) {
      accumulate(attack, half.attack);
      accumulate(defense, half.defense);
    }
    stats.set(map, {
      attackPercent: toPercent(attack),
      defensePercent: toPercent(defense),
    });
  }
  return stats;
}
