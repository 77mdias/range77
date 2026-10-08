import type { CoachInsight, ContextualRating } from '@/contracts/coach';
import { COMBAT_BENCHMARKS, rateMetric, roundTo } from './combat';

/**
 * PASSO 3 — IMPLEMENTAÇÃO: análise de EVOLUÇÃO entre snapshots.
 *
 * Método (regra das metades): baseline = média da metade MAIS ANTIGA da
 * janela; current = média da metade MAIS RECENTE. Com 2 snapshots degenera
 * em comparação direta. Médias ignoram valores nulos por métrica — se uma
 * metade inteira não tiver dados da métrica, ela é OMITIDA do envelope
 * (nunca inventada).
 *
 * Tendência por threshold ABSOLUTO por métrica: determinístico, auditável e
 * imune a ruído relativo em números pequenos.
 *
 * Pré-condição: `snapshots` ordenados do MAIS ANTIGO para o mais recente e
 * com pelo menos 2 itens (garantido pela orquestração em services/coaching).
 */

export type TrendClass = 'Melhorando' | 'Estável' | 'Piorando';

export type EvolutionMetricKey = 'kdr' | 'kpr' | 'acs' | 'hsPercentage' | 'kast' | 'fbRatio';

/** Snapshot mínimo necessário para a análise de evolução (vindo do Neon). */
export interface EvolutionSnapshotInput {
  readonly kdr: number;
  readonly kpr: number;
  readonly acs: number;
  readonly hsPercentage: number | null;
  readonly kast: number | null;
  readonly firstBloods: number | null;
  readonly firstDeaths: number | null;
  readonly createdAt: Date;
}

export interface MetricEvolution {
  readonly baseline: number;
  readonly current: number;
  readonly delta: number;
  readonly trend: TrendClass;
}

export type EvolutionRawMetrics = {
  readonly kdr: number;
  readonly kpr: number;
  readonly acs: number;
  readonly hsPercentage?: number;
  readonly kast?: number;
  readonly fbRatio?: number;
  readonly snapshots: number;
};

export interface PlayerEvolutionInsight extends CoachInsight<EvolutionRawMetrics> {
  readonly player: { readonly region: string; readonly name: string; readonly tag: string };
  readonly window: { readonly from: string; readonly to: string };
  readonly evolution: Partial<Record<EvolutionMetricKey, MetricEvolution>>;
}

/** Variação mínima (absoluta) para classificar tendência por métrica. */
export const EVOLUTION_THRESHOLDS = {
  kdr: 0.08,
  kpr: 0.05,
  acs: 10,
  hsPercentage: 1.5,
  kast: 3,
  fbRatio: 0.15,
} as const satisfies Record<EvolutionMetricKey, number>;

interface MetricDescriptor {
  readonly key: EvolutionMetricKey;
  readonly label: string;
  readonly decimals: number;
  readonly unit: '' | 'pp';
  readonly read: (snapshot: EvolutionSnapshotInput) => number | null;
}

/** Ordem canônica de iteração (determinismo dos hooks). */
const METRICS: readonly MetricDescriptor[] = [
  { key: 'kdr', label: 'KDR', decimals: 2, unit: '', read: (s) => s.kdr },
  { key: 'kpr', label: 'abates por round', decimals: 2, unit: '', read: (s) => s.kpr },
  { key: 'acs', label: 'ACS', decimals: 0, unit: '', read: (s) => s.acs },
  { key: 'hsPercentage', label: 'HS%', decimals: 1, unit: 'pp', read: (s) => s.hsPercentage },
  { key: 'kast', label: 'KAST', decimals: 1, unit: 'pp', read: (s) => s.kast },
  {
    key: 'fbRatio',
    label: 'taxa de duelos de abertura (FB/FD)',
    decimals: 2,
    unit: '',
    read: (s) =>
      s.firstBloods !== null && s.firstDeaths !== null
        ? s.firstDeaths === 0
          ? s.firstBloods
          : s.firstBloods / s.firstDeaths
        : null,
  },
];

