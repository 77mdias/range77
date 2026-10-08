/**
 * Geometria pura do Sparkline (SVG à mão — visx só na fase 4).
 * Mapeia valores para coordenadas num viewBox width×height e decide a
 * tendência (cor) comparando o primeiro com o último ponto.
 */

export type SparklineTrend = 'up' | 'down' | 'flat';

/** Tendência = último vs. primeiro ponto (flat quando < 2 pontos/iguais). */
export function sparklineTrend(points: readonly number[]): SparklineTrend {
  if (points.length < 2) {
    return 'flat';
  }
  const first = points[0] ?? 0;
  const last = points[points.length - 1] ?? 0;
  if (last > first) {
    return 'up';
  }
  if (last < first) {
    return 'down';
  }
  return 'flat';
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Constrói o atributo `d` do `<path>` normalizando os pontos no viewBox.
 * Retorna `''` quando não há linha a desenhar (< 2 pontos ou dimensão 0).
 * Quando todos os valores são iguais, desenha uma linha central.
 */
export function buildSparklinePath(
  points: readonly number[],
  width: number,
  height: number,
): string {
  if (points.length < 2 || width <= 0 || height <= 0) {
    return '';
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min;
  const stepX = width / (points.length - 1);

  return points
    .map((value, index) => {
      const x = index * stepX;
      const y = span === 0 ? height / 2 : height - ((value - min) / span) * height;
      return `${index === 0 ? 'M' : 'L'} ${round(x)} ${round(y)}`;
    })
    .join(' ');
}
