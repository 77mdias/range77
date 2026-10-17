import type { ReactNode } from 'react';
import { StatusDot } from '@/components/ui/status-dot';
import { cx } from '@/lib/cx';

/**
 * RiotCallout — aviso de estado do Riot Sign-On (RSO), em duas variantes:
 * `rso` (tela 7: marca R + badge `[AGUARDANDO KEY PROD RIOT V9]`) e `status`
 * (tela 8: ponto pulsante + título de homologação, sem badge).
 *
 * #D32936 é o vermelho de marca da Riot — cor de terceiro, fora do design
 * system, mantida por ser marca e não decoração.
 */
export type RiotCalloutVariant = 'rso' | 'status';

export interface RiotCalloutProps {
  readonly variant?: RiotCalloutVariant;
  readonly title: string;
  readonly badge?: string;
  readonly children: ReactNode;
  readonly className?: string;
}

export function RiotCallout({
  variant = 'rso',
  title,
  badge,
  children,
  className,
}: RiotCalloutProps) {
  return (
    <div
      data-riot-callout={variant}
      className={cx('flex items-start gap-2 rounded-md border border-line bg-surface p-2', className)}
    >
      {variant === 'rso' ? (
        <span
          aria-hidden="true"
          className="flex size-5 shrink-0 items-center justify-center bg-[#D32936] font-hud text-label-sm font-bold text-white"
        >
          R
        </span>
      ) : (
        <StatusDot variant="live" className="mt-1 border border-line" />
      )}

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-hud text-label-md uppercase text-text-primary">{title}</span>
          {badge !== undefined ? (
            <span className="border border-line bg-surface-pressed px-1 py-0.5 font-hud text-label-xs uppercase text-text-secondary">
              {badge}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-body-sm leading-relaxed text-text-secondary">{children}</p>
      </div>
    </div>
  );
}
