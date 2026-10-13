/**
 * Perfis de agente/mapa para os cards da seção "Agentes & Mapas" (tela
 * Stitch). Funções PURAS: classificam o tier do agente e o status no map
 * pool a partir das agregações normalizadas (`GroupedStat`) e derivam as
 * métricas de exibição. Consumido apenas por views — nenhuma I/O.
 */

import type { AgentStat, GroupedStat, MapStat } from '@/contracts/tracker';
import { BENCHMARK_REFERENCE } from './benchmark';
import { roundTo } from './combat';

export type AgentTier = 'main' | 'solid' | 'bottleneck';

/** Espelha os status do card de mapa do design system. */
export type MapPoolStatus =
  | 'best'
  | 'good'
  | 'stable'
  | 'neutral'
  | 'unfavorable'
  | 'worst';

/** WR mínimo (com melhor WR da amostra elegível) para virar "main". */
export const MAIN_WINRATE_THRESHOLD = 50;

/** WR abaixo disto é gargalo, independente de amostra/destaque. */
export const BOTTLENECK_WINRATE_THRESHOLD = 45;

/** Amostra mínima (partidas) para elegibilidade de destaque. */
export const MIN_SAMPLE = 3;

interface MapWinrateBand {
  readonly minimum: number;
  readonly status: MapPoolStatus;
}

/**
 * Faixas de WR do status do mapa (calibráveis, verificadas por teste).
 * Ancoradas na paridade (50%) e reutilizando os cortes de gargalo (45) e main
 * (50): cada mapa recebe um rótulo derivado APENAS do win rate real.
 */
export const MAP_WINRATE_BANDS: readonly MapWinrateBand[] = [
  { minimum: 60, status: 'best' },
  { minimum: 55, status: 'good' },
  { minimum: 50, status: 'stable' },
  { minimum: 45, status: 'neutral' },
  { minimum: 30, status: 'unfavorable' },
  { minimum: 0, status: 'worst' },
];

/** Faixa de WR → status (`MAP_WINRATE_BANDS`); nunca fabrica amostra. */
export function classifyMapStatus(winrate: number): MapPoolStatus {
  let status: MapPoolStatus = 'worst';
  for (const band of MAP_WINRATE_BANDS) {
    if (winrate >= band.minimum) {
      status = band.status;
      break;
    }
  }
  return status;
}

export interface AgentCardProfile {
  readonly name: string;
  readonly matches: number;
  /** WR 0–100 (1 casa, já normalizado pelo contrato). */
  readonly winRatePercent: number;
  readonly avgAcs: number;
  /** avgKills/avgDeaths (deaths=0 → avgKills, mesma convenção do KDA). */
  readonly kdRatio: number;
  readonly hsPercent: number | null;
  /** Δ do K/D sobre a referência de elo (negativo = abaixo). */
  readonly kdDelta: number;
  /** Δ do ACS sobre a referência de elo (negativo = abaixo). */
  readonly acsDelta: number;
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

/**
 * Perfis de agente ordenados por ACS DECRESCENTE (desempate alfabético) —
 * assinatura visual da seção ("SORT: ACS DECRESCENTE" no Stitch). O tier é
 * classificado antes da ordenação (depende do WR, não da posição).
 */
export function buildAgentCardProfiles(
  agents: readonly AgentStat[],
): readonly AgentCardProfile[] {
  const best = extremeStat(agents, (candidate, current) => candidate > current);

  const profiles = agents.map((agent): AgentCardProfile => {
    const ratio = kdRatio(agent.avgKills, agent.avgDeaths);
    return {
      name: agent.key,
      matches: agent.matches,
      winRatePercent: agent.winrate,
      avgAcs: agent.avgAcs,
      kdRatio: ratio,
      hsPercent: agent.avgHsPercentage,
      kdDelta: roundTo(ratio - BENCHMARK_REFERENCE.kdr.value, 2),
      acsDelta: agent.avgAcs - BENCHMARK_REFERENCE.acs.value,
      tier: classifyAgentTier(agent.winrate, agent.matches, agent === best),
    };
  });

  return profiles.sort((a, b) =>
    a.avgAcs === b.avgAcs ? a.name.localeCompare(b.name) : b.avgAcs - a.avgAcs,
  );
}

/** Métrica usada para ordenar a matriz de agentes (dado real do perfil). */
export type AgentSortKey = 'acs' | 'winrate' | 'kd' | 'matches' | 'hs';

/** Direção da ordenação: decrescente (maior→menor) ou crescente. */
export type SortDirection = 'desc' | 'asc';

/**
 * Valor comparável do perfil por chave. `null` só em HS% ausente — sinalizado
 * para a ordenação manter amostras sem dado sempre no fim.
 */
function agentSortValue(profile: AgentCardProfile, key: AgentSortKey): number | null {
  switch (key) {
    case 'acs':
      return profile.avgAcs;
    case 'winrate':
      return profile.winRatePercent;
    case 'kd':
      return profile.kdRatio;
    case 'matches':
      return profile.matches;
    case 'hs':
      return profile.hsPercent;
  }
}

/**
 * Ordena os perfis de agente pela métrica escolhida (padrão: ACS decrescente,
 * a assinatura atual da matriz). Perfis sem dado (HS% nulo) ficam SEMPRE no
 * fim, independente da direção e na ordem de entrada; empates desempatam pelo
 * nome (ascendente, determinístico). Não muta a entrada.
 */
export function sortAgentProfiles(
  profiles: readonly AgentCardProfile[],
  key: AgentSortKey = 'acs',
  direction: SortDirection = 'desc',
): readonly AgentCardProfile[] {
  // Comparador: negativo = `a` antes de `b`. Desc → maior primeiro.
  const sign = direction === 'desc' ? 1 : -1;

  const measured = profiles
    .map((profile) => ({ profile, value: agentSortValue(profile, key) }))
    .filter((entry): entry is { profile: AgentCardProfile; value: number } => entry.value !== null);

  measured.sort((a, b) => {
    if (a.value === b.value) {
      return a.profile.name.localeCompare(b.profile.name);
    }
    return a.value < b.value ? sign : -sign;
  });

  const missing = profiles.filter((profile) => agentSortValue(profile, key) === null);

  return [...measured.map((entry) => entry.profile), ...missing];
}

/**
 * Status no map pool por faixa de WR real (`MAP_WINRATE_BANDS`): melhor →
 * positivo → estável → neutro → desfavorável → pior. O rótulo reflete só o
 * win rate observado (a amostra segue visível em "Partidas"), sem depender de
 * extremos relativos ou de amostra mínima.
 */
export function buildMapCardProfiles(maps: readonly MapStat[]): readonly MapCardProfile[] {
  return maps.map((map) => ({
    name: map.key,
    matches: map.matches,
    wins: map.wins,
    losses: map.losses,
    winRatePercent: map.winrate,
    status: classifyMapStatus(map.winrate),
  }));
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
