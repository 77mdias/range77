/**
 * PASSO 3 — IMPLEMENTAÇÃO: Rating ValCoach (métrica composta documentada).
 * ======================================================================
 *
 * A Riot/HenrikDev não expõem um "rating" oficial. Este módulo deriva um
 * número transparente a partir de componentes que já computamos, cada um
 * normalizado por uma REFERÊNCIA de jogador médio (razão = componente/ref).
 * Um jogador na média de todas as dimensões recebe exatamente 1.00.
 *
 *   kill     = KPR / 0.70
 *   assist   = APR / 0.25
 *   survival = (1 − DPR) / 0.50
 *   kast     = (KAST% / 100) / 0.70
 *   entry    = FKPR / 0.13
 *
 * Rating = média PONDERADA das razões disponíveis (pesos abaixo). Componentes
 * ausentes (ex.: KAST sem timeline) são excluídos e os pesos renormalizados —
 * nunca preenchemos com zero. Sem rounds → `null`.
 */

export interface PerformanceRatingInput {
  readonly kills: number;
  readonly deaths: number;
  readonly assists: number;
  readonly rounds: number;
  /** First kills (aberturas vencidas) quando disponíveis. */
  readonly firstKills?: number | null;
  /** KAST% (0–100) quando disponível. */
  readonly kastPercentage?: number | null;
}

/** Referências de jogador médio (componentes divididos por estes valores). */
export const RATING_BASELINES = {
  kpr: 0.7,
  apr: 0.25,
  survivalRate: 0.5,
  kast: 0.7,
  fkpr: 0.13,
} as const;

/** Pesos relativos das dimensões (somam 1 quando há todas). */
export const RATING_WEIGHTS = {
  kill: 0.35,
  assist: 0.1,
  survival: 0.2,
  kast: 0.2,
  entry: 0.15,
} as const;

/**
 * Rating composto (2 casas) ou `null` se não houver rounds.
 * Dimensões sem dado são omitidas e os pesos renormalizados entre as restantes.
 */
export function computePerformanceRating(input: PerformanceRatingInput): number | null {
  const { kills, deaths, assists, rounds, firstKills, kastPercentage } = input;
  if (!Number.isFinite(rounds) || rounds <= 0) {
    return null;
  }

  const kpr = kills / rounds;
  const apr = assists / rounds;
  const dpr = deaths / rounds;
  const survivalRate = Math.max(0, 1 - dpr);

  const parts: { weight: number; value: number }[] = [
    { weight: RATING_WEIGHTS.kill, value: kpr / RATING_BASELINES.kpr },
    { weight: RATING_WEIGHTS.assist, value: apr / RATING_BASELINES.apr },
    { weight: RATING_WEIGHTS.survival, value: survivalRate / RATING_BASELINES.survivalRate },
  ];
  if (kastPercentage !== null && kastPercentage !== undefined) {
    parts.push({
      weight: RATING_WEIGHTS.kast,
      value: kastPercentage / 100 / RATING_BASELINES.kast,
    });
  }
  if (firstKills !== null && firstKills !== undefined) {
    parts.push({ weight: RATING_WEIGHTS.entry, value: firstKills / rounds / RATING_BASELINES.fkpr });
  }

  const weightSum = parts.reduce((sum, part) => sum + part.weight, 0);
  const weighted = parts.reduce((sum, part) => sum + part.weight * part.value, 0);
  return Math.round((weighted / weightSum) * 100) / 100;
}
