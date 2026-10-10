/**
 * Perfis de agente/mapa para os cards da aba "Agentes & Mapas" (tela
 * Stitch). Funções PURAS: classificam o tier do agente e o status no map
 * pool a partir das agregações normalizadas (`GroupedStat`) e derivam as
 * métricas de exibição. Consumido apenas por views — nenhuma I/O.
 */

import type { AgentStat, GroupedStat, MapStat } from '@/contracts/tracker';

export type AgentTier = 'main' | 'solid' | 'bottleneck';

/** Espelha os status do card de mapa do design system. */
export type MapPoolStatus = 'best' | 'stable' | 'neutral' | 'worst';

/** WR mínimo (com melhor WR da amostra elegível) para virar "main". */
export const MAIN_WINRATE_THRESHOLD = 50;

/** WR abaixo disto é gargalo, independente de amostra/destaque. */
export const BOTTLENECK_WINRATE_THRESHOLD = 45;

/** Amostra mínima (partidas) para elegibilidade de destaque. */
export const MIN_SAMPLE = 3;

export interface AgentCardProfile {
  readonly name: string;
  readonly matches: number;
  /** WR 0–100 (1 casa, já normalizado pelo contrato). */
  readonly winRatePercent: number;
  readonly avgAcs: number;
  /** avgKills/avgDeaths (deaths=0 → avgKills, mesma convenção do KDA). */
  readonly kdRatio: number;
  readonly hsPercent: number | null;
  readonly tier: AgentTier;
}

export interface MapCardProfile {
  readonly name: string;
  readonly matches: number;
  readonly wins: number;
  readonly losses: number;
  readonly winRatePercent: number;
  readonly status: MapPoolStatus;
}

/**
 * Classifica o tier do agente. Precedência: gargalo (WR < 45) → main
 * (melhor WR da amostra elegível com WR ≥ 50) → solid.
 */
export function classifyAgentTier(
  winrate: number,
  matches: number,
  isBest: boolean,
): AgentTier {
  if (winrate < BOTTLENECK_WINRATE_THRESHOLD) {
    return 'bottleneck';
  }
  if (isBest && matches >= MIN_SAMPLE && winrate >= MAIN_WINRATE_THRESHOLD) {
    return 'main';
  }
  return 'solid';
}

/** K/D de exibição: deaths=0 → kills (mesma convenção do KDA do contrato). */
export function kdRatio(avgKills: number, avgDeaths: number): number {
  return avgDeaths === 0 ? avgKills : avgKills / avgDeaths;
}

/**
 * Índice do valor extremo (maior quando `compare = >`, menor quando `<`)
 * entre linhas com amostra elegível; `null` se nenhuma qualifica. Empates
 * ficam com o primeiro índice (determinístico).
 */
function extremeIndex(
  rows: readonly GroupedStat[],
  compare: (candidate: number, current: number) => boolean,
): number | null {
  let bestIndex: number | null = null;
  let bestValue = Number.NaN;

  rows.forEach((row, index) => {
    if (row.matches < MIN_SAMPLE) {
      return;
    }
    if (bestIndex === null || compare(row.winrate, bestValue)) {
      bestIndex = index;
      bestValue = row.winrate;
    }
  });

  return bestIndex;
}

/** Perfis de agente ordenados como recebidos (cronológico do contrato). */
export function buildAgentCardProfiles(
  agents: readonly AgentStat[],
): readonly AgentCardProfile[] {
  const bestIndex = extremeIndex(agents, (candidate, current) => candidate > current);

  return agents.map((agent, index) => ({
    name: agent.key,
    matches: agent.matches,
    winRatePercent: agent.winrate,
    avgAcs: agent.avgAcs,
    kdRatio: kdRatio(agent.avgKills, agent.avgDeaths),
    hsPercent: agent.avgHsPercentage,
    tier: classifyAgentTier(agent.winrate, agent.matches, index === bestIndex),
  }));
}

/**
 * Status no map pool: melhor/pior apenas entre mapas elegíveis e quando
 * distintos (single map ou empate total → sem extremos). Fora disso:
 * estável (WR ≥ 50, amostra elegível) ou neutro.
 */
export function buildMapCardProfiles(maps: readonly MapStat[]): readonly MapCardProfile[] {
  const bestIndex = extremeIndex(maps, (candidate, current) => candidate > current);
  const worstIndex = extremeIndex(maps, (candidate, current) => candidate < current);
  const hasExtremes = bestIndex !== null && worstIndex !== null && bestIndex !== worstIndex;

  return maps.map((map, index) => {
    let status: MapPoolStatus;
    if (hasExtremes && index === bestIndex) {
      status = 'best';
    } else if (hasExtremes && index === worstIndex) {
      status = 'worst';
    } else if (map.matches >= MIN_SAMPLE && map.winrate >= MAIN_WINRATE_THRESHOLD) {
      status = 'stable';
    } else {
      status = 'neutral';
    }

    return {
      name: map.key,
      matches: map.matches,
      wins: map.wins,
      losses: map.losses,
      winRatePercent: map.winrate,
      status,
    };
  });
}
