import type { CoachInsight, ContextualRating } from '@/contracts/coach';
import type { MatchCombatStats } from '@/contracts/henrikdev';
import { CombatMetricsError, rateMetric, roundTo } from '@/services/analytics/combat';

/**
 * Analytics de ENTRY AGGRESSIVENESS (agressividade de entrada).
 * ======================================================================
 *
 * Funções PURAS e determinísticas sobre `MatchCombatStats[]`, seguindo o
 * padrão de `combat.ts`:
 *   - Validação fail-fast com `CombatMetricsError` citando índice e campo;
 *   - Divisões por zero têm guarda explícita: FB=FD=0 → `entryRatio` null
 *     e classificação "Indeterminado" (nunca `Infinity`/`NaN` no JSON);
 *   - Amostra sem timeline de kills (sem FB/FD na fonte) → métricas de
 *     entrada `null` e chaves OMITIDAS no envelope (nunca 0 enganoso).
 *
 * Definições:
 *   - attempts          → FB + FD (duelos de abertura disputados);
 *   - entryRatio        → FB / attempts (taxa de vitória na entrada);
 *   - entryRatePerRound → FB / rounds totais;
 *   - killDeathEntryRatio → FB / FD (FD=0 → igual a FB, convenção finita).
 */

/** Classificação do estilo de entrada. */
export type EntryClass = 'Agressivo' | 'Equilibrado' | 'Recuado' | 'Indeterminado';

/** Métricas agregadas de agressividade de entrada. Campos `null` = não computável. */
export interface EntryMetrics {
  /** Duelos de abertura disputados (FB + FD). `null` se a fonte não forneceu. */
  readonly attempts: number | null;
  readonly firstBloods: number | null;
  readonly firstDeaths: number | null;
  /** FB / (FB + FD). `null` quando 0/0 (nenhum duelo disputado). */
  readonly entryRatio: number | null;
  /** FB por round. `null` sem timeline (com timeline, 0 é um valor real). */
  readonly entryRatePerRound: number | null;
  /** FB / FD. FD=0 → igual a FB (convenção de amostra sem FD, nunca Infinity). */
  readonly killDeathEntryRatio: number | null;
  readonly classification: EntryClass;
  readonly totals: { readonly matches: number; readonly rounds: number };
}

/** Métricas expostas ao chatbot (camada 1). Chaves opcionais = omitidas quando ausentes. */
export type EntryRawMetrics = {
  readonly matches: number;
  readonly rounds: number;
  readonly attempts?: number;
  readonly firstBloods?: number;
  readonly firstDeaths?: number;
  readonly entryRatio?: number;
  readonly entryRatePerRound?: number;
  readonly killDeathEntryRatio?: number;
};

/** Faixas de rating (camada 2) — indexáveis sem fallback. */
interface RatingBand {
  readonly min: number;
  readonly rating: ContextualRating;
}

interface EntryBenchmarkSet {
  readonly entryRatio: readonly RatingBand[];
  readonly entryRatePerRound: readonly RatingBand[];
  readonly killDeathEntryRatio: readonly RatingBand[];
}

/**
 * Thresholds de classificação do estilo e benchmarks de faixas.
 * Base: referências de elos altos do Valorant (Imortal/Radiante) —
 * ajustáveis sem tocar na lógica de cálculo.
 */
export const ENTRY_THRESHOLDS = {
  /** entryRatio ≥ 0.55 → "Agressivo" (vence a maioria dos duelos de abertura). */
  agressivo: 0.55,
  /** entryRatio ≥ 0.45 → "Equilibrado". */
  equilibrado: 0.45,
  /** Abaixo disso a amostra ganha hook de baixa confiabilidade. */
  amostraMinima: 5,
} as const;

export const ENTRY_BENCHMARKS: EntryBenchmarkSet = {
  // Proporção de duelos de abertura vencidos (FB/attempts).
  entryRatio: [
    { min: 0.62, rating: 'Excelente' },
    { min: 0.55, rating: 'Acima da Média' },
    { min: 0.48, rating: 'Na Média' },
    { min: 0.4, rating: 'Abaixo da Média' },
    { min: 0, rating: 'Crítico' },
  ],
  // First bloods por round (jogador de entrada de alto elo fica ~0.15–0.20).
  entryRatePerRound: [
    { min: 0.2, rating: 'Excelente' },
    { min: 0.15, rating: 'Acima da Média' },
    { min: 0.11, rating: 'Na Média' },
    { min: 0.07, rating: 'Abaixo da Média' },
    { min: 0, rating: 'Crítico' },
  ],
  killDeathEntryRatio: [
    { min: 1.4, rating: 'Excelente' },
    { min: 1.15, rating: 'Acima da Média' },
    { min: 0.95, rating: 'Na Média' },
    { min: 0.75, rating: 'Abaixo da Média' },
    { min: 0, rating: 'Crítico' },
  ],
};

