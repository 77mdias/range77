import type { GroupedStat, MatchSummary } from '@/contracts/tracker';

/**
 * PASSO 3 — IMPLEMENTAÇÃO: filtros REAIS da seção "Agentes & Mapas".
 * ======================================================================
 *
 * O contrato (`MatchSummary`) traz `season`/`queue` por partida — dá para
 * filtrar de verdade, sem inventar dado. A amostra mínima atua sobre as
 * agregações (`GroupedStat`), nunca sobre partidas individuais. Funções
 * puras: consumidas pela ilha client do perfil, testadas com 100% de cobertura.
 */

/** Valor de select que desliga um filtro (todas as temporadas/filas). */
export const FILTER_ALL = 'all';

/** Filtros ativos; `null` = filtro desligado. */
export interface ProfileFilters {
  readonly season: string | null;
  readonly queue: string | null;
}

/** Opção de `<select>` da FilterBar. */
export interface FilterOption {
  readonly value: string;
  readonly label: string;
}

/** Partidas que passam pelos filtros de temporada/fila. */
export function filterMatchesForProfiles(
  matches: readonly MatchSummary[],
  filters: ProfileFilters,
): readonly MatchSummary[] {
  return matches.filter(
    (match) =>
      (filters.season === null || match.season === filters.season) &&
      (filters.queue === null || match.queue === filters.queue),
  );
}

/** Mantém apenas grupos com amostra >= mínimo; `null` = sem filtro. */
export function filterByMinMatches<T extends GroupedStat>(
  stats: readonly T[],
  minMatches: number | null,
): readonly T[] {
  if (minMatches === null) {
    return stats;
  }
  return stats.filter((stat) => stat.matches >= minMatches);
}

/** Valores distintos não-nulos em ordem desc (temporada mais nova primeiro). */
export function distinctSortedDesc(
  values: readonly (string | null)[],
): readonly string[] {
  return [...new Set(values.filter((value): value is string => value !== null))].sort((a, b) =>
    b.localeCompare(a),
  );
}

/** Opções do select de temporada: "todas" + valores presentes no histórico. */
export function seasonOptions(matches: readonly MatchSummary[]): readonly FilterOption[] {
  return [
    { value: FILTER_ALL, label: 'Todas as temporadas' },
    ...distinctSortedDesc(matches.map((match) => match.season)).map((season) => ({
      value: season,
      label: season,
    })),
  ];
}

/** Opções do select de fila: "todas" + filas presentes (rótulo capitalizado). */
export function queueOptions(matches: readonly MatchSummary[]): readonly FilterOption[] {
  return [
    { value: FILTER_ALL, label: 'Todas as filas' },
    ...distinctSortedDesc(matches.map((match) => match.queue)).map((queue) => ({
      value: queue,
      label: queue.charAt(0).toUpperCase() + queue.slice(1),
    })),
  ];
}
