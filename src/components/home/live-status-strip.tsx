import type { ReactNode } from 'react';
import { StatusDot } from '@/components/ui/status-dot';
import { cx } from '@/lib/cx';

/**
 * LiveStatusStrip — faixa de KPIs ao vivo + ações (rodapé da landing):
 * mini-tiles de status à esquerda e slot de botões à direita.
 */

export interface LiveStatusItem {
  readonly label: string;
  readonly value: string;
  /** Exibe o dot pulsante de "ao vivo" no primeiro tile. */
  readonly live?: boolean;
}

export interface LiveStatusStripProps {
  readonly items: readonly LiveStatusItem[];
  /** Ações à direita (botões). */
  readonly actions?: ReactNode;
  readonly className?: string;
}

export function LiveStatusStrip({ items, actions, className }: LiveStatusStripProps) {
  return (
    <section
      data-component="live-status-strip"
      className={cx('w-full border-t border-line bg-surface-raised px-4 py-4', className)}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-3 md:flex-row md:items-center">
        <dl className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4" data-live-items>
          {items.map((item) => (
            <div key={item.label} className="border border-line bg-surface p-2">
              <dt className="flex items-center gap-1.5 font-hud text-label uppercase text-text-secondary">
                {item.live === true ? <StatusDot variant="live" /> : null}
                {item.label}
              </dt>
              <dd className="mt-0.5 font-display text-heading-sm uppercase text-text-primary">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
        {actions !== undefined ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2" data-live-actions>
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}
