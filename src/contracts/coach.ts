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
 * @typeParam TMetrics - forma concreta das métricas da rota. O constraint é
 * `object` (em vez de `Record<string, number>`) para permitir métricas
 * OPCIONAIS: rotas omitem chaves não computáveis (ex: `kast` quando a fonte
 * não fornece) em vez de emitir `null`/`0` enganosos ao chatbot.
 */
export interface CoachInsight<TMetrics extends object = RawMetrics> {
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
