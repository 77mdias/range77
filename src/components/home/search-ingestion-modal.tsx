'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { ProgressBar } from '@/components/ui/progress-bar';
import { StatusDot } from '@/components/ui/status-dot';
import { cx } from '@/lib/cx';

/**
 * SearchIngestionModal — overlay de progresso da ingestão 3-layer após a
 * busca: passos (done/running/pending), barra de progresso e CTA para o
 * relatório do jogador. Totalmente controlado pelo pai (`open`).
 */

export type IngestionStepState = 'done' | 'running' | 'pending';

export interface IngestionStep {
  readonly label: string;
  readonly state: IngestionStepState;
}

export interface SearchIngestionModalProps {
  readonly open: boolean;
  /** Alvo da ingestão (Riot ID, ex.: "twmz#tower"). */
  readonly target: string;
  readonly steps: readonly IngestionStep[];
  /** 0–100 (calculado pelo pai a partir dos steps). */
  readonly progressPercent: number;
  readonly ctaLabel?: string;
  /** Habilita o CTA (ex.: ingestão concluída). */
  readonly ready?: boolean;
  readonly onOpenReport?: () => void;
  readonly onClose: () => void;
  readonly className?: string;
}

const STEP_ICON: Record<IngestionStepState, { icon: 'check' | 'refresh' | null; className: string }> = {
  done: { icon: 'check', className: 'text-win' },
  running: { icon: 'refresh', className: 'animate-pulse text-text-primary' },
  pending: { icon: null, className: '' },
};

export function SearchIngestionModal({
  open,
  target,
  steps,
  progressPercent,
  ctaLabel = 'Abrir relatório do jogador',
  ready = false,
  onOpenReport,
  onClose,
  className,
}: SearchIngestionModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Progresso da ingestão de dados"
      data-component="search-ingestion-modal"
      className={cx(
        'fixed inset-0 z-50 flex items-center justify-center bg-text-primary/40 p-4',
        className,
      )}
    >
      <div className="w-full max-w-lg rounded-md border border-line bg-surface p-5 shadow-hard-6">
        <header className="flex items-center justify-between gap-2 border-b border-line pb-2">
          <span className="flex items-center gap-2 font-hud text-label font-bold uppercase text-text-primary">
            <StatusDot variant="live" />
            Iniciando ingestão 3-layer
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            data-modal-close
            className="cursor-pointer rounded-sm border border-line bg-surface-raised px-2 py-0.5 font-hud text-label uppercase text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
          >
            ESC
          </button>
        </header>

        <p className="mt-2.5 font-hud text-label uppercase text-text-secondary">
          Target: <strong className="font-semibold text-text-primary">{target}</strong>
        </p>

        <ol className="mt-2.5 flex flex-col gap-1.5" data-modal-steps>
          {steps.map((step) => {
            const icon = STEP_ICON[step.state];
            return (
              <li
                key={step.label}
                data-step-state={step.state}
                className="flex items-start gap-2 text-body text-text-primary"
              >
                <span className={cx('mt-0.5 flex size-4 shrink-0 items-center justify-center', icon.className)}>
                  {icon.icon !== null ? <Icon name={icon.icon} /> : <StatusDot variant="idle" />}
                </span>
                <span className={cx(step.state === 'pending' && 'text-text-secondary')}>
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>

        <div className="mt-3 flex items-center gap-2">
          <ProgressBar value={progressPercent} tone="accent" ariaLabel="Progresso da ingestão" />
          <span
            data-modal-progress
            className="shrink-0 font-hud text-label font-semibold uppercase text-text-primary"
          >
            {Math.round(progressPercent)}%
          </span>
        </div>

        <div className="mt-3">
          <Button
            variant="primary"
            disabled={!ready}
            onClick={onOpenReport}
            className="w-full"
          >
            {ctaLabel}
            <Icon name="arrow-right" />
          </Button>
        </div>
      </div>
    </div>
  );
}