function meanOf(values: readonly number[], decimals: number): number | null {
  if (values.length === 0) {
    return null;
  }
  return roundTo(values.reduce((sum, value) => sum + value, 0) / values.length, decimals);
}

function classifyTrend(delta: number, threshold: number): TrendClass {
  if (delta >= threshold) {
    return 'Melhorando';
  }
  return delta <= -threshold ? 'Piorando' : 'Estável';
}

/**
 * Monta o envelope de 3 camadas da evolução (mais identidade, janela e
 * detalhe por métrica). `contextual_rating` mantém o rating ABSOLUTO dos
 * valores atuais (benchmarks de combate); a tendência relativa vive em
 * `evolution` — o chatbot recebe os dois eixos sem precisar calcular nada.
 */
export function buildEvolutionCoachInsight(
  snapshots: readonly EvolutionSnapshotInput[],
  player: { readonly region: string; readonly name: string; readonly tag: string },
): PlayerEvolutionInsight {
  const newerCount = Math.ceil(snapshots.length / 2);
  const baselineHalf = snapshots.slice(0, snapshots.length - newerCount);
  const currentHalf = snapshots.slice(snapshots.length - newerCount);

  const evolution: Partial<Record<EvolutionMetricKey, MetricEvolution>> = {};
  const currentValues: Record<string, number> = {};
  const ratings: Partial<Record<keyof EvolutionRawMetrics, ContextualRating>> = {};
  const hooks: string[] = [];
  let anyChange = false;

  for (const metric of METRICS) {
    const collect = (half: readonly EvolutionSnapshotInput[]): number[] =>
      half.map(metric.read).filter((value): value is number => value !== null);

    const baseline = meanOf(collect(baselineHalf), metric.decimals);
    const current = meanOf(collect(currentHalf), metric.decimals);
    if (baseline === null || current === null) {
      continue; // métrica sem dados em uma das metades → omitida
    }

    const delta = roundTo(current - baseline, metric.decimals);
    const trend = classifyTrend(delta, EVOLUTION_THRESHOLDS[metric.key]);

    evolution[metric.key] = { baseline, current, delta, trend };
    currentValues[metric.key] = current;

    if (metric.key !== 'fbRatio') {
      ratings[metric.key] = rateMetric(current, COMBAT_BENCHMARKS[metric.key], 'Crítico');
    }

    if (trend === 'Estável') {
      continue;
    }
    anyChange = true;

    const format = (value: number): string => value.toFixed(metric.decimals);
    const signed = `${delta > 0 ? '+' : ''}${delta.toFixed(metric.decimals)}${metric.unit}`;

    if (trend === 'Melhorando') {
      hooks.push(
        `Evolução em ${metric.label}: ${format(baseline)} → ${format(current)} (${signed}). Reconheça o progresso e pergunte o que mudou na rotina para consolidar o hábito.`,
      );
    } else {
      hooks.push(
        `Queda em ${metric.label}: ${format(baseline)} → ${format(current)} (${signed}). Sugira investigar mudanças recentes (rotina, agentes, horário de jogo) e retomar o que funcionava.`,
      );
    }
  }

  if (!anyChange) {
    hooks.push(
      `Métricas estáveis no período (${snapshots.length} análises). Sugira variar o treino — novos agentes, mapas ou rotinas de mira — para destravar a evolução.`,
    );
  }
  if (snapshots.length < 3) {
    hooks.push(
      `Histórico curto: ${snapshots.length} análises. Avise que a leitura de evolução tem baixa significância estatística e ganha confiança com mais análises.`,
    );
  }

  const first = snapshots[0] as EvolutionSnapshotInput;
  const last = snapshots[snapshots.length - 1] as EvolutionSnapshotInput;

  return {
    player,
    window: { from: first.createdAt.toISOString(), to: last.createdAt.toISOString() },
    evolution,
    // Chaves vindas de METRICS — subconjunto válido de EvolutionRawMetrics.
    raw_metrics: { ...currentValues, snapshots: snapshots.length } as EvolutionRawMetrics,
    contextual_rating: ratings,
    coaching_hooks: hooks,
  };
}
