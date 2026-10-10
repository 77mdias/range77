import type { ReactNode } from 'react';
import { StatusDot } from '@/components/ui/status-dot';
import { TagLabel } from '@/components/ui/tag-label';
import { cx } from '@/lib/cx';

/**
 * AiCoachTerminal — painel do coach IA (coluna direita do overview):
 * status pill pulsante, título, score strip do backend e corpo com
 * dicas/prompt.
 */

export interface AiCoachTerminalProps {
  /** Ex.: "LAYER 3 ONLINE". */
  readonly status: string;
  readonly title: string;
  /** Linha do score (ex.: "Backend Score: 87/100 • 3-Layer"). */
  readonly scoreLine: string;
  readonly children: ReactNode;
  readonly className?: string;
}

export function AiCoachTerminal({
  status,
  title,
  scoreLine,
  children,
  className,
}: AiCoachTerminalProps) {
  return (
    <section
      data-component="ai-coach-terminal"
      className={cx(
        'flex h-full flex-col justify-between rounded-md border border-line bg-surface-raised p-3',
        className,
      )}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 border border-line bg-accent px-1.5 py-0.5 font-hud text-label font-bold uppercase text-text-primary">
            <StatusDot variant="live" />
            IA Coach
          </span>
          <TagLabel>{status}</TagLabel>
        </div>
        <h3 className="mt-2 font-display text-heading-sm uppercase tracking-tight text-text-primary">
          {title}
        </h3>
        <p className="mt-1.5 flex items-center gap-1.5 border border-line bg-surface px-2 py-1.5 font-hud text-label font-semibold uppercase text-text-primary">
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
            className="size-3.5 shrink-0"
          >
            <path d="M8 1.5 13.5 4v4.5c0 3-2.5 5-5.5 6-3-1-5.5-3-5.5-6V4L8 1.5Z" />
          </svg>
          {scoreLine}
        </p>
      </div>
      <div className="mt-3 flex flex-col gap-2" data-terminal-body>
        {children}
      </div>
    </section>
  );
}
