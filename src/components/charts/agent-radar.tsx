import { Line } from '@visx/shape';
import type { AgentStat } from '@/contracts/tracker';
import {
  buildAgentRadar,
  RADAR_GUIDE_RATIOS,
  radarPolygonPoints,
} from '@/services/analytics/chart-transforms';

/**
 * AgentRadar — perfil do agente vs. média do jogador (polígono radial).
 * Normalização 0–1 e pontos polares vindos das transformações puras.
 * Eixos: Winrate · KDA · ACS · HS% (caps documentados no transform).
 */

export interface AgentRadarProps {
  readonly agents: readonly AgentStat[];
  /** Agente exibido; padrão: o mais jogado (primeiro da agregação). */
  readonly agentKey?: string;
  readonly size?: number;
  readonly className?: string;
}

const toPointsAttribute = (points: readonly { x: number; y: number }[]): string =>
  points.map((point) => `${point.x},${point.y}`).join(' ');

export function AgentRadar({ agents, agentKey, size = 260, className }: AgentRadarProps) {
  const selectedKey = agentKey ?? agents[0]?.key ?? '';
  const axes = buildAgentRadar(agents, selectedKey);

  if (axes === null || axes.length === 0) {
    return (
      <p data-chart="agent-radar-empty" className="text-body text-text-secondary">
        Sem dados de agente para o radar.
      </p>
    );
  }

  const centerX = size / 2;
  const centerY = size / 2 + 4;
  const radius = size / 2 - 34;

  const agentPolygon = radarPolygonPoints(
    axes.map((axis) => axis.value),
    centerX,
    centerY,
    radius,
  );
  const baselinePolygon = radarPolygonPoints(
    axes.map((axis) => axis.baseline),
    centerX,
    centerY,
    radius,
  );
  const ringPolygons = RADAR_GUIDE_RATIOS.map((ratio) =>
    radarPolygonPoints(
      axes.map(() => ratio),
      centerX,
      centerY,
      radius,
    ),
  );
  const vertices = radarPolygonPoints(
    axes.map(() => 1),
    centerX,
    centerY,
    radius,
  );

  return (
    <figure data-chart="agent-radar" className={className}>
      <svg
        role="img"
        aria-label={`Radar do agente ${selectedKey} vs. média do jogador`}
        width={size}
        height={size}
      >
        {ringPolygons.map((ring, index) => (
          <polygon
            key={RADAR_GUIDE_RATIOS[index]}
            points={toPointsAttribute(ring)}
            fill="none"
            stroke="var(--color-line)"
            strokeWidth={1}
          />
        ))}

        {vertices.map((vertex, index) => (
          <Line
            key={axes[index]!.axis}
            from={{ x: centerX, y: centerY }}
            to={vertex}
            stroke="var(--color-line)"
            strokeWidth={1}
          />
        ))}

        <polygon
          points={toPointsAttribute(baselinePolygon)}
          fill="none"
          stroke="var(--color-text-secondary)"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />

        <polygon
          points={toPointsAttribute(agentPolygon)}
          fill="var(--color-accent)"
          fillOpacity={0.15}
          stroke="var(--color-accent)"
          strokeWidth={2}
        />

        {agentPolygon.map((point, index) => (
          <circle key={axes[index]!.axis} cx={point.x} cy={point.y} r={3} fill="var(--color-accent)" />
        ))}

        {axes.map((axis, index) => {
          // rótulo além do vértice (mesmo ângulo do eixo)
          const angle = -Math.PI / 2 + (2 * Math.PI * index) / axes.length;
          const labelRadius = radius + 18;
          return (
            <text
              key={axis.axis}
              x={centerX + Math.cos(angle) * labelRadius}
              y={centerY + Math.sin(angle) * labelRadius + 3}
              textAnchor="middle"
              fill="var(--color-text-secondary)"
              fontSize={10}
              className="font-hud"
            >
              {axis.axis}
            </text>
          );
        })}
      </svg>
      <figcaption className="mt-1 text-label uppercase text-text-secondary">
        {selectedKey} (accent) vs. média do jogador (pontilhado)
      </figcaption>
    </figure>
  );
}
