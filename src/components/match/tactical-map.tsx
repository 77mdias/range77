'use client';

import { useState } from 'react';
import { cx } from '@/lib/cx';

/**
 * TacticalMap — posicionamento/kills sobre o mapa (detalhe de partida):
 * SVG overlay com zonas tracejadas, rota, nós de kill/death/inimigo e
 * alternador de heatmap geral.
 */

export interface TacticalZone {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly label: string;
}

export interface TacticalPoint {
  readonly x: number;
  readonly y: number;
  readonly label?: string;
}

export interface TacticalMapProps {
  readonly title: string;
  /** Meta do round (ex.: "CAMADA: ROUND 4"). */
  readonly meta?: string;
  readonly mapImageSrc?: string;
  readonly zones?: readonly TacticalZone[];
  /** Rota de movimento (pontos em sequência). */
  readonly path?: readonly TacticalPoint[];
  readonly kills?: readonly TacticalPoint[];
  readonly deaths?: readonly TacticalPoint[];
  readonly enemies?: readonly TacticalPoint[];
  readonly viewBoxSize?: number;
  readonly className?: string;
}

export function TacticalMap({
  title,
  meta,
  mapImageSrc,
  zones,
  path,
  kills,
  deaths,
  enemies,
  viewBoxSize = 300,
  className,
}: TacticalMapProps) {
  const [heatmapOn, setHeatmapOn] = useState(false);

  const pathLine =
    path !== undefined && path.length > 1
      ? path.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(' ')
      : undefined;

  return (
    <section
      data-component="tactical-map"
      className={cx('flex flex-col justify-between gap-2 rounded-md border border-line bg-surface-raised p-3', className)}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-hud text-label font-bold uppercase text-text-primary">
          <span aria-hidden="true" className="size-2.5 bg-accent" />
          {title}
        </h3>
        {meta !== undefined ? (
          <span className="font-hud text-label uppercase text-text-secondary">{meta}</span>
        ) : null}
      </header>

      <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-md border border-line bg-surface">
        {mapImageSrc !== undefined ? (
          // eslint-disable-next-line @next/next/no-img-element -- radar remoto do mapa
          <img
            src={mapImageSrc}
            alt=""
            className={
              heatmapOn
                ? 'absolute inset-0 size-full object-cover'
                : 'absolute inset-0 size-full object-cover opacity-20 grayscale'
            }
          />
        ) : null}

        <svg
          viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
          className="absolute inset-0 size-full"
          role="img"
          aria-label={title}
        >
          {(zones ?? []).map((zone) => (
            <g key={zone.label}>
              <rect
                x={zone.x}
                y={zone.y}
                width={zone.width}
                height={zone.height}
                fill="none"
                stroke="var(--color-text-secondary)"
                strokeOpacity={0.4}
                strokeDasharray="3 3"
              />
              <text
                x={zone.x + 4}
                y={zone.y + 12}
                fill="var(--color-text-secondary)"
                fontSize={9}
                className="font-hud"
              >
                {zone.label}
              </text>
            </g>
          ))}

          {pathLine !== undefined ? (
            <>
              <path
                d={pathLine}
                fill="none"
                stroke="var(--color-text-primary)"
                strokeWidth={2}
                strokeDasharray="4 2"
              />
              {path !== undefined && path.length > 0 ? (
                <circle
                  cx={path[0]?.x}
                  cy={path[0]?.y}
                  r={4}
                  fill="var(--color-text-primary)"
                />
              ) : null}
            </>
          ) : null}

          {(enemies ?? []).map((point, index) => (
            <circle
              key={`enemy-${index}`}
              cx={point.x}
              cy={point.y}
              r={5}
              fill="var(--color-text-secondary)"
            />
          ))}

          {(kills ?? []).map((point, index) => (
            <g key={`kill-${index}`}>
              <circle
                cx={point.x}
                cy={point.y}
                r={6}
                fill="var(--color-accent)"
                stroke="var(--color-text-primary)"
                strokeWidth={1.5}
              />
              {point.label !== undefined ? (
                <text
                  x={point.x + 9}
                  y={point.y + 3}
                  fill="var(--color-text-primary)"
                  fontSize={9}
                  fontWeight="bold"
                  className="font-hud"
                >
                  {point.label}
                </text>
              ) : null}
            </g>
          ))}

          {(deaths ?? []).map((point, index) => (
            <g key={`death-${index}`}>
              <circle cx={point.x} cy={point.y} r={7} fill="var(--color-loss)" />
              <path
                d={`M${point.x - 3} ${point.y - 3} L${point.x + 3} ${point.y + 3} M${point.x + 3} ${point.y - 3} L${point.x - 3} ${point.y + 3}`}
                stroke="#ffffff"
                strokeWidth={1.5}
              />
              {point.label !== undefined ? (
                <text
                  x={point.x + 10}
                  y={point.y + 3}
                  fill="var(--color-loss)"
                  fontSize={9}
                  fontWeight="bold"
                  className="font-hud"
                >
                  {point.label}
                </text>
              ) : null}
            </g>
          ))}
        </svg>
      </div>

      <footer className="flex items-center justify-between border-t border-line pt-2 font-hud text-label uppercase text-text-secondary">
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2 rounded-full bg-accent" /> Kill
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2 rounded-full bg-loss" /> Morte
          </span>
        </span>
        <button
          type="button"
          onClick={() => setHeatmapOn((current) => !current)}
          aria-pressed={heatmapOn}
          className={cx(
            'cursor-pointer rounded-sm px-2 py-1 transition-colors duration-[var(--duration-fast)]',
            heatmapOn
              ? 'bg-text-primary font-semibold text-surface'
              : 'bg-surface-hover text-text-primary hover:bg-line',
          )}
        >
          Alternar heatmap
        </button>
      </footer>
    </section>
  );
}
