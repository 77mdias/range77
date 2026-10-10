import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';
import { TagLabel } from '@/components/ui/tag-label';
import { cx } from '@/lib/cx';

/**
 * InfoCallout — nota arquitetural/explicativa: ícone no acento, label
 * `//` e corpo. Usada no console (abaixo do code viewer).
 */

export interface InfoCalloutProps {
  readonly label: string;
  readonly children: ReactNode;
  readonly className?: string;
}

export function InfoCallout({ label, children, className }: InfoCalloutProps) {
  return (
    <div
      data-component="info-callout"
      className={cx('flex items-start gap-3 rounded-md bg-surface-raised p-3', className)}
    >
      <Icon name="info" size="md" className="mt-0.5 text-text-primary" />
      <div className="min-w-0">
        <TagLabel>{label}</TagLabel>
        <p className="mt-1.5 text-body leading-relaxed text-text-primary">{children}</p>
      </div>
    </div>
  );
}
