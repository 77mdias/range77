import { cx } from '@/lib/cx';

/**
 * ProgressBar — barra de medição (track + fill) com marcador opcional de
 * benchmark (ex.: média do elo). Apenas renderiza: os percentuais vêm
 * prontos de `services/analytics`.
 */

export type ProgressBarTone = 'accent' | 'ink' | 'loss' | 'mute';

export interface ProgressBarProps {
  /** Valor de 0 a 100 (já calculado). Valores fora da faixa são limitados. */
  readonly value: number;
  readonly tone?: ProgressBarTone;
  /** Marcador vertical de referência (0–100), ex.: média do elo. */
  readonly markerPercent?: number;
  readonly ariaLabel?: string;
  readonly className?: string;
}

const FILL_CLASSES: Record<ProgressBarTone, string> = {
  accent: 'bg-accent',
  ink: 'bg-text-primary',
  loss: 'bg-loss',
  mute: 'bg-text-secondary',
};

function clamp01(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export function ProgressBar({
  value,
  tone = 'accent',
  markerPercent,
  ariaLabel,
  className,
}: ProgressBarProps) {
  const width = clamp01(value);
  const marker =
    markerPercent !== undefined ? clamp01(markerPercent) : undefined;

  return (
    <div
      role="meter"
      aria-valuenow={Math.round(width)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      data-tone={tone}
      className={cx('relative h-1.5 w-full overflow-hidden rounded-full bg-surface-hover', className)}
    >
      <div
        data-testid="progress-fill"
        className={cx('h-full rounded-full', FILL_CLASSES[tone])}
        style={{ width: `${width}%` }}
      />
      {marker !== undefined ? (
        <span
          aria-hidden="true"
          data-testid="progress-marker"
          className="absolute inset-y-0 z-10 w-0.5 bg-text-primary"
          style={{ left: `${marker}%` }}
        />
      ) : null}
    </div>
  );
}
