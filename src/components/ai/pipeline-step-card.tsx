import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/icon';
import { cx } from '@/lib/cx';

/**
 * PipelineStepCard — card de fase da arquitetura 3-layer (deep dive da
 * landing): chip de fase (núcleo em acento), métrica mono, ícone em caixa,
 * descrição e rodapé `SAÍDA:`. Composição vertical — complementa o
 * `PipelineFlow` (banner horizontal do console).
 */

export interface PipelineStepCardProps {
  /** Rótulo da fase (ex.: "FASE 01"). */
  readonly phase: string;
  /** Fase núcleo ganha chip/caixa em acento. */
  readonly highlighted?: boolean;
  /** Métrica do payload (ex.: "~420 KB"). */
  readonly metric: string;
  readonly icon: IconName;
  readonly title: string;
  readonly description: ReactNode;
  /** Arquivo de saída (ex.: "raw_match_timeline.json"). */
  readonly output: string;
  readonly className?: string;
}

export function PipelineStepCard({
  phase,
  highlighted = false,
  metric,
  icon,
  title,
  description,
  output,
  className,
}: PipelineStepCardProps) {
  return (
    <article
      data-component="pipeline-step-card"
      data-phase={phase}
      className={cx(
        'relative flex flex-col justify-between rounded-md border border-line bg-surface p-4',
        className,
      )}
    >
      <div>
        <header className="flex items-center justify-between gap-2">
          <span
            data-phase-chip
            className={cx(
              'rounded-sm px-1.5 py-0.5 font-hud text-label font-bold uppercase',
              highlighted
                ? 'bg-accent text-text-primary'
                : 'border border-line bg-surface-raised text-text-primary',
            )}
          >
            {phase}
          </span>
          <span className="font-hud text-label uppercase text-text-secondary">{metric}</span>
        </header>

        <span
          className={cx(
            'mt-3 flex size-10 items-center justify-center rounded-md border',
            highlighted ? 'border-transparent bg-accent text-text-primary' : 'border-line bg-surface-raised text-text-primary',
          )}
        >
          <Icon name={icon} size="md" />
        </span>

        <h3 className="mt-2.5 font-display text-heading-sm uppercase tracking-tight text-text-primary">
          {title}
        </h3>
        <p className="mt-1.5 text-body leading-relaxed text-text-secondary">{description}</p>
      </div>

      <footer className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2 font-hud text-label uppercase">
        <span className="text-text-secondary">Saída:</span>
        <span className="truncate font-semibold text-text-primary">{output}</span>
      </footer>
    </article>
  );
}
