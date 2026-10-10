'use client';

import { useId } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';
import { cx } from '@/lib/cx';

/**
 * FilterBar — faixa de controles de filtro (página de agentes/mapas):
 * chip de rótulo, `FilterSelect`, `FilterCheckbox` e indicadores de amostra
 * à direita. Componentes interativos ('use client') controlados pelo pai.
 */

export function FilterBar({ children, className }: { readonly children: ReactNode; readonly className?: string }) {
  return (
    <div
      data-component="filter-bar"
      className={cx(
        'flex flex-wrap items-center justify-between gap-3 rounded-md bg-surface-raised px-3 py-2.5',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function FilterLabel({ children }: { readonly children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-surface px-2.5 py-2 font-hud text-label uppercase text-text-secondary">
      <Icon name="filter" />
      {children}
    </span>
  );
}

export interface FilterSelectProps {
  readonly label: string;
  readonly value: string;
  readonly options: readonly { readonly value: string; readonly label: string }[];
  readonly onChange: (value: string) => void;
  readonly className?: string;
}

export function FilterSelect({ label, value, options, onChange, className }: FilterSelectProps) {
  const selectId = useId();

  function handleChange(event: ChangeEvent<HTMLSelectElement>): void {
    onChange(event.target.value);
  }

  return (
    <span className={cx('relative inline-flex items-center', className)}>
      <label className="sr-only" htmlFor={selectId}>
        {label}
      </label>
      <select
        id={selectId}
        data-component="filter-select"
        aria-label={label}
        value={value}
        onChange={handleChange}
        className={cx(
          'cursor-pointer appearance-none rounded-md bg-surface px-2.5 py-2 pr-6',
          'font-hud text-label uppercase text-text-primary',
          'border border-line transition-colors duration-[var(--duration-fast)]',
          'focus-visible:outline-2 focus-visible:outline-text-primary',
        )}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Icon
        name="chevron-down"
        className="pointer-events-none absolute right-1.5 text-text-secondary"
      />
    </span>
  );
}

export interface FilterCheckboxProps {
  readonly label: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly className?: string;
}

export function FilterCheckbox({ label, checked, onChange, className }: FilterCheckboxProps) {
  const inputId = useId();

  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    onChange(event.target.checked);
  }

  return (
    <span
      data-component="filter-checkbox"
      className={cx(
        'inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-2',
        className,
      )}
    >
      <input
        id={inputId}
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        className="size-3 cursor-pointer accent-[var(--color-ink)]"
      />
      <label
        htmlFor={inputId}
        className="cursor-pointer font-hud text-label uppercase text-text-primary"
      >
        {label}
      </label>
    </span>
  );
}
