import type { HenrikDevMmrHistoryEntryV2 } from '@/contracts/henrikdev';
import type { RrHistoryPoint, RrOutcome } from '@/contracts/tracker';
import { roundTo } from './combat';

/**
 * PASSO 3 — IMPLEMENTAÇÃO: trajetória de RR (analytics PURA, 100% coberta).
 * ======================================================================
 *
 * Converte o histórico de MMR da HenrikDev (v2 mmr-history) em pontos de RR
 * ordenados no tempo. Rigor: entradas sem `rr`/`match_id` são descartadas
 * (nunca inventadas) e ΔRR = 0 vira `neutral` — não rotulamos empate/teto
 * como vitória.
 */

/** Resultado de um ponto derivado do sinal de ΔRR. */
export function classifyRrDelta(delta: number): RrOutcome {
  if (delta > 0) {
    return 'win';
  }
  if (delta < 0) {
    return 'loss';
  }
  return 'neutral';
}

/**
 * Normaliza as entradas da HenrikDev em pontos de RR ORDENADOS no tempo
 * (mais antigo → mais recente). Entradas incompletas são omitidas.
 */
export function buildRrHistory(
  history: readonly HenrikDevMmrHistoryEntryV2[] | undefined,
): RrHistoryPoint[] {
  const points: RrHistoryPoint[] = [];

  for (const entry of history ?? []) {
    const rr = entry.rr;
    const matchId = entry.match_id;
    if (typeof rr !== 'number' || typeof matchId !== 'string' || matchId === '') {
      continue;
    }
    const delta = entry.last_change ?? 0;
    points.push({
      matchId,
      rr,
      delta,
      tier: entry.tier?.name ?? '—',
      tierId: entry.tier?.id ?? 0,
      result: classifyRrDelta(delta),
      date: entry.date ?? '',
    });
  }

  points.sort((a, b) => {
    if (a.date === b.date) {
      return a.matchId.localeCompare(b.matchId);
    }
    return a.date < b.date ? -1 : 1;
  });

  return points;
}

/** Soma líquida de RR da janela (positiva = subiu de elo). */
export function computeRrNet(points: readonly RrHistoryPoint[]): number {
  return roundTo(
    points.reduce((sum, point) => sum + point.delta, 0),
    2,
  );
}
