'use client';

import { cx } from '@/lib/cx';

/**
 * RoundSelector — seletor horizontal de rounds para o diagnóstico IA
 * (tabs blocadas: ativa em tinta, inativa em superfície).
 */

export interface RoundOption {
  readonly id: string;
  readonly label: string;
}

export interface RoundSelectorProps {
  readonly rounds: readonly RoundOption[];
  readonly activeId: string;
  readonly onSelect: (id: string) => void;
  readonly ariaLabel?: string;
  readonly className?: string;
}

export function RoundSelector({
  rounds,
  activeId,
  onSelect,
  ariaLabel = 'Selecionar round',
  className,
}: RoundSelectorProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      data-component="round-selector"
      className={cx('flex items-center gap-1 overflow-x-auto pb-1', className)}
    >
      {rounds.map((round) => {
        const active = round.id === activeId;
        return (
          <button
            key={round.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(round.id)}
            className={cx(
              'shrink-0 px-2.5 py-1.5 font-hud text-label uppercase transition-colors duration-[var(--duration-fast)]',
              active
                ? 'bg-text-primary font-semibold text-surface'
                : 'bg-surface text-text-primary hover:bg-surface-hover',
            )}
          >
            {round.label}
          </button>
        );
      })}
    </div>
  );
}
