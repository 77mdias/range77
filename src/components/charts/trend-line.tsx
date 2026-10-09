import { AxisBottom } from '@visx/axis';
import { scaleLinear } from '@visx/scale';
import { LinePath } from '@visx/shape';
import { buildTrendPoints, valueDomain } from '@/services/analytics/chart-transforms';

/**
 * TrendLine — métrica (ACS/HS%/KDR) ao longo das partidas.
 * As escalas/domínio vêm das transformações puras; este componente só
 * renderiza SVG (server-safe, sem estado).
 */

export interface TrendLineProps {
  /** Série cronológica (mais antiga → mais recente). */
  readonly values: readonly number[];
  readonly width?: number;
  readonly height?: number;
  readonly metricLabel?: string;
  readonly ariaLabel?: string;
  readonly className?: string;
}

const MARGIN = { top: 14, right: 12, bottom: 26, left: 40 };

export function TrendLine({
  values,
  width = 520,
  height = 190,
  metricLabel = 'ACS',
  ariaLabel = `Tendência de ${metricLabel} por partida`,
  className,
}: TrendLineProps) {
  const points = buildTrendPoints(values);

  if (points.length === 0) {
    return (
      <p data-chart="trend-line-empty" className="text-body text-text-secondary">
        Sem partidas suficientes para a tendência.
      </p>
    );
  }

  const innerWidth = width - MARGIN.left - MARGIN.right;
  const innerHeight = height - MARGIN.top - MARGIN.bottom;
  const [yMin, yMax] = valueDomain(values);

  const xScale = scaleLinear<number>({
    domain: [0, Math.max(points.length - 1, 1)],
    range: [0, innerWidth],
  });
  const yScale = scaleLinear<number>({ domain: [yMin, yMax], range: [innerHeight, 0] });

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      data-chart="trend-line"
      width={width}
      height={height}
      className={className}
    >
      <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
        {[0, 0.5, 1].map((ratio) => (
          <line
            key={ratio}
            x1={0}
            x2={innerWidth}
            y1={innerHeight * ratio}
            y2={innerHeight * ratio}
            stroke="var(--color-line)"
            strokeWidth={1}
          />
        ))}

        <LinePath
          data={points}
          x={(point) => xScale(point.index)}
          y={(point) => yScale(point.value)}
          stroke="var(--color-accent)"
          strokeWidth={2}
          shapeRendering="geometricPrecision"
        />

        {points.map((point) => (
          <circle
            key={point.index}
            cx={xScale(point.index)}
            cy={yScale(point.value)}
            r={2.5}
            fill="var(--color-accent)"
          />
        ))}

        <AxisBottom
          scale={xScale}
          top={innerHeight}
          numTicks={Math.min(4, Math.max(points.length - 1, 1))}
          stroke="var(--color-line)"
          tickStroke="var(--color-line)"
          tickLabelProps={() => ({
            fill: 'var(--color-text-secondary)',
            fontSize: 10,
            fontFamily: 'var(--font-hud)',
          })}
        />

        <text
          x={-MARGIN.left + 2}
          y={-4}
          fill="var(--color-text-secondary)"
          fontSize={10}
          className="font-hud"
        >
          {metricLabel}
        </text>
      </g>
    </svg>
  );
}