/** Valida uma partida para fins de entry analytics (mesmas regras de combat.ts). */
function assertValidEntryMatch(match: MatchCombatStats, index: number): void {
  if (!Number.isFinite(match.roundsPlayed) || match.roundsPlayed < 1) {
    throw new CombatMetricsError(
      `Partida #${index} inválida: campo "roundsPlayed" com valor ${String(match.roundsPlayed)} (esperado >= 1).`,
    );
  }

  const assertNonNegative = (value: number, field: string): void => {
    if (!Number.isFinite(value) || value < 0) {
      throw new CombatMetricsError(
        `Partida #${index} inválida: campo "${field}" com valor ${String(value)} (esperado número finito e não-negativo).`,
      );
    }
  };

  if (match.firstBloods !== undefined) {
    assertNonNegative(match.firstBloods, 'firstBloods');
  }
  if (match.firstDeaths !== undefined) {
    assertNonNegative(match.firstDeaths, 'firstDeaths');
  }
}

function classifyEntry(entryRatio: number | null): EntryClass {
  if (entryRatio === null) {
    return 'Indeterminado';
  }
  if (entryRatio >= ENTRY_THRESHOLDS.agressivo) {
    return 'Agressivo';
  }
  return entryRatio >= ENTRY_THRESHOLDS.equilibrado ? 'Equilibrado' : 'Recuado';
}

/**
 * Agrega as partidas em métricas de agressividade de entrada.
 *
 * @throws {CombatMetricsError} entrada não-array, amostra vazia ou partida
 * com campo inválido (mensagem cita índice e campo exatos).
 */
export function calculateEntryAggressiveness(
  matches: readonly MatchCombatStats[],
): EntryMetrics {
  if (!Array.isArray(matches)) {
    throw new CombatMetricsError(
      'Entrada inválida: esperado um array de partidas para calcular a agressividade de entrada.',
    );
  }
  if (matches.length === 0) {
    throw new CombatMetricsError('Nenhuma partida fornecida para análise de entrada.');
  }

  matches.forEach(assertValidEntryMatch);

  const totals = matches.reduce(
    (acc, m) => {
      acc.matches += 1;
      acc.rounds += m.roundsPlayed;
      return acc;
    },
    { matches: 0, rounds: 0 },
  );

  // FB/FD somam-se apenas quando a fonte forneceu a timeline em ao menos 1 partida.
  const hasEntryData = matches.some(
    (m) => m.firstBloods !== undefined || m.firstDeaths !== undefined,
  );

  if (!hasEntryData) {
    return {
      attempts: null,
      firstBloods: null,
      firstDeaths: null,
      entryRatio: null,
      entryRatePerRound: null,
      killDeathEntryRatio: null,
      classification: 'Indeterminado',
      totals,
    };
  }

  const firstBloods = matches.reduce((sum, m) => sum + (m.firstBloods ?? 0), 0);
  const firstDeaths = matches.reduce((sum, m) => sum + (m.firstDeaths ?? 0), 0);
  const attempts = firstBloods + firstDeaths;

  // Guarda de divisão por zero: nenhum duelo de abertura disputado → null.
  const entryRatio = attempts === 0 ? null : roundTo(firstBloods / attempts, 2);
  const entryRatePerRound = roundTo(firstBloods / totals.rounds, 2);
  // FD=0 → razão igual aos FB (convenção finita, nunca Infinity).
  const killDeathEntryRatio =
    firstDeaths === 0 ? firstBloods : roundTo(firstBloods / firstDeaths, 2);

  return {
    attempts,
    firstBloods,
    firstDeaths,
    entryRatio,
    entryRatePerRound,
    killDeathEntryRatio,
    classification: classifyEntry(entryRatio),
    totals,
  };
}

