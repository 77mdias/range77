import type { InputHTMLAttributes, ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';
import { cx } from '@/lib/cx';

/**
 * CheckboxRow — checkbox quadrado de micro-raio com check amarelo (Stitch).
 * O check é um `<Icon>` irmão controlado por `peer-checked` — evita o data-URI
 * inline que o arquivo do Stitch usa em `style`.
 */
export interface CheckboxRowProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'id' | 'className'> {
  readonly id: string;
  readonly label: ReactNode;
  readonly hint?: string;
  readonly className?: string;
}

export function CheckboxRow({ id, label, hint, className, ...inputProps }: CheckboxRowProps) {
  const hintId = `${id}-hint`;

  return (
    <div data-checkbox-row={id} className={cx('flex items-start gap-2', className)}>
      <span className="relative mt-0.5 flex size-3.5 shrink-0 items-center justify-center">
        <input
          id={id}
          type="checkbox"
          {...inputProps}
          aria-describedby={
            hint !== undefined && inputProps['aria-describedby'] === undefined
              ? hintId
              : inputProps['aria-describedby']
          }
          className={cx(
            'peer size-3.5 shrink-0 appearance-none rounded-xs border border-line bg-surface',
            'checked:border-text-primary checked:bg-text-primary',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        />
        <Icon
          name="check"
          size="xs"
          className="pointer-events-none absolute hidden text-accent peer-checked:block"
        />
      </span>

      <span className="min-w-0">
        <label htmlFor={id} className="block text-body-sm leading-tight text-text-primary">
          {label}
        </label>
        {hint !== undefined ? (
          <span
            id={hintId}
            className="mt-0.5 block font-hud text-label-xs uppercase text-text-secondary"
          >
            {hint}
          </span>
        ) : null}
      </span>
    </div>
  );
}
