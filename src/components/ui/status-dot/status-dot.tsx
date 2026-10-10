import { cx } from '@/lib/cx';

/**
 * StatusDot — marcador de estado: ponto "live" (pulsante, acento) para
 * telemetria online, ponto idle e o quadrado marcador usado em títulos
 * de card/seção (assinatura visual das telas Stitch).
 */

export type StatusDotVariant = 'live' | 'idle' | 'square' | 'square-accent';

export interface StatusDotProps {
  readonly variant?: StatusDotVariant;
  readonly className?: string;
}

const VARIANT_CLASSES: Record<StatusDotVariant, string> = {
  live: 'size-1.5 rounded-full bg-accent animate-pulse',
  idle: 'size-1.5 rounded-full border border-line bg-surface-hover',
  square: 'size-2 bg-text-primary',
  'square-accent': 'size-2.5 bg-accent',
};

export function StatusDot({ variant = 'live', className }: StatusDotProps) {
  return (
    <span
      aria-hidden="true"
      data-variant={variant}
      className={cx('inline-block shrink-0', VARIANT_CLASSES[variant], className)}
    />
  );
}
