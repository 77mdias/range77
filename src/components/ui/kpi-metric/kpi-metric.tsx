import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

/**
 * KpiMetric — número de destaque do header (console): valor grande com
 * sufixo opcional e coluna lateral (aside) separada por divisor.
 */

export interface KpiMetricProps {
  readonly label: string;
  readonly value: ReactNode;
  /** Texto pequeno após o valor (ex.: "economizado"). */
  readonly suffix?: string;
  /** Coluna à direita do divisor (label/valor secundários). */
  readonly aside?: ReactNode;
  readonly className?: string;
}

export function KpiMetric({ label, value, suffix, aside, className }: KpiMetricProps) {
  return (
    <div
      data-component="kpi-metric"
      className={cx(
        'flex items-center gap-3 rounded-md bg-surface-raised px-3 py-2',
        className,
      )}
    >
      <div className="flex flex-col">
        <span className="font-hud text-label uppercase text-text-secondary">{label}</span>
        <span className="flex items-baseline gap-1">
          <span className="font-hud text-display-lg font-semibold leading-none text-text-primary">
            {value}
          </span>
          {suffix !== undefined ? (
            <span className="text-label font-normal text-win">{suffix}</span>
          ) : null}
        </span>
      </div>
      {aside !== undefined ? (
        <>
          <span aria-hidden="true" className="h-8 w-px bg-line" />
          <div data-kpi-aside className="min-w-0 font-hud text-label uppercase text-text-secondary">
            {aside}
          </div>
        </>
      ) : null}
    </div>
  );
}
