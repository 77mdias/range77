import type { CoachInsight, ContextualRating } from '@/contracts/coach';
import type { MatchCombatStats } from '@/contracts/henrikdev';
import { COMBAT_BENCHMARKS, CombatMetricsError, rateMetric, roundTo } from '@/services/analytics/combat';

/**
 * Analytics de CONSISTÊNCIA de ACS.
 * ======================================================================
 *
 * Funções PURAS e determinísticas sobre `MatchCombatStats[]`, seguindo o
 * padrão de `combat.ts`:
 *   - Desvio padrão POPULACIONAL por partida do ACS individual
 *     (score/roundsPlayed de cada partida) — SEM ponderação por rounds,
 *     porque a unidade de análise é "o desempenho de ontem vs. o de hoje";
 *   - coefficientVariation = stdDeviation / average, com guarda explícita:
 *     average 0 → null (nunca Infinity no JSON);
 *   - Amostra < 2 partidas → classificação "Indeterminado"
 *     (desvio de 1 ponto não mede variabilidade).
 *
 * Benchmarks de `average` reaproveitam as faixas de ACS de `combat.ts`.
 */

/** Classificação de estabilidade do desempenho. */
export type ConsistencyClass = 'Muito estável' | 'Estável' | 'Volátil' | 'Indeterminado';

/** Métricas de consistência. `coefficientVariation` null = não computável. */
export interface ConsistencyMetrics {
  /** ACS médio por partida (média aritmética dos ACS individuais). */
  readonly average: number;
  /** Desvio padrão populacional dos ACS por partida. */
  readonly stdDeviation: number;
  /** stdDeviation / average. `null` se average = 0 (guarda de divisão por zero). */
  readonly coefficientVariation: number | null;
  readonly classification: ConsistencyClass;
  readonly totals: { readonly matches: number };
}

/** Métricas expostas ao chatbot (camada 1). Chave opcional = omitida quando não computável. */
export type ConsistencyRawMetrics = {
  readonly matches: number;
  readonly average: number;
  readonly stdDeviation: number;
  readonly coefficientVariation?: number;
};

/** Faixa de rating do CV (camada 2). */
interface RatingBand {
  readonly min: number;
  readonly rating: ContextualRating;
}

/**
 * Thresholds de classificação e benchmark do CV.
 *
 * Interpretação do CV (menor = mais consistente) — bandas "invertidas":
 * CV BAIXO é bom, então as faixas são sobre 1 − CV.
 */
export const CONSISTENCY_THRESHOLDS = {
  /** CV < 0.1 → "Muito estável" (oscilação ~nula entre partidas). */
  muitoEstavel: 0.1,
  /** CV < 0.25 → "Estável". */
  estavel: 0.25,
  /** Abaixo disso a amostra ganha hook de baixa confiabilidade. */
  amostraMinima: 5,
} as const;

/** Benchmark do CV: quanto MENOR, melhor (rating por 1 − CV). */
export const CONSISTENCY_BENCHMARKS: readonly RatingBand[] = [
  { min: 0.92, rating: 'Excelente' }, // CV ≤ 0.08
  { min: 0.8, rating: 'Acima da Média' }, // CV ≤ 0.2
  { min: 0.72, rating: 'Na Média' }, // CV ≤ 0.28
  { min: 0.65, rating: 'Abaixo da Média' }, // CV ≤ 0.35
  { min: 0, rating: 'Crítico' },
];

/** Valida uma partida para fins de consistência (mesmas regras de combat.ts). */
function assertValidConsistencyMatch(match: MatchCombatStats, index: number): void {
  if (!Number.isFinite(match.roundsPlayed) || match.roundsPlayed < 1) {
    throw new CombatMetricsError(
      `Partida #${index} inválida: campo "roundsPlayed" com valor ${String(match.roundsPlayed)} (esperado >= 1).`,
    );
  }
  if (!Number.isFinite(match.score) || match.score < 0) {
    throw new CombatMetricsError(
      `Partida #${index} inválida: campo "score" com valor ${String(match.score)} (esperado número finito e não-negativo).`,
    );
  }
}

function classifyConsistency(
  coefficientVariation: number | null,
  sampleSize: number,
): ConsistencyClass {
  if (sampleSize < 2 || coefficientVariation === null) {
    return 'Indeterminado';
  }
  if (coefficientVariation < CONSISTENCY_THRESHOLDS.muitoEstavel) {
    return 'Muito estável';
  }
  return coefficientVariation < CONSISTENCY_THRESHOLDS.estavel ? 'Estável' : 'Volátil';
}

/**
 * Agrega as partidas em métricas de consistência de ACS.
 *
 * @throws {CombatMetricsError} entrada não-array, amostra vazia ou partida
 * com campo inválido (mensagem cita índice e campo exatos).
 */
