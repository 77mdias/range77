import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

/**
 * Badge — rótulo compacto de estado (vitória/derrota/accent/neutro).
 * Usado em linhas de partida (W/L) e placeholders de tier.
 */

export type BadgeVariant = 'win' | 'loss' | 'accent' | 'neutral';

export interface BadgeProps {
  readonly variant?: BadgeVariant;
  readonly className?: string;
  readonly children: ReactNode;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  win: 'border-win/30 bg-win/10 text-win',
  loss: 'border-loss/30 bg-loss/10 text-loss',
  accent: 'border-transparent bg-accent text-on-accent',
  neutral: 'border-line bg-surface-hover text-text-secondary',
};

export function Badge({ variant = 'neutral', className, children }: BadgeProps) {
  return (
    <span
      data-variant={variant}
      className={cx(
        'inline-flex items-center justify-center rounded-full border px-2 py-0.5',
        'font-hud text-label uppercase tracking-wide',
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
