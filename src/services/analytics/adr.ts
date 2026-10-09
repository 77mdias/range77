import type { CoachInsight, ContextualRating } from '@/contracts/coach';
import type { MatchCombatStats } from '@/contracts/henrikdev';
import { CombatMetricsError, rateMetric, roundTo } from '@/services/analytics/combat';

/**
 * Analytics de ADR (Average Damage per Round).
 * ======================================================================
 *
 * Funções PURAS e determinísticas sobre `MatchCombatStats[]`, seguindo o
 * padrão de `combat.ts`:
 *   - Validação fail-fast com `CombatMetricsError` citando índice e campo;
 *   - ADR é média PONDERADA por roundsPlayed (partidas longas pesam mais);
 *   - Nenhuma partida com `damageDealt` → `adr: null`, dano/rounds = 0 e
 *     chaves OMITIDAS no envelope (nunca 0 enganoso ao chatbot).
 *
 * O campo `damageDealt` é opcional no contrato: a HenrikDev v4 fornece
 * `players[].stats.damage.dealt` e o normalizador o extrai quando presente.
 */

/** Métricas agregadas de dano por round. `adr: null` = fonte sem dano. */
export interface AdrMetrics {
  /** Média de dano por round das partidas com dado de dano. `null` se nenhuma. */
  readonly adr: number | null;
  /** Dano total causado nas partidas que forneceram o dado. */
  readonly damageDealt: number;
  /** Rounds somados APENAS das partidas que forneceram o dado. */
  readonly rounds: number;
  readonly totals: { readonly matches: number };
}

/** Métricas expostas ao chatbot (camada 1). Chaves opcionais = omitidas quando ausentes. */
export type AdrRawMetrics = {
  readonly matches: number;
  readonly adr?: number;
  readonly damageDealt?: number;
  readonly rounds?: number;
};

/** Faixa de rating (camada 2). */
interface RatingBand {
  readonly min: number;
  readonly rating: ContextualRating;
}

/**
 * Benchmarks de ADR ranqueado (comunidade / elos altos), em faixas
 * descendentes — ajustáveis sem tocar na lógica de cálculo.
 */
export const ADR_BENCHMARKS: readonly RatingBand[] = [
  { min: 160, rating: 'Excelente' },
  { min: 145, rating: 'Acima da Média' },
  { min: 130, rating: 'Na Média' },
  { min: 115, rating: 'Abaixo da Média' },
  { min: 0, rating: 'Crítico' },
];

/** Abaixo disso a amostra ganha hook de baixa confiabilidade. */
export const ADR_THRESHOLDS = { amostraMinima: 5 } as const;

/** Valida uma partida para fins de ADR (mesmas regras de combat.ts). */
function assertValidAdrMatch(match: MatchCombatStats, index: number): void {
  if (match.damageDealt !== undefined) {
    if (!Number.isFinite(match.damageDealt) || match.damageDealt < 0) {
      throw new CombatMetricsError(
        `Partida #${index} inválida: campo "damageDealt" com valor ${String(match.damageDealt)} (esperado número finito e não-negativo).`,
      );
    }
  }
}

/**
 * Agrega as partidas em métricas de dano por round.
 *
 * @throws {CombatMetricsError} entrada não-array, amostra vazia ou partida
 * com campo inválido (mensagem cita índice e campo exatos).
 */
export function calculateAdr(matches: readonly MatchCombatStats[]): AdrMetrics {
  if (!Array.isArray(matches)) {
    throw new CombatMetricsError(
      'Entrada inválida: esperado um array de partidas para calcular o ADR.',
    );
  }
  if (matches.length === 0) {
    throw new CombatMetricsError('Nenhuma partida fornecida para análise de dano.');
  }

  matches.forEach(assertValidAdrMatch);

  // Apenas partidas COM o dado de dano entram no numerador e no denominador.
  const damageAcc = matches.reduce(
    (acc, m) => {
      if (m.damageDealt !== undefined) {
        acc.damage += m.damageDealt;
        acc.rounds += m.roundsPlayed;
      }
      return acc;
    },
    { damage: 0, rounds: 0 },
  );

  // Guarda de "divisão por zero semântica": sem dado de dano na amostra → null.
  const adr = damageAcc.rounds === 0 ? null : roundTo(damageAcc.damage / damageAcc.rounds, 1);

  return {
    adr,
    damageDealt: damageAcc.damage,
    rounds: damageAcc.rounds,
    totals: { matches: matches.length },
  };
}

/** Hook por faixa de ADR (texto pré-calculado para a IA de baixo custo). */
function buildAdrHook(adr: number, rating: ContextualRating): string {
  switch (rating) {
    case 'Excelente':
      return `ADR de ${adr} é excelente — o jogador gera dano consistente em todos os rounds. Recomende mantê-lo nas posições de impacto e usá-lo como referência de entrada do time.`;
    case 'Acima da Média':
      return `ADR de ${adr} está numa faixa saudável e acima da média. Sugira consolidar o padrão: manter o volume de dano nos rounds de economia sem arriscar duelos desnecessários.`;
    case 'Na Média':
      return `ADR de ${adr} está na média. Sugira pequenos ganhos: melhor posicionamento pós-plant, punir inimigos recarregando e finalizar duelos iniciados por utilitárias.`;
    case 'Abaixo da Média':
      return `ADR de ${adr} está abaixo do ideal. Sugira treinar disciplina de dano: sprays controlados, priorizar alvos de baixa vida e contribuir em todo round com ao menos um dano útil.`;
    case 'Crítico':
      return `ADR de ${adr} está bem abaixo do ideal. Sugira revisar posicionamento e disciplina de dano: 10–15 min de deathmatch focado em controle de spray antes das ranqueadas e mais presença nos rounds contestados.`;
  }
}

/**
 * Monta o envelope de 3 camadas (`CoachInsight`) de ADR.
 * Delega toda a validação a `calculateAdr`.
 */
export function buildAdrInsight(matches: readonly MatchCombatStats[]): CoachInsight<AdrRawMetrics> {
  const metrics = calculateAdr(matches);
  const hooks: string[] = [];

  if (metrics.totals.matches < ADR_THRESHOLDS.amostraMinima) {
    hooks.push(
      `Amostra pequena: ${metrics.totals.matches} partidas analisadas. Avise o jogador que o ADR tem baixa confiabilidade estatística e que a precisão aumenta com mais partidas.`,
    );
  }

  const adr = metrics.adr;

  if (adr !== null) {
    hooks.push(buildAdrHook(adr, rateMetric(adr, ADR_BENCHMARKS, 'Crítico')));
  } else {
    hooks.push(
      `Dano ausente na fonte: o ADR não pôde ser calculado (${metrics.totals.matches} partidas sem o campo de dano). Não informe um valor estimado.`,
    );
  }

  const raw_metrics: AdrRawMetrics = {
    matches: metrics.totals.matches,
    ...(adr !== null ? { adr } : {}),
    ...(adr !== null ? { damageDealt: metrics.damageDealt, rounds: metrics.rounds } : {}),
  };

  const contextual_rating: Partial<Record<keyof AdrRawMetrics, ContextualRating>> = {
    ...(adr !== null ? { adr: rateMetric(adr, ADR_BENCHMARKS, 'Crítico') } : {}),
  };

  return { raw_metrics, contextual_rating, coaching_hooks: hooks };
}
