import type { MatchResult } from '@/components/ui/match-row';

/**
 * Geometria pura do RrTrendChart: mapeia a série de RR para o viewBox.
 * Sem efeitos/estado — o componente só renderiza o resultado.
 */

export interface RrPointInput {
  readonly rr: number;
  readonly result: MatchResult;
}

export interface RrPoint {
  readonly x: number;
  readonly y: number;
  readonly rr: number;
  readonly result: MatchResult;
}

/** Threshold visual (linha tracejada) — 0 RR por padrão. */
export function buildRrPoints(
  series: readonly RrPointInput[],
  width: number,
  height: number,
  padding = 8,
): RrPoint[] {
  if (series.length === 0) {
    return [];
  }

  const values = series.map((point) => point.rr);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const span = max - min === 0 ? 1 : max - min;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  return series.map((point, index) => {
    const x =
      series.length === 1 ? width / 2 : padding + (index / (series.length - 1)) * innerWidth;
    const y = padding + (1 - (point.rr - min) / span) * innerHeight;
    return { x, y, rr: point.rr, result: point.result };
  });
}

/** Path da linha de tendência (polyline). */
export function buildRrLinePath(points: readonly RrPoint[]): string {
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');
}

/** Path da área preenchida (linha fechada até a base do threshold). */
export function buildRrAreaPath(points: readonly RrPoint[], width: number, baselineY: number): string {
  if (points.length === 0) {
    return '';
  }
  const line = buildRrLinePath(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `${line} L${last?.x.toFixed(2) ?? width} ${baselineY.toFixed(2)} L${first?.x.toFixed(2) ?? 0} ${baselineY.toFixed(2)} Z`;
}

/** Posição Y do threshold (0 RR) dentro do viewBox. */
export function rrBaselineY(points: readonly RrPoint[], height: number, padding = 8): number {
  const values = points.map((point) => point.rr);
  if (values.length === 0) {
    return height / 2;
  }
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const span = max - min === 0 ? 1 : max - min;
  return padding + (1 - (0 - min) / span) * (height - padding * 2);
}
