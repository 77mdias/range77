import { cx } from '@/lib/cx';
import {
  buildSparklinePath,
  sparklineTrend,
  type SparklineTrend,
} from './geometry';

/**
 * Sparkline — SVG puro (sem visx). A cor segue a tendência:
 * alta → win, baixa → loss, estável → texto secundário.
 */

export interface SparklineProps {
  readonly points: readonly number[];
  readonly width?: number;
  readonly height?: number;
  readonly ariaLabel?: string;
  readonly className?: string;
}

const TREND_STROKE: Record<SparklineTrend, string> = {
  up: 'var(--color-win)',
  down: 'var(--color-loss)',
  flat: 'var(--color-text-secondary)',
};

export function Sparkline({
  points,
  width = 120,
  height = 32,
  ariaLabel = 'Tendência',
  className,
}: SparklineProps) {
  const trend = sparklineTrend(points);
  const path = buildSparklinePath(points, width, height);

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      data-sparkline
      data-trend={trend}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cx('block', className)}
    >
      {path !== '' ? (
        <path
          d={path}
          fill="none"
          stroke={TREND_STROKE[trend]}
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
    </svg>
  );
}
