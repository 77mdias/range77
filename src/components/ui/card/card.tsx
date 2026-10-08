import type { ReactNode } from 'react';
import { ChamferBox, type ChamferSize } from '@/components/ui/chamfer-box';
import { cx } from '@/lib/cx';

/**
 * Card — superfície elevada chanfrada com header opcional.
 * O interior usa `surface-raised` via `--chamfer-inner-bg` (técnica da
 * primitiva ChamferBox). O header traz um label uppercase e um slot de ação.
 */

export interface CardProps {
  readonly label?: string;
  readonly action?: ReactNode;
  readonly size?: ChamferSize;
  readonly className?: string;
  readonly children: ReactNode;
}

export function Card({ label, action, size = 'md', className, children }: CardProps) {
  const hasHeader = label !== undefined || action !== undefined;

  return (
    <ChamferBox
      bordered
      size={size}
      className={cx('shadow-hard', className)}
      style={{ '--chamfer-inner-bg': 'var(--color-surface-raised)' }}
    >
      {hasHeader ? (
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
          <span className="text-label uppercase text-text-secondary">{label}</span>
          {action !== undefined ? <div data-card-action>{action}</div> : null}
        </div>
      ) : null}
      <div className="p-5">{children}</div>
    </ChamferBox>
  );
}
