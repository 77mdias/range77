import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

/**
 * KpiTile — célula do strip de KPIs (overview): label com acento à direita,
 * valor grande em `font-hud` e slot trailing (badge/chip/texto).
 */

export interface KpiTileProps {
  readonly label: string;
  /** Destaque na linha do label (ex.: "+0.14", "VANDAL FAV"). */
  readonly accent?: string;
  /** Cor do destaque (positivo padrão; negativo/neutro para deltas ruins). */
  readonly accentTone?: 'positive' | 'negative' | 'neutral';
  readonly value: ReactNode;
  /** Conteúdo à direita do valor (Badge, chip ou texto). */
  readonly trailing?: ReactNode;
  readonly className?: string;
}

const ACCENT_TONE_CLASSES = {
  positive: 'text-win',
  negative: 'text-loss',
  neutral: 'text-text-secondary',
} as const;

export function KpiTile({
  label,
  accent,
  accentTone = 'positive',
  value,
  trailing,
  className,
}: KpiTileProps) {
  return (
    <div
      data-component="kpi-tile"
      className={cx(
        'flex flex-col justify-between rounded-md border border-line bg-surface-raised p-3',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 font-hud text-label uppercase text-text-secondary">
        <span className="truncate">{label}</span>
        {accent !== undefined ? (
          <span
            data-kpi-accent
            className={cx('shrink-0 font-semibold', ACCENT_TONE_CLASSES[accentTone])}
          >
            {accent}
          </span>
        ) : null}
      </div>
      <div className="mt-1.5 flex items-baseline justify-between gap-2">
        <span className="font-hud text-heading-lg font-bold leading-tight text-text-primary">
          {value}
        </span>
        {trailing !== undefined ? (
          <span data-kpi-trailing className="shrink-0 font-hud text-label text-text-secondary">
            {trailing}
          </span>
        ) : null}
      </div>
    </div>
  );
}
