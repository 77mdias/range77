import type { MatchSummary } from '@/contracts/tracker';
import { roundTo } from './combat';

/**
 * PASSO 3 — IMPLEMENTAÇÃO: benchmark de calibração (Player × média do elo).
 * ======================================================================
 *
 * Compara as métricas REAIS do jogador com REFERÊNCIAS DOCUMENTADAS de elo
 * alto (mesmo precedente de `COMBAT_BENCHMARKS`): constantes estáticas e
 * auditáveis, não estimativas por partida. As escalas (mín/máx) só servem
 * para posicionar a barra visível — a métrica em si é o valor do jogador.
 *
 * Métricas não computáveis (HS% sem tiro, FB% sem timeline) são OMITIDAS da
 * lista — nunca zere para não enganar.
 */

export type BenchmarkKey = 'kdr' | 'acs' | 'hs' | 'entry';

/** Referência estática + escala de exibição de uma métrica. */
export interface BenchmarkReference {
  /** Valor de referência do elo (média). */
  readonly value: number;
  /** Piso da escala visual. */
  readonly min: number;
  /** Teto da escala visual. */
  readonly max: number;
  readonly minLabel: string;
  readonly maxLabel: string;
  readonly valueLabel: string;
}

/**
 * Referências de elo alto (Imortal/Ascendant) documentadas para calibração.
 * Ajustáveis sem tocar na lógica de cálculo.
 */
export const BENCHMARK_REFERENCE: Readonly<Record<BenchmarkKey, BenchmarkReference>> = {
  kdr: {
    value: 1.05,
    min: 0,
    max: 2,
    minLabel: '0.00',
    maxLabel: '2.00 CAP',
    valueLabel: '1.05 ELO BENCHMARK',
  },
  acs: {
    value: 215,
    min: 0,
    max: 350,
    minLabel: '0',
    maxLabel: '350 MAX',
    valueLabel: '215 ELO BENCHMARK',
  },
  hs: {
    value: 23,
    min: 0,
    max: 50,
    minLabel: '0%',
    maxLabel: '50% MAX',
    valueLabel: '23% ELO BENCHMARK',
  },
  entry: {
    value: 16.4,
    min: 0,
    max: 35,
    minLabel: '0.0%',
    maxLabel: '35.0% MAX',
    valueLabel: '16.4% ELO BENCHMARK',
  },
};

/** Rótulos de exibição por métrica. */
export const BENCHMARK_LABELS: Readonly<Record<BenchmarkKey, string>> = {
  kdr: 'K/D Geral Ponderado',
  acs: 'ACS Médio (Impacto por Round)',
  hs: 'Headshot % (Precisão Geral)',
  entry: 'Taxa de Primeiro Duelo Vencido (FB%)',
};

/** Uma linha de comparação pronta para o `BenchmarkBar`. */
export interface BenchmarkMetric {
  readonly key: BenchmarkKey;
  readonly label: string;
  readonly playerValue: string;
  readonly eloValue: string;
  /** Posição do jogador na barra (0–100). */
  readonly playerPercent: number;
  /** Posição do marcador do elo (0–100). */
  readonly eloPercent: number;
  readonly above: boolean;
  readonly scale: readonly string[];
}

const FORMATTERS: Readonly<Record<BenchmarkKey, (value: number) => string>> = {
  kdr: (value) => value.toFixed(2),
  acs: (value) => String(Math.round(value)),
  hs: (value) => `${roundTo(value, 1)}%`,
  entry: (value) => `${roundTo(value, 1)}%`,
};

function sumBy<T>(items: readonly T[], pick: (item: T) => number): number {
  return items.reduce((sum, item) => sum + pick(item), 0);
}

/** Posição relativa (0–100) de um valor dentro da escala, limitada. */
function position(value: number, reference: BenchmarkReference): number {
  const ratio = (value - reference.min) / (reference.max - reference.min);
  return Math.min(100, Math.max(0, roundTo(ratio * 100, 1)));
}

function buildMetric(key: BenchmarkKey, value: number): BenchmarkMetric {
  const reference = BENCHMARK_REFERENCE[key];
  const format = FORMATTERS[key];

  return {
    key,
    label: BENCHMARK_LABELS[key],
    playerValue: format(value),
    eloValue: format(reference.value),
    playerPercent: position(value, reference),
    eloPercent: position(reference.value, reference),
    above: value >= reference.value,
    scale: [reference.minLabel, reference.valueLabel, reference.maxLabel],
  };
}

/**
 * Compara o jogador à referência de elo. Lista vazia = sem amostra.
 * Sempre inclui K/D e ACS; HS% e FB% só quando há dado real.
 */
export function buildBenchmarkComparison(
  matches: readonly MatchSummary[],
): readonly BenchmarkMetric[] {
  if (matches.length === 0) {
    return [];
  }

  const rounds = sumBy(matches, (match) => match.roundsPlayed);
  const kills = sumBy(matches, (match) => match.kills);
  const deaths = sumBy(matches, (match) => match.deaths);

  const kdr = deaths === 0 ? kills : roundTo(kills / deaths, 2);
  const weightedAcs =
    rounds === 0 ? 0 : sumBy(matches, (match) => match.acs * match.roundsPlayed) / rounds;

  const metrics: BenchmarkMetric[] = [buildMetric('kdr', kdr), buildMetric('acs', weightedAcs)];

  const hsMatches = matches.filter(
    (match): match is MatchSummary & { readonly hsPercentage: number } =>
      match.hsPercentage !== null,
  );
  if (hsMatches.length > 0) {
    const hsTotal = hsMatches.reduce((sum, match) => sum + match.hsPercentage, 0);
    metrics.push(buildMetric('hs', hsTotal / hsMatches.length));
  }

  const entryMatches = matches.filter(
    (match) => match.firstBloods !== undefined || match.firstDeaths !== undefined,
  );
  if (entryMatches.length > 0) {
    const firstBloods = sumBy(entryMatches, (match) => match.firstBloods ?? 0);
    const firstDeaths = sumBy(entryMatches, (match) => match.firstDeaths ?? 0);
    const duels = firstBloods + firstDeaths;
    if (duels > 0) {
      metrics.push(buildMetric('entry', (firstBloods / duels) * 100));
    }
  }

  return metrics;
}
