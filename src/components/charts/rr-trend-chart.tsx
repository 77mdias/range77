import { cx } from '@/lib/cx';
import {
  buildRrAreaPath,
  buildRrLinePath,
  buildRrPoints,
  rrBaselineY,
  type RrPointInput,
} from './rr-trend-geometry';

/**
 * RrTrendChart — trajetória de RR (overview): área com gradiente no acento,
 * linha de tendência em tinta, threshold tracejado no 0 RR e pontos por
 * resultado (vitória = acento, derrota = tinta, neutro = tinta secundária).
 * A geometria vive em `rr-trend-geometry.ts` (pura); este componente só
 * renderiza.
 */

export interface RrTrendChartProps {
  /** Série cronológica (mais antiga → mais recente). */
  readonly series: readonly RrPointInput[];
  readonly width?: number;
  readonly height?: number;
  readonly ariaLabel?: string;
  readonly className?: string;
}

const PADDING = 8;
const GRADIENT_ID = 'rr-trend-fill';

export function RrTrendChart({
  series,
  width = 800,
  height = 176,
  ariaLabel = 'Trajetória de RR por partida',
  className,
}: RrTrendChartProps) {
  const points = buildRrPoints(series, width, height, PADDING);

  if (points.length === 0) {
    return (
      <p data-chart="rr-trend-empty" className="text-body text-text-secondary">
        Sem partidas suficientes para a trajetória de RR.
      </p>
    );
  }

  const baselineY = rrBaselineY(points, height, PADDING);
  const linePath = buildRrLinePath(points);
  const areaPath = buildRrAreaPath(points, width, baselineY);
  const last = points[points.length - 1];
  const peak = points.reduce<RrPointInput | undefined>(
    (best, point) => (best === undefined || point.rr > best.rr ? point : best),
    undefined,
  );

  return (
    <div
      data-chart="rr-trend"
      className={cx('rounded-md border border-line bg-surface p-2', className)}
    >
      <svg
        role="img"
        aria-label={ariaLabel}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-44 w-full overflow-visible"
      >
        <defs>
          <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.45} />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* threshold 0 RR */}
        <line
          x1={0}
          y1={baselineY}
          x2={width}
          y2={baselineY}
          stroke="var(--color-text-primary)"
          strokeWidth={0.75}
          strokeDasharray="3 3"
          opacity={0.5}
        />

        {areaPath !== '' ? <path d={areaPath} fill={`url(#${GRADIENT_ID})`} /> : null}
        <path
          d={linePath}
          fill="none"
          stroke="var(--color-text-primary)"
          strokeWidth={2.5}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {points.map((point, index) => {
          const isLast = point === last;
          const isPeak = point === peak;
          const fill =
            point.result === 'win'
              ? 'var(--color-accent)'
              : point.result === 'loss'
                ? 'var(--color-text-primary)'
                : 'var(--color-text-secondary)';
          const radius = isLast || isPeak ? 5 : point.result === 'neutral' ? 3 : 3.5;
          return (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r={radius}
              fill={fill}
              stroke="var(--color-canvas)"
              strokeWidth={isLast || isPeak ? 2 : 1.5}
            />
          );
        })}
      </svg>
    </div>
  );
}
