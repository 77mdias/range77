import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

/**
 * TagLabel — rótulo monoespaçado de "código" com prefixo `//`, usado como
 * eyebrow de seções, anotações de pipeline e metadados telemétricos.
 */

export type TagLabelTone = 'secondary' | 'critical' | 'positive' | 'primary';

export interface TagLabelProps {
  readonly children: ReactNode;
  /** Omite o prefixo `//` quando falso (padrões de pipeline usam o prefixo). */
  readonly withPrefix?: boolean;
  readonly tone?: TagLabelTone;
  readonly className?: string;
}

const TONE_CLASSES: Record<TagLabelTone, string> = {
  secondary: 'text-text-secondary',
  critical: 'text-loss',
  positive: 'text-win',
  primary: 'text-text-primary',
};

export function TagLabel({
  children,
  withPrefix = true,
  tone = 'secondary',
  className,
}: TagLabelProps) {
  return (
    <span
      data-tone={tone}
      className={cx(
        'font-hud text-label uppercase leading-none',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {withPrefix ? <span aria-hidden="true">//&nbsp;</span> : null}
      {children}
    </span>
  );
}
