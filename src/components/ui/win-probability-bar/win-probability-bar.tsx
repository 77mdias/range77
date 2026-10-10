import { cx } from '@/lib/cx';

/**
 * WinProbabilityBar — comparação pré/pós evento sobre a mesma barra:
 * camada "antes" (tinta) sob a camada "depois" (acento), com labels.
 */

export interface WinProbabilityBarProps {
  /** Probabilidade antes do evento (0–100). */
  readonly beforePercent: number;
  /** Probabilidade depois do evento (0–100). */
  readonly afterPercent: number;
  readonly beforeLabel?: string;
  readonly afterLabel?: string;
  readonly className?: string;
}

export function WinProbabilityBar({
  beforePercent,
  afterPercent,
  beforeLabel = 'Pré-evento',
  afterLabel = 'Pós-evento',
  className,
}: WinProbabilityBarProps) {
  const dropped = afterPercent < beforePercent;

  return (
    <div
      data-component="win-probability-bar"
      className={cx('rounded-md bg-surface-hover p-2.5', className)}
    >
      <div className="mb-1.5 flex items-center justify-between font-hud text-label uppercase">
        <span className="text-text-secondary">
          {beforeLabel}: <strong className="text-text-primary">{beforePercent}%</strong>
        </span>
        <span data-probability-after className={cx('font-bold', dropped ? 'text-loss' : 'text-win')}>
          {afterLabel}: {afterPercent}%
        </span>
      </div>
      <div className="relative h-2 w-full bg-line">
        <span
          aria-hidden="true"
          data-testid="probability-before"
          className="absolute inset-y-0 left-0 bg-text-primary"
          style={{ width: `${beforePercent}%` }}
        />
        <span
          aria-hidden="true"
          data-testid="probability-after"
          className="absolute inset-y-0 left-0 bg-accent"
          style={{ width: `${afterPercent}%` }}
        />
      </div>
    </div>
  );
}
