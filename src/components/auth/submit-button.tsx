import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';
import { cx } from '@/lib/cx';

/**
 * SubmitButton — CTA do Stitch: full-width, `bg-accent` + tinta preta,
 * `shadow-hard-3` que "afunda" no hover/active. Usado pelos dois formulários.
 */
export interface SubmitButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'className'> {
  readonly loading?: boolean;
  readonly children: ReactNode;
  readonly className?: string;
}

export function SubmitButton({
  loading = false,
  disabled = false,
  children,
  className,
  ...buttonProps
}: SubmitButtonProps) {
  return (
    <button
      {...buttonProps}
      data-submit-button
      type="submit"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        'inline-flex w-full select-none items-center justify-center gap-2 rounded-md border border-line',
        'bg-accent py-2 font-hud text-label uppercase text-on-accent shadow-hard-3',
        'transition-[transform,box-shadow] duration-[var(--duration-fast)] ease-out-expo',
        'hover:shadow-hard-1 active:translate-x-1 active:translate-y-1 active:shadow-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'disabled:hover:shadow-hard-3 disabled:active:translate-x-0 disabled:active:translate-y-0',
        className,
      )}
    >
      {loading ? (
        <span
          data-testid="submit-spinner"
          aria-hidden="true"
          className="inline-block size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}
      {children}
      <Icon name="arrow-right" size="sm" />
    </button>
  );
}
