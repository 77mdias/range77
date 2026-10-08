/**
 * PASSO 1 — CONTRATOS DE TIPAGEM (camada de saída para o chatbot MiniMax)
 * ======================================================================
 *
 * Regra de arquitetura: a IA de atendimento tem raciocínio reduzido, portanto
 * a API NUNCA entrega dados brutos da HenrikDev. Todo endpoint de agregação
 * retorna um `CoachInsight` com três camadas pré-mastigadas:
 *
 *   1. `raw_metrics`       → números exatos calculados pelo backend;
 *   2. `contextual_rating` → classificação semântica por métrica, baseada em
 *                            faixas/benchmarks do Valorant;
 *   3. `coaching_hooks`    → strings diretas pré-calculadas para guiar a IA
 *                            de baixo custo (o que sugerir, como responder).
 *
 * Os contratos de INPUT da HenrikDev (src/contracts/henrikdev.ts) serão
 * definidos junto à primeira rota que a consumir.
 */

/** Faixas semânticas fixas usadas pela classificação de métricas. */
export const CONTEXTUAL_RATINGS = [
  'Crítico',
  'Abaixo da Média',
  'Na Média',
  'Acima da Média',
  'Excelente',
] as const;

export type ContextualRating = (typeof CONTEXTUAL_RATINGS)[number];

/** Métricas numéricas puras (ex: hsPercentage: 28.5, kdr: 1.12). */
export type RawMetrics = Record<string, number>;

/**
 * Envelope padrão de resposta de coaching.
 *
 * @typeParam TMetrics - chaves de métricas concretas da rota (ex: CombatMetrics
 * convertido para números), garantindo que `contextual_rating` só aceite
 * ratings para métricas que existem de fato no payload.
 */
export interface CoachInsight<TMetrics extends RawMetrics = RawMetrics> {
  /** Camada 1: números exatos calculados. */
  readonly raw_metrics: TMetrics;
  /** Camada 2: classificação semântica por métrica. */
  readonly contextual_rating: Partial<Record<keyof TMetrics, ContextualRating>>;
  /** Camada 3: guias prontos para a IA de baixo custo. */
  readonly coaching_hooks: readonly string[];
}

/** Envelope padrão de erro da API (também "mastigado" para a IA). */
export interface ApiErrorBody {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly hint?: string;
  };
}
