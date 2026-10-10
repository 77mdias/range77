import type { ReactNode } from 'react';
import { WinProbabilityBar } from '@/components/ui/win-probability-bar';
import { cx } from '@/lib/cx';

/**
 * RoundDiagnosisCard — telemetria de um lance: meta (tempo/local), chip de
 * veredito (sub-ótimo/excelente), barra de win probability pré→pós,
 * análise do evento e slot com o CoachingTip.
 */

export interface RoundDiagnosisProps {
  /** Meta do lance (ex.: "00:18 restantes • Catwalk → A-Site"). */
  readonly meta: string;
  readonly verdict: 'suboptimal' | 'excellent';
  readonly verdictLabel: string;
  readonly beforePercent: number;
  readonly afterPercent: number;
  /** Análise do evento (pode conter <strong>). */
  readonly analysis: ReactNode;
  /** Conteúdo adicional (tip de coaching, ações). */
  readonly children?: ReactNode;
  readonly className?: string;
}

export function RoundDiagnosis({
  meta,
  verdict,
  verdictLabel,
  beforePercent,
  afterPercent,
  analysis,
  children,
  className,
}: RoundDiagnosisProps) {
  const negative = verdict === 'suboptimal';

  return (
    <article
      data-component="round-diagnosis"
      data-verdict={verdict}
      className={cx('relative rounded-md border border-line bg-surface p-4', className)}
    >
      <header className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <p className="font-hud text-label uppercase text-text-secondary">
          <span aria-hidden="true">//&nbsp;</span>
          {meta}
        </p>
        <span
          data-verdict-chip
          className={cx(
            'px-1.5 py-1 font-hud text-label font-bold uppercase',
            negative ? 'bg-loss text-surface' : 'bg-accent text-text-primary',
          )}
        >
          {verdictLabel}
        </span>
      </header>

      <WinProbabilityBar
        beforePercent={beforePercent}
        afterPercent={afterPercent}
        className="my-2.5"
      />

      <p className="font-hud text-label font-bold uppercase text-text-primary">
        Análise de evento:
      </p>
      <p className="mt-1.5 text-body leading-relaxed text-text-primary">{analysis}</p>

      {children !== undefined ? <div className="mt-2.5">{children}</div> : null}
    </article>
  );
}
