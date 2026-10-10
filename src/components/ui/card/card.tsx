import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

/**
 * Card — superfície elevada com header opcional. Fundo `surface-raised`
 * (canvas-soft), borda hairline e raio discreto. O header traz um label
 * uppercase e um slot de ação.
 */

export interface CardProps {
  readonly label?: string;
  readonly action?: ReactNode;
  readonly className?: string;
  readonly children: ReactNode;
}

export function Card({ label, action, className, children }: CardProps) {
  const hasHeader = label !== undefined || action !== undefined;

  return (
    <div className={cx('rounded-lg border border-line bg-surface-raised', className)}>
      {hasHeader ? (
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
          <span className="text-label uppercase text-text-secondary">{label}</span>
          {action !== undefined ? <div data-card-action>{action}</div> : null}
        </div>
      ) : null}
      <div className="p-5">{children}</div>
    </div>
  );
}
