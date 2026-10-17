import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

/**
 * TelemetryStrip — faixa de telemetria mono do chrome de auth.
 * `banner`: marquee da tela 7 (hairline + `shadow-hard-2`).
 * `bar`: barra superior da tela 8 (mesma linguagem, sem sombra).
 */
export interface TelemetryStripProps {
  readonly items: readonly string[];
  readonly variant?: 'banner' | 'bar';
  readonly trailing?: ReactNode;
  readonly className?: string;
}

const VARIANT_CLASSES: Record<'banner' | 'bar', string> = {
  banner: 'border border-line bg-surface-raised px-2 py-1 shadow-hard-2',
  bar: 'border border-line bg-surface px-2 py-1',
};

export function TelemetryStrip({
  items,
  variant = 'banner',
  trailing,
  className,
}: TelemetryStripProps) {
  return (
    <div
      data-telemetry-strip={variant}
      className={cx(
        'flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-hud text-label-xs uppercase text-text-secondary',
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {items.map((item, index) => (
        <span key={item} className="flex items-center gap-1.5">
          {index > 0 ? <span aria-hidden="true">|</span> : null}
          <span>{item}</span>
        </span>
      ))}
      {trailing !== undefined ? <span className="ml-auto">{trailing}</span> : null}
    </div>
  );
}
