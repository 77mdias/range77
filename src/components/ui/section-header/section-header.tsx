import type { ReactNode } from 'react';
import { StatusDot } from '@/components/ui/status-dot';
import { TagLabel } from '@/components/ui/tag-label';
import { cx } from '@/lib/cx';

/**
 * SectionHeader — título de seção com o quadrado marcador, anotação de
 * pipeline (`// CODE`) à direita do título e slot de meta à direita.
 */

export interface SectionHeaderProps {
  readonly title: string;
  /** Anotação de código exibida como chip ao lado do título (sem `//`). */
  readonly annotation?: string;
  /** Marcador quadrado: tinta (padrão) ou acento. */
  readonly marker?: 'ink' | 'accent';
  /** Meta à direita (contagens, estado, legenda). */
  readonly meta?: ReactNode;
  /** Nível do heading (padrão h2). */
  readonly as?: 'h1' | 'h2' | 'h3';
  readonly className?: string;
}

export function SectionHeader({
  title,
  annotation,
  marker = 'ink',
  meta,
  as: Heading = 'h2',
  className,
}: SectionHeaderProps) {
  return (
    <div
      data-component="section-header"
      className={cx('flex flex-wrap items-center justify-between gap-3 pb-3', className)}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <StatusDot variant={marker === 'accent' ? 'square-accent' : 'square'} />
        <Heading className="truncate font-display text-heading-lg uppercase tracking-tight text-text-primary">
          {title}
        </Heading>
        {annotation !== undefined ? (
          <TagLabel className="rounded-sm bg-surface-raised px-1.5 py-1">{annotation}</TagLabel>
        ) : null}
      </div>
      {meta !== undefined ? (
        <div data-section-meta className="font-hud text-label uppercase text-text-secondary">
          {meta}
        </div>
      ) : null}
    </div>
  );
}
