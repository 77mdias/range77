'use client';

import { useState } from 'react';
import { Field, type FieldProps } from './field';
import { Icon } from '@/components/ui/icon';
import {
  PASSWORD_STRENGTH_CHECKS,
  passwordStrength,
  type PasswordStrengthCheckId,
} from '@/lib/validation/credentials';
import { cx } from '@/lib/cx';

/**
 * PasswordField — `Field` de senha com toggle de visibilidade e, opcionalmente,
 * o medidor de 3 barras do Stitch. O medidor é APRESENTAÇÃO: a autoridade
 * continua sendo `PASSWORD_MIN_LENGTH`/`PASSWORD_MAX_LENGTH` no `createAuth`.
 */
export interface PasswordFieldProps extends Omit<FieldProps, 'icon' | 'addon' | 'type'> {
  readonly showStrength?: boolean;
}

export function PasswordField({
  id,
  value,
  defaultValue,
  onChange,
  showStrength = false,
  placeholder = '••••••••••••',
  ...rest
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  // Não-controlado (defaultValue) também precisa acender o medidor.
  const [uncontrolled, setUncontrolled] = useState(
    typeof defaultValue === 'string' ? defaultValue : '',
  );
  const current = typeof value === 'string' ? value : uncontrolled;
  const strength = passwordStrength(current);

  return (
    <div className="flex flex-col gap-1.5">
      <Field
        {...rest}
        id={id}
        type={visible ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        defaultValue={defaultValue}
        onChange={(event) => {
          setUncontrolled(event.target.value);
          onChange?.(event);
        }}
        icon="shield"
        addon={
          <button
            type="button"
            aria-label="Alternar visibilidade de senha"
            aria-pressed={visible}
            onClick={() => setVisible((c) => !c)}
            className="flex items-center rounded-xs p-1 text-text-secondary transition-colors duration-[var(--duration-fast)] hover:text-text-primary"
          >
            <Icon name={visible ? 'eye-off' : 'eye'} size="md" />
          </button>
        }
      />

      {showStrength ? (
        <div data-password-strength data-score={strength.score} className="flex flex-col gap-1">
          <div className="grid grid-cols-3 gap-1">
            {PASSWORD_STRENGTH_CHECKS.map((check) => {
              const met = strength.met[check.id as PasswordStrengthCheckId];
              return (
                <span
                  key={check.id}
                  data-strength-bar={check.id}
                  {...(met ? { 'data-met': '' } : {})}
                  className={cx('h-1', met ? 'bg-text-primary' : 'bg-surface-pressed')}
                />
              );
            })}
          </div>
          <div className="flex items-center justify-between font-hud text-label-xs uppercase text-text-secondary">
            {PASSWORD_STRENGTH_CHECKS.map((check) => (
              <span
                key={check.id}
                className={strength.met[check.id] ? 'text-text-primary' : undefined}
              >
                {check.label}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
