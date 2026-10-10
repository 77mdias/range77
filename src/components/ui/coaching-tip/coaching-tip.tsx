import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { cx } from '@/lib/cx';

/**
 * CoachingTip — callout de recomendação do coach IA: borda esquerda no
 * acento, chip de prioridade e rodapé de impacto estimado.
 */

export type CoachingTipPriority = 'alta' | 'critica' | 'rotina';

export interface CoachingTipProps {
  readonly title: string;
  readonly priority?: CoachingTipPriority;
  readonly children: ReactNode;
  /** Rodapé (ex.: "IMPACTO ESTIMADO: +12% WR"). */
  readonly impact?: ReactNode;
  readonly className?: string;
}

const PRIORITY_LABEL: Record<CoachingTipPriority, string> = {
  alta: 'Prioridade alta',
  critica: 'Crítico',
  rotina: 'Rotina diária',
};

export function CoachingTip({
  title,
  priority,
  children,
  impact,
  className,
}: CoachingTipProps) {
  return (
    <aside
      data-component="coaching-tip"
      className={cx(
        'rounded-md border border-line border-l-4 border-l-accent bg-surface p-3',
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-hud text-label font-bold uppercase tracking-wider text-text-primary">
          <span aria-hidden="true" className="text-text-secondary">
            //&nbsp;
          </span>
          {title}
        </span>
        {priority !== undefined ? <Badge variant="neutral">{PRIORITY_LABEL[priority]}</Badge> : null}
      </div>
      <div className="mt-1.5 text-body leading-relaxed text-text-primary">{children}</div>
      {impact !== undefined ? (
        <footer className="mt-2 flex items-center justify-between border-t border-line pt-2 font-hud text-label uppercase text-text-secondary">
          {impact}
        </footer>
      ) : null}
    </aside>
  );
}
