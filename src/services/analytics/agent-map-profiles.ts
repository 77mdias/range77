/**
 * Perfis de agente/mapa para os cards da seção "Agentes & Mapas" (tela
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

/** Dado real para o CoachingTip do map pool (tudo derivado das agregações). */
export interface MapPoolAdvice {
  readonly worstMap: string;
  readonly worstWinRate: number;
  readonly worstMatches: number;
  /** Melhor mapa elegível; `null` quando não há extremo distinto. */
  readonly bestMap: string | null;
  readonly bestWinRate: number | null;
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
 * Linha de valor extremo (maior quando `compare = >`, menor quando `<`)
 * entre linhas com amostra elegível; `null` se nenhuma qualifica. Empates
 * ficam com a primeira linha (determinístico). A comparação por IDENTIDADE
 * (`row === extreme`) substitui índices — as agregações têm `key` único e as
 * views comparam as mesmas referências recebidas.
 */
function extremeStat<T extends GroupedStat>(
  rows: readonly T[],
  compare: (candidate: number, current: number) => boolean,
): T | null {
  let extreme: T | null = null;

  rows.forEach((row) => {
    if (row.matches < MIN_SAMPLE) {
      return;
    }
    if (extreme === null || compare(row.winrate, extreme.winrate)) {
      extreme = row;
    }
  });

  return extreme;
}

/** Perfis de agente ordenados como recebidos (cronológico do contrato). */
export function buildAgentCardProfiles(
  agents: readonly AgentStat[],
): readonly AgentCardProfile[] {
  const best = extremeStat(agents, (candidate, current) => candidate > current);

  return agents.map((agent) => ({
    name: agent.key,
    matches: agent.matches,
    winRatePercent: agent.winrate,
    avgAcs: agent.avgAcs,
    kdRatio: kdRatio(agent.avgKills, agent.avgDeaths),
    hsPercent: agent.avgHsPercentage,
    tier: classifyAgentTier(agent.winrate, agent.matches, agent === best),
  }));
}

/**
 * Status no map pool: melhor/pior apenas entre mapas elegíveis e quando
 * distintos (single map ou empate total → sem extremos). Fora disso:
 * estável (WR ≥ 50, amostra elegível) ou neutro.
 */
export function buildMapCardProfiles(maps: readonly MapStat[]): readonly MapCardProfile[] {
  const best = extremeStat(maps, (candidate, current) => candidate > current);
  const worst = extremeStat(maps, (candidate, current) => candidate < current);
  const hasExtremes = best !== null && worst !== null && best !== worst;

  return maps.map((map) => {
    let status: MapPoolStatus;
    if (hasExtremes && map === best) {
      status = 'best';
    } else if (hasExtremes && map === worst) {
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

/**
 * Conselho de map pool a partir do pior mapa elegível (mesma regra do
 * status "Pior mapa"): só existe quando há um extremo negativo computável —
 * sem amostra elegível, não há conselho (`null`, nunca fabricado).
 */
export function buildMapPoolAdvice(maps: readonly MapStat[]): MapPoolAdvice | null {
  const worst = extremeStat(maps, (candidate, current) => candidate < current);
  if (worst === null) {
    return null;
  }
  const bestCandidate = extremeStat(maps, (candidate, current) => candidate > current);
  const bestMap = bestCandidate !== null && bestCandidate !== worst ? bestCandidate : null;

  return {
    worstMap: worst.key,
    worstWinRate: worst.winrate,
    worstMatches: worst.matches,
    bestMap: bestMap?.key ?? null,
    bestWinRate: bestMap?.winrate ?? null,
  };
}
