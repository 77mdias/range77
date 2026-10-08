import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '@/lib/cx';

/**
 * Button — ação primária do design system.
 *
 * Variantes (`primary` blood com sombra dura, `secondary` outline, `ghost`)
 * e tamanhos sm/md/lg. O estado `loading` bloqueia a interação (evita
 * duplo submit), expõe `aria-busy` e troca o conteúdo por um spinner CSS.
 * Efeito de press: o botão desloca 2px e a sombra dura "encosta".
 */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly loading?: boolean;
  readonly children?: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent shadow-hard hover:bg-accent-hover',
  secondary:
    'border border-text-primary bg-transparent text-text-primary hover:bg-surface-hover',
  ghost: 'bg-transparent text-text-secondary hover:bg-surface-hover hover:text-text-primary',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-body',
  md: 'h-11 px-6 text-body-lg',
  lg: 'h-14 px-8 text-body-lg',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-loading={loading ? '' : undefined}
      className={cx(
        'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap',
        'font-hud font-semibold uppercase tracking-wide',
        'transition-[transform,box-shadow,background-color,color] duration-[var(--duration-fast)] ease-out-expo',
        'active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'disabled:active:translate-x-0 disabled:active:translate-y-0',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
    >
      {loading ? (
        <span
          data-testid="button-spinner"
          aria-hidden="true"
          className="inline-block size-4 animate-spin border-2 border-current border-t-transparent"
        />
      ) : null}
      {children}
    </button>
  );
}
