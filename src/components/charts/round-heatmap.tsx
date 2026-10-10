import { HeatmapRect } from '@visx/heatmap';
import type { KillEvent, MatchRound } from '@/contracts/tracker';
import { buildRoundHeatmapCells } from '@/services/analytics/chart-transforms';

/**
 * RoundHeatmap — round-a-round do detalhe da partida.
 * Cor = resultado (do ponto de vista do time `teamId`), intensidade =
 * abates no round (timeline). Marcadores: plant (ponto osso) e defuse
 * (ponto accent). Layout das células via @visx/heatmap.
 */

export interface RoundHeatmapProps {
  readonly rounds: readonly MatchRound[];
  readonly kills: readonly KillEvent[];
  readonly teamId: string;
  readonly cellSize?: number;
  readonly gap?: number;
  readonly className?: string;
}

const MIN_OPACITY = 0.35;

export function RoundHeatmap({
  rounds,
  kills,
  teamId,
  cellSize = 18,
  gap = 3,
  className,
}: RoundHeatmapProps) {
  const cells = buildRoundHeatmapCells(rounds, kills, teamId);

  if (cells.length === 0) {
    return (
      <p data-chart="round-heatmap-empty" className="text-body text-text-secondary">
        Sem timeline de rounds nesta partida.
      </p>
    );
  }

  const maxKills = Math.max(...cells.map((cell) => cell.kills), 1);
  const width = cells.length * (cellSize + gap) + gap;
  const height = cellSize + gap * 2;

  return (
    <div data-chart="round-heatmap" className={className}>
      <svg
        role="img"
        aria-label={`Heatmap de ${cells.length} rounds (verde = vitória do time ${teamId}, intensidade = abates)`}
        width={width}
        height={height + 12}
      >
        <HeatmapRect
          data={[{ id: 'rounds', bins: cells }]}
          bins={(column) => column.bins}
          count={(bin) => bin.kills}
          xScale={(columnIndex) => gap + columnIndex * (cellSize + gap)}
          yScale={() => gap}
          binWidth={cellSize}
          binHeight={cellSize}
          gap={gap}
        >
          {(heatmap) =>
            heatmap[0]?.map((cell) => {
              const bin = cell.bin;
              const opacity = MIN_OPACITY + (1 - MIN_OPACITY) * (bin.kills / maxKills);
              const cellCenterX = cell.x + cell.width / 2;
              // React 19: <title> exige FILHO ÚNICO em template string
              // (múltiplos filhos JSX viram array e renderizam vazio).
              const label = `Round ${bin.roundNumber}: ${bin.result === 'win' ? 'vitória' : 'derrota'} · ${bin.kills} abate(s)${bin.plantSite !== null ? ` · plant ${bin.plantSite}` : ''}${bin.defused ? ' · defuse' : ''}`;

              return (
                <g key={bin.roundNumber}>
                  <rect
                    x={cell.x}
                    y={cell.y}
                    width={cell.width}
                    height={cell.height}
                    fill={bin.result === 'win' ? 'var(--color-win)' : 'var(--color-loss)'}
                    fillOpacity={opacity}
                    stroke="var(--color-line)"
                    strokeWidth={1}
                  >
                    <title>{label}</title>
                  </rect>

                  {bin.plantSite !== null ? (
                    <circle
                      cx={cellCenterX}
                      cy={cell.y + 5}
                      r={2}
                      fill="var(--color-text-primary)"
                    />
                  ) : null}

                  {bin.defused ? (
                    <circle
                      cx={cellCenterX}
                      cy={cell.y + cell.height - 5}
                      r={2}
                      fill="var(--color-canvas)"
                    />
                  ) : null}

                  {bin.roundNumber % 5 === 0 ? (
                    <text
                      x={cellCenterX}
                      y={height + 9}
                      textAnchor="middle"
                      fill="var(--color-text-secondary)"
                      fontSize={8}
                      className="font-hud"
                    >
                      {bin.roundNumber}
                    </text>
                  ) : null}
                </g>
              );
            })
          }
        </HeatmapRect>
      </svg>
      <p className="mt-1 text-label uppercase text-text-secondary">
        Verde = round do time {teamId} · intensidade = abates · ponto preto = plant · ponto branco =
        defuse
      </p>
    </div>
  );
}
