import { ChamferBox } from '@/components/ui/chamfer-box';
import type { ApiErrorBody } from '@/contracts/coach';
import { cx } from '@/lib/cx';

/**
 * ErrorState — contrato visual do envelope de erro da API
 * (`ApiErrorBody`): mostra `code`, `message` e `hint` opcional.
 * Usa ChamferBox para manter a borda chanfrada correta (clip-path).
 */

export interface ErrorStateProps {
  readonly error: ApiErrorBody;
  readonly className?: string;
}

export function ErrorState({ error, className }: ErrorStateProps) {
  const { code, message, hint } = error.error;

  return (
    <ChamferBox
      bordered
      className={cx('shadow-hard', className)}
      style={{ '--chamfer-inner-bg': 'var(--color-surface-raised)' }}
    >
      <div role="alert" className="border-l-4 border-loss p-6">
        <p className="text-label uppercase text-loss">Erro · {code}</p>
        <p className="mt-1 font-display text-heading-sm uppercase text-text-primary">{message}</p>
        {hint !== undefined ? (
          <p className="mt-2 text-body text-text-secondary">{hint}</p>
        ) : null}
      </div>
    </ChamferBox>
  );
}
