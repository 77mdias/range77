import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

/**
 * AuthTerminal — card principal das telas de auth. Abre com a linha de
 * protocolo (mono) e um badge à direita; corpo livre abaixo. Stitch tela 7:
 * `shadow-hard-3` + hairline sobre `bg-surface`.
 */
export interface AuthTerminalProps {
  readonly protocolLine: string;
  readonly metaBadge?: string;
  readonly children: ReactNode;
  readonly className?: string;
}

export function AuthTerminal({
  protocolLine,
  metaBadge,
  children,
  className,
}: AuthTerminalProps) {
  return (
    <section
      data-auth-terminal
      className={cx('rounded-md border border-line bg-surface shadow-hard-3', className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-1.5">
        <span className="font-hud text-label-xs uppercase text-text-secondary">{protocolLine}</span>
        {metaBadge !== undefined ? (
          <span className="font-hud text-label-xs uppercase text-text-primary">{metaBadge}</span>
        ) : null}
      </div>
      <div className="flex flex-col gap-3 p-3">{children}</div>
    </section>
  );
}
