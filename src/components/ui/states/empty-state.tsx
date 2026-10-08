import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

/**
 * EmptyState — estado vazio (sem partidas/resultados). Título display,
 * descrição opcional e slot de ação.
 */

export interface EmptyStateProps {
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
  readonly className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div
      data-state="empty"
      className={cx(
        'flex flex-col items-center justify-center gap-2 px-6 py-12 text-center',
        className,
      )}
    >
      <p className="font-display text-heading-lg uppercase text-text-primary">{title}</p>
      {description !== undefined ? (
        <p className="max-w-md text-body text-text-secondary">{description}</p>
      ) : null}
      {action !== undefined ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