/** Hook de estilo de entrada por classificação (texto pré-calculado). */
function buildStyleHook(
  entry: { readonly firstBloods: number; readonly firstDeaths: number; readonly entryRatePerRound: number },
  classification: EntryClass,
): string {
  switch (classification) {
    case 'Agressivo':
      return `Estilo de entrada agressivo (${entry.firstBloods} first bloods contra ${entry.firstDeaths} first deaths, ${entry.entryRatePerRound} FB por round). Recomende manter a iniciativa, mas sempre com um companheiro por perto para garantir o trade.`;
    case 'Equilibrado':
      return `Entrada equilibrada (${entry.firstBloods} first bloods contra ${entry.firstDeaths} first deaths). Sugira escolher os duelos de abertura por contexto: entrar nos rounds de vantagem numérica e segurar nos rounds de economia.`;
    case 'Recuado':
      return `Entrada recuada (${entry.firstBloods} first bloods contra ${entry.firstDeaths} first deaths). Sugira estudar timing das utilitárias inimigas, esperar o primeiro contato e punir o trade — ou treinar aberturas em deathmatch para ganhar confiança.`;
    case 'Indeterminado':
      return `Nenhum duelo de abertura registrado na amostra (${entry.firstBloods} first bloods, ${entry.firstDeaths} first deaths). O estilo de entrada não pôde ser classificado — analise posicionamento e uso de utilitárias nos primeiros 20 segundos de cada round.`;
  }
}

/**
 * Monta o envelope de 3 camadas (`CoachInsight`) de agressividade de
 * entrada. Delega toda a validação a `calculateEntryAggressiveness`.
 */
export function buildEntryInsight(
  matches: readonly MatchCombatStats[],
): CoachInsight<EntryRawMetrics> {
  const metrics = calculateEntryAggressiveness(matches);
  const hooks: string[] = [];

  if (metrics.totals.matches < ENTRY_THRESHOLDS.amostraMinima) {
    hooks.push(
      `Amostra pequena: ${metrics.totals.matches} partidas analisadas. Avise o jogador que a análise de entrada tem baixa confiabilidade estatística e que a precisão aumenta com mais partidas.`,
    );
  }

  // Invariante do cálculo: as três métricas de timeline são computadas juntas.
  const entryData =
    metrics.firstBloods !== null &&
    metrics.firstDeaths !== null &&
    metrics.entryRatePerRound !== null
      ? {
          firstBloods: metrics.firstBloods,
          firstDeaths: metrics.firstDeaths,
          entryRatePerRound: metrics.entryRatePerRound,
        }
      : null;

  if (entryData !== null) {
    hooks.push(buildStyleHook(entryData, metrics.classification));
  } else {
    hooks.push(
      `Sem timeline de abates na fonte: a agressividade de entrada não pôde ser medida (${metrics.totals.matches} partidas sem dados de first blood/first death).`,
    );
  }

  const raw_metrics: EntryRawMetrics = {
    matches: metrics.totals.matches,
    rounds: metrics.totals.rounds,
    ...(metrics.attempts !== null ? { attempts: metrics.attempts } : {}),
    ...(metrics.firstBloods !== null ? { firstBloods: metrics.firstBloods } : {}),
    ...(metrics.firstDeaths !== null ? { firstDeaths: metrics.firstDeaths } : {}),
    ...(metrics.entryRatio !== null ? { entryRatio: metrics.entryRatio } : {}),
    ...(metrics.entryRatePerRound !== null
      ? { entryRatePerRound: metrics.entryRatePerRound }
      : {}),
    ...(metrics.killDeathEntryRatio !== null
      ? { killDeathEntryRatio: metrics.killDeathEntryRatio }
      : {}),
  };

  const contextual_rating: Partial<Record<keyof EntryRawMetrics, ContextualRating>> = {
    ...(metrics.entryRatio !== null
      ? { entryRatio: rateMetric(metrics.entryRatio, ENTRY_BENCHMARKS.entryRatio, 'Crítico') }
      : {}),
    ...(metrics.entryRatePerRound !== null
      ? {
          entryRatePerRound: rateMetric(
            metrics.entryRatePerRound,
            ENTRY_BENCHMARKS.entryRatePerRound,
            'Crítico',
          ),
        }
      : {}),
    ...(metrics.killDeathEntryRatio !== null
      ? {
          killDeathEntryRatio: rateMetric(
            metrics.killDeathEntryRatio,
            ENTRY_BENCHMARKS.killDeathEntryRatio,
            'Crítico',
          ),
        }
      : {}),
  };

  return { raw_metrics, contextual_rating, coaching_hooks: hooks };
}
