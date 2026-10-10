import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';
import { TagLabel } from '@/components/ui/tag-label';
import { cx } from '@/lib/cx';

/**
 * AiCallout — diagnóstico IA em destaque (map pool/benchmark): linha de
 * acento à esquerda, chips de risco/confiança, ações numeradas e caixa de
 * ação rápida com botões (callbacks vindos do pai — client boundary).
 */

export interface AiActionItem {
  readonly title: string;
  readonly description: string;
}

export interface AiCalloutAction {
  readonly label: string;
  readonly onSelect: () => void;
  readonly variant?: 'primary' | 'ghost';
}

export interface AiCalloutProps {
  readonly title: string;
  /** Chip de risco (ex.: "RISCO ELEVADO DE RR (-48 RR/SEM)"). */
  readonly riskChip?: string;
  readonly confidence?: string;
  readonly children: ReactNode;
  readonly actions?: readonly AiActionItem[];
  readonly quickAction?: {
    readonly label: string;
    readonly title: string;
    readonly description: string;
    readonly primary: AiCalloutAction;
    readonly ghost?: AiCalloutAction;
  };
  readonly className?: string;
}

export function AiCallout({
  title,
  riskChip,
  confidence,
  children,
  actions,
  quickAction,
  className,
}: AiCalloutProps) {
  return (
    <section
      data-component="ai-callout"
      className={cx(
        'relative flex flex-col items-stretch gap-4 overflow-hidden rounded-md border border-line bg-surface p-4 md:flex-row',
        className,
      )}
    >
      <span aria-hidden="true" className="hidden w-1.5 shrink-0 self-stretch rounded-full bg-accent md:block" />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <header className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Icon name="bot" size="md" />
          <TagLabel tone="primary" className="font-bold tracking-wider">
            {title}
          </TagLabel>
          {riskChip !== undefined ? (
            <span className="rounded-sm bg-loss/10 px-1.5 py-0.5 font-hud text-label font-bold uppercase text-loss">
              {riskChip}
            </span>
          ) : null}
          {confidence !== undefined ? (
            <span className="font-hud text-label uppercase text-text-secondary">
              Confiança: {confidence}
            </span>
          ) : null}
        </header>

        <div className="flex flex-col gap-1.5 rounded-md bg-surface-raised p-3">
          {children}
        </div>

        {actions !== undefined && actions.length > 0 ? (
          <ul className="mt-1 grid grid-cols-1 gap-2 md:grid-cols-2" data-ai-actions>
            {actions.map((action, index) => (
              <li
                key={action.title}
                className="flex items-center gap-2 rounded-md bg-surface-raised p-2.5"
              >
                <span
                  aria-hidden="true"
                  className={cx(
                    'flex size-6 shrink-0 items-center justify-center rounded-sm font-hud text-label font-bold',
                    index % 2 === 0 ? 'bg-accent text-text-primary' : 'bg-text-primary text-surface',
                  )}
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <p className="font-hud text-label font-bold uppercase text-text-primary">
                    {action.title}
                  </p>
                  <p className="text-body text-text-secondary">{action.description}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {quickAction !== undefined ? (
        <aside className="flex w-full shrink-0 flex-col justify-between gap-2 rounded-md bg-surface-raised p-3 md:w-64">
          <div>
            <TagLabel>{quickAction.label}</TagLabel>
            <h3 className="mt-1 font-display text-heading-sm font-bold uppercase leading-tight text-text-primary">
              {quickAction.title}
            </h3>
            <p className="mt-1 font-hud text-label uppercase text-text-secondary">
              {quickAction.description}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={quickAction.primary.onSelect}
              className={cx(
                'flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 py-1.5',
                'bg-accent font-hud text-label font-bold uppercase text-text-primary',
                'transition-all duration-[var(--duration-fast)] hover:opacity-90',
              )}
            >
              <Icon name="arrow-right" />
              {quickAction.primary.label}
            </button>
            {quickAction.ghost !== undefined ? (
              <button
                type="button"
                onClick={quickAction.ghost.onSelect}
                className={cx(
                  'flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5',
                  'font-hud text-label uppercase text-text-primary',
                  'transition-colors duration-[var(--duration-fast)] hover:bg-surface-hover',
                )}
              >
                {quickAction.ghost.label}
              </button>
            ) : null}
          </div>
        </aside>
      ) : null}
    </section>
  );
}
