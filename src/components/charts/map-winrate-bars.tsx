import { scaleLinear } from '@visx/scale';
import { Bar } from '@visx/shape';
import type { GroupedStat } from '@/contracts/tracker';
import { buildWinrateBars } from '@/services/analytics/chart-transforms';

/**
 * MapWinrateBars — winrate por mapa em barras horizontais.
 * Ordenação/shape dos dados vindos de `buildWinrateBars` (transform pura).
 */

export interface MapWinrateBarsProps {
  readonly stats: readonly GroupedStat[];
  readonly width?: number;
  readonly className?: string;
}

const LABEL_WIDTH = 88;
const PERCENT_WIDTH = 44;
const ROW_HEIGHT = 28;
const GAP = 6;

export function MapWinrateBars({ stats, width = 520, className }: MapWinrateBarsProps) {
  const bars = buildWinrateBars(stats);

  if (bars.length === 0) {
    return (
      <p data-chart="map-bars-empty" className="text-body text-text-secondary">
        Sem mapas jogados recentemente.
      </p>
    );
  }

  const height = bars.length * (ROW_HEIGHT + GAP) + GAP;
  const barX = LABEL_WIDTH + 4;
  const innerWidth = width - barX - PERCENT_WIDTH;
  const xScale = scaleLinear<number>({ domain: [0, 100], range: [0, innerWidth] });

  return (
    <svg
      role="img"
      aria-label="Winrate por mapa"
      data-chart="map-winrate-bars"
      width={width}
      height={height}
      className={className}
    >
      {bars.map((bar, index) => {
        const y = GAP + index * (ROW_HEIGHT + GAP);
        const fill = bar.winrate >= 50 ? 'var(--color-win)' : 'var(--color-loss)';

        return (
          <g key={bar.key}>
            <text
              x={LABEL_WIDTH}
              y={y + ROW_HEIGHT / 2 + 4}
              textAnchor="end"
              fill="var(--color-text-primary)"
              fontSize={11}
              className="font-hud"
            >
              {bar.key}
            </text>

            {/* trilha da barra */}
            <rect
              x={barX}
              y={y}
              width={innerWidth}
              height={ROW_HEIGHT}
              fill="var(--color-surface-hover)"
            />

            <Bar x={barX} y={y} width={Math.max(xScale(bar.winrate), 2)} height={ROW_HEIGHT} fill={fill}>
              <title>{`${bar.key}: ${bar.winrate}% de vitórias em ${bar.matches} partida(s)`}</title>
            </Bar>

            <text
              x={barX + innerWidth + 6}
              y={y + ROW_HEIGHT / 2 + 4}
              fill="var(--color-text-secondary)"
              fontSize={11}
              className="font-hud"
            >
              {bar.winrate}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}
