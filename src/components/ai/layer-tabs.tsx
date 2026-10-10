'use client';

import { cx } from '@/lib/cx';

/**
 * LayerTabs — controle segmentado (console): tabs contidas num trilho
 * com fundo; ativa ganha acento. Diferente do `Tabs` (blocadas).
 */

export interface LayerTabOption {
  readonly id: string;
  readonly label: string;
}

export interface LayerTabsProps {
  readonly options: readonly LayerTabOption[];
  readonly activeId: string;
  readonly onChange: (id: string) => void;
  readonly ariaLabel?: string;
  readonly className?: string;
}

export function LayerTabs({
  options,
  activeId,
  onChange,
  ariaLabel = 'Selecionar camada',
  className,
}: LayerTabsProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      data-component="layer-tabs"
      className={cx('flex items-center gap-1 rounded-md bg-surface-raised p-1', className)}
    >
      {options.map((option) => {
        const active = option.id === activeId;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.id)}
            className={cx(
              'flex-1 rounded-sm px-3 py-1.5 text-center font-hud text-label uppercase transition-colors duration-[var(--duration-fast)]',
              active
                ? 'bg-accent font-bold text-text-primary'
                : 'text-text-secondary hover:text-text-primary',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
