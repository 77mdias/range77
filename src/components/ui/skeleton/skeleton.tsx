import type { CSSProperties } from 'react';
import { cx } from '@/lib/cx';

/**
 * Skeleton — bloco chanfrado pulsante para estados de carregamento.
 * Dimensões via props/className; `aria-hidden` (puramente decorativo).
 */

export interface SkeletonProps {
  readonly width?: CSSProperties['width'];
  readonly height?: CSSProperties['height'];
  readonly className?: string;
}

export function Skeleton({ width, height, className }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      data-skeleton
      style={{ width, height }}
      className={cx('block animate-pulse bg-surface-hover chamfer-sm', className)}
    />
  );
}
