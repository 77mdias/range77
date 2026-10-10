import type { ApiErrorBody } from '@/contracts/coach';
import { cx } from '@/lib/cx';

/**
 * ErrorState — contrato visual do envelope de erro da API
 * (`ApiErrorBody`): mostra `code`, `message` e `hint` opcional.
 */

export interface ErrorStateProps {
  readonly error: ApiErrorBody;
  readonly className?: string;
}

export function ErrorState({ error, className }: ErrorStateProps) {
  const { code, message, hint } = error.error;

  return (
    <div className={cx('overflow-hidden rounded-lg border border-line bg-surface-raised', className)}>
      <div role="alert" className="border-l-4 border-loss p-6">
        <p className="text-label uppercase text-loss">Erro · {code}</p>
        <p className="mt-1 font-display text-heading-sm text-text-primary">{message}</p>
        {hint !== undefined ? (
          <p className="mt-2 text-body text-text-secondary">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}
