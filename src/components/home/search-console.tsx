import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';
import { StatusDot } from '@/components/ui/status-dot';
import { cx } from '@/lib/cx';

/**
 * SearchConsole — wrapper estilo terminal do hero de busca: header com
 * título + chip de status, corpo (SearchBar via children) e rodapé helper.
 * A sombra dura (4px, tinta) é opt-in (`hardShadow`) — assinatura do
 * console na tela Stitch.
 */

export interface SearchConsoleProps {
  readonly title?: string;
  /** Chip do header (ex.: "STATUS: AGUARDANDO INPUT"). */
  readonly statusChip?: string;
  /** Linha de ajuda no rodapé (ex.: "3-layer pipeline pronto"). */
  readonly helperText?: ReactNode;
  readonly hardShadow?: boolean;
  readonly className?: string;
  readonly children: ReactNode;
}

export function SearchConsole({
  title = 'Terminal de consulta telemétrica',
  statusChip,
  helperText,
  hardShadow = false,
  className,
  children,
}: SearchConsoleProps) {
  return (
    <section
      data-component="search-console"
      className={cx(
        'w-full max-w-3xl rounded-md border border-line bg-surface p-3 text-left',
        hardShadow && 'shadow-[4px_4px_0px_0px_var(--color-ink)]',
        className,
      )}
    >
      <header className="mb-3 flex items-center justify-between gap-2 border-b border-line pb-2">
        <span className="flex items-center gap-1.5 font-hud text-label font-bold uppercase text-text-primary">
          <Icon name="terminal" />
          {title}
        </span>
        {statusChip !== undefined ? (
          <span
            data-console-status
            className="rounded-sm border border-line bg-surface-raised px-1.5 py-0.5 font-hud text-label uppercase text-text-secondary"
          >
            {statusChip}
          </span>
        ) : null}
      </header>

      {children}

      {helperText !== undefined ? (
        <p className="mt-2.5 flex items-center gap-1.5 font-hud text-label uppercase text-text-secondary">
          <StatusDot variant="live" />
          {helperText}
        </p>
      ) : null}
    </section>
  );
}