export function calculateAcsConsistency(
  matches: readonly MatchCombatStats[],
): ConsistencyMetrics {
  if (!Array.isArray(matches)) {
    throw new CombatMetricsError(
      'Entrada inválida: esperado um array de partidas para calcular a consistência.',
    );
  }
  if (matches.length === 0) {
    throw new CombatMetricsError('Nenhuma partida fornecida para análise de consistência.');
  }

  matches.forEach(assertValidConsistencyMatch);

  // ACS por partida (unidade de análise) — sem ponderação por rounds.
  const acsByMatch = matches.map((m) => m.score / m.roundsPlayed);
  const averageRaw = acsByMatch.reduce((sum, acs) => sum + acs, 0) / acsByMatch.length;
  const variance =
    acsByMatch.reduce((sum, acs) => sum + (acs - averageRaw) ** 2, 0) / acsByMatch.length;
  const stdDeviation = Math.sqrt(variance);

  const average = roundTo(averageRaw, 0);
  // Guarda de divisão por zero: ACS médio 0 → CV null (nunca Infinity).
  const coefficientVariation =
    averageRaw === 0 ? null : roundTo(stdDeviation / averageRaw, 2);

  return {
    average,
    stdDeviation: roundTo(stdDeviation, 0),
    coefficientVariation,
    classification: classifyConsistency(coefficientVariation, acsByMatch.length),
    totals: { matches: acsByMatch.length },
  };
}

/** Hook de estabilidade por classificação (texto pré-calculado; classificações mensuráveis). */
function buildStabilityHook(
  average: number,
  stdDeviation: number,
  classification: Exclude<ConsistencyClass, 'Indeterminado'>,
): string {
  switch (classification) {
    case 'Muito estável':
      return `Desempenho muito estável (ACS médio ${average} ± ${stdDeviation}). Recomende manter a rotina atual — aquecimento, mapa e papel — pois ela está entregando resultados previsíveis.`;
    case 'Estável':
      return `Desempenho estável (ACS médio ${average} ± ${stdDeviation}). Sugira buscar os rounds de pico: identificar o que muda nas partidas abaixo da média (sono, tilt, composição) e criar um checklist pré-partida.`;
    case 'Volátil':
      return `Desempenho volátil (ACS médio ${average} ± ${stdDeviation}). Sugira rotina de consistência: pausas entre ranqueadas, aquecimento fixo e revisão de uma partida ruim por dia para identificar o gatilho da queda.`;
  }
}

/**
 * Monta o envelope de 3 camadas (`CoachInsight`) de consistência.
 * Delega toda a validação a `calculateAcsConsistency`.
 */
export function buildConsistencyInsight(
  matches: readonly MatchCombatStats[],
): CoachInsight<ConsistencyRawMetrics> {
  const metrics = calculateAcsConsistency(matches);
  const hooks: string[] = [];

  if (metrics.totals.matches === 1) {
    hooks.push(
      `Consistência exige amostra: apenas 1 partida analisada. Avise o jogador que a estabilidade do desempenho só pode ser medida com 2 ou mais partidas.`,
    );
  } else if (metrics.totals.matches < CONSISTENCY_THRESHOLDS.amostraMinima) {
    hooks.push(
      `Amostra pequena: ${metrics.totals.matches} partidas analisadas. Avise o jogador que a análise de consistência tem baixa confiabilidade estatística e que a precisão aumenta com mais partidas.`,
    );
  }

  const cv = metrics.coefficientVariation;

  // Amostra mensurável (≥2 partidas): hook por classificação; ACS médio 0 → hook de integridade.
  if (cv !== null && metrics.classification !== 'Indeterminado') {
    hooks.push(
      buildStabilityHook(metrics.average, metrics.stdDeviation, metrics.classification),
    );
  } else if (cv === null && metrics.totals.matches >= 2) {
    hooks.push(
      `ACS médio igual a zero em toda a amostra: o coeficiente de variação não pode ser calculado (divisão por zero). Verifique a integridade dos dados da fonte antes de orientar o jogador.`,
    );
  }

  const raw_metrics: ConsistencyRawMetrics = {
    matches: metrics.totals.matches,
    average: metrics.average,
    stdDeviation: metrics.stdDeviation,
    ...(cv !== null ? { coefficientVariation: cv } : {}),
  };

  const contextual_rating: Partial<Record<keyof ConsistencyRawMetrics, ContextualRating>> = {
    average: rateMetric(metrics.average, COMBAT_BENCHMARKS.acs, 'Crítico'),
    ...(cv !== null
      ? {
          coefficientVariation: rateMetric(
            1 - cv,
            CONSISTENCY_BENCHMARKS,
            'Crítico',
          ),
        }
      : {}),
  };

  return { raw_metrics, contextual_rating, coaching_hooks: hooks };
}
