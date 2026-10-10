import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cx } from '@/lib/cx';

/**
 * StatCard — número de destaque em `font-hud` (tabular-nums), com delta
 * opcional (▲ win / ▼ loss) e slot para sparkline. O label vira o header
 * do Card.
 */

export interface StatCardProps {
  readonly label: string;
  readonly value: ReactNode;
  /** Delta numérico; sinal define cor e seta. */
  readonly delta?: number;
  /** Sufixo do delta (ex.: '%' ou 'pp'). */
  readonly deltaSuffix?: string;
  /** Slot para gráfico (ex.: <Sparkline />). */
  readonly sparkline?: ReactNode;
  readonly className?: string;
}

export function StatCard({
  label,
  value,
  delta,
  deltaSuffix,
  sparkline,
  className,
}: StatCardProps) {
  const up = delta !== undefined && delta >= 0;

  return (
    <Card label={label} className={className}>
      <div className="flex items-end justify-between gap-3">
        <span className="font-hud text-display-md font-semibold leading-none text-text-primary">
          {value}
        </span>
        {delta !== undefined ? (
          <span
            data-trend={up ? 'up' : 'down'}
            className={cx(
              'font-hud text-body font-semibold',
              up ? 'text-win' : 'text-loss',
            )}
          >
            {up ? '▲' : '▼'} {Math.abs(delta)}
            {deltaSuffix}
          </span>
        ) : null}
      </div>
      {sparkline !== undefined ? <div className="mt-4">{sparkline}</div> : null}
    </Card>
  );
}
