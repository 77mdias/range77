import type { InputHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/icon';
import { cx } from '@/lib/cx';

/**
 * Field — campo de formulário do Stitch (label mono + badge/hint à direita +
 * controle com hairline + ícone à esquerda + addon à direita).
 *
 * Exporta `FIELD_CONTROL_CLASS` para controles irmãos (`<select>` de região)
 * usarem exatamente o mesmo tratamento — hoje a classe estava duplicada inline
 * em `email-auth-forms.tsx`.
 */

export const FIELD_CONTROL_CLASS = cx(
  'w-full rounded-xs border border-line bg-surface py-1.5 font-hud text-body-sm',
  'text-text-primary placeholder:text-text-secondary',
  'focus:bg-surface-raised focus:outline-none focus:ring-1 focus:ring-line',
  'disabled:cursor-not-allowed disabled:opacity-50',
);

export interface FieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'> {
  readonly id: string;
  readonly label: string;
  /** Dica técnica à direita do label (ex.: `RFC 822`). */
  readonly hint?: string;
  /** Badge à direita do label (ex.: `OPCIONAL`). */
  readonly badge?: string;
  readonly icon?: IconName;
  /** Controle à direita do input (botão de senha, `check_circle`…). */
  readonly addon?: ReactNode;
  readonly className?: string;
}

export function Field({
  id,
  label,
  hint,
  badge,
  icon,
  addon,
  className,
  ...inputProps
}: FieldProps) {
  return (
    <div data-field={id} className={cx('flex flex-col gap-1.5', className)}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="font-hud text-label-md uppercase text-text-primary">
          {label}
        </label>
        {badge !== undefined ? (
          <span className="border border-line bg-surface-pressed px-1 py-0.5 font-hud text-label-xs uppercase text-text-secondary">
            {badge}
          </span>
        ) : null}
        {hint !== undefined ? (
          <span className="font-hud text-label-xs uppercase text-text-secondary">{hint}</span>
        ) : null}
      </div>

      <div className="relative">
        {icon !== undefined ? (
          <Icon
            name={icon}
            size="md"
            className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 text-text-secondary"
          />
        ) : null}
        <input
          id={id}
          {...inputProps}
          className={cx(FIELD_CONTROL_CLASS, icon !== undefined ? 'pl-7' : 'pl-2', addon !== undefined ? 'pr-10' : 'pr-2')}
        />
        {addon !== undefined ? (
          <span className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center">{addon}</span>
        ) : null}
      </div>
    </div>
  );
}
