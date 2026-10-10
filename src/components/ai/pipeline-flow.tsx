import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';
import { cx } from '@/lib/cx';

/**
 * PipelineFlow — banner do fluxo de 3 camadas (console): cards de estágio
 * (label, chip de tamanho, título, meta) ligados por setas.
 */

export interface PipelineStage {
  readonly label: string;
  /** Chip de tamanho/payload (ex.: "420 KB", "1.8 KB / 420 TOKENS"). */
  readonly sizeChip?: string;
  /** Destaca o chip em acento (camada final). */
  readonly highlighted?: boolean;
  readonly title: string;
  readonly meta?: ReactNode;
}

export interface PipelineFlowProps {
  readonly stages: readonly PipelineStage[];
  readonly ariaLabel?: string;
  readonly className?: string;
}

export function PipelineFlow({ stages, ariaLabel = 'Fluxo de pipeline', className }: PipelineFlowProps) {
  return (
    <div
      data-component="pipeline-flow"
      role="list"
      aria-label={ariaLabel}
      className={cx(
        'grid grid-cols-1 items-stretch gap-2 rounded-md bg-surface-raised p-3 md:grid-cols-11',
        className,
      )}
    >
      {stages.map((stage, index) => (
        <div key={stage.label} role="listitem" className="contents">
          {index > 0 ? (
            <span
              aria-hidden="true"
              className="hidden items-center justify-center text-text-secondary md:col-span-1 md:flex"
            >
              <Icon name="arrow-right" size="md" />
            </span>
          ) : null}
          <article
            className={cx(
              'rounded-md border border-line bg-surface p-2.5',
              'md:col-span-3',
            )}
            data-pipeline-stage={index + 1}
          >
            <header className="flex items-center justify-between gap-2">
              <span className="font-hud text-label uppercase text-text-secondary">{stage.label}</span>
              {stage.sizeChip !== undefined ? (
                <span
                  className={cx(
                    'rounded-sm px-1.5 py-0.5 font-hud text-label',
                    stage.highlighted === true
                      ? 'bg-accent font-bold text-text-primary'
                      : 'bg-surface-hover text-text-secondary',
                  )}
                >
                  {stage.sizeChip}
                </span>
              ) : null}
            </header>
            <h3 className="mt-1.5 truncate text-body font-semibold text-text-primary">{stage.title}</h3>
            {stage.meta !== undefined ? (
              <p
                className={cx(
                  'mt-1.5 font-hud text-label',
                  stage.highlighted === true ? 'font-semibold text-win' : 'text-text-secondary',
                )}
              >
                {stage.meta}
              </p>
            ) : null}
          </article>
        </div>
      ))}
    </div>
  );
}
