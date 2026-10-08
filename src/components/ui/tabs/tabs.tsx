'use client';

import { Activity, ViewTransition, startTransition, useId, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { cx } from '@/lib/cx';
import { getNextTabIndex } from './tabs.logic';

/**
 * Tabs — hand-rolled e acessível (role=tablist/tab/tabpanel, aria-selected,
 * roving tabindex, setas/Home/End). A troca de painel roda em
 * `startTransition` + `<ViewTransition>`; painéis inativos ficam em
 * `<Activity mode="hidden">`, preservando estado (ex.: scroll/form) sem
 * exibir na tela.
 */

export interface TabItem {
  readonly id: string;
  readonly label: string;
  readonly content: ReactNode;
}

export interface TabsProps {
  readonly items: readonly TabItem[];
  readonly defaultTabId?: string;
  readonly ariaLabel?: string;
  readonly className?: string;
}

export function Tabs({ items, defaultTabId, ariaLabel, className }: TabsProps) {
  const firstId = items[0]?.id ?? '';
  const [activeId, setActiveId] = useState<string>(() =>
    defaultTabId !== undefined && items.some((item) => item.id === defaultTabId)
      ? defaultTabId
      : firstId,
  );
  const baseId = useId();
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const activeIndex = items.findIndex((item) => item.id === activeId);

  function select(id: string, focus: boolean): void {
    startTransition(() => setActiveId(id));
    if (focus) {
      tabRefs.current[id]?.focus();
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    const nextIndex = getNextTabIndex(activeIndex, items.length, event.key);
    if (nextIndex === null) {
      return;
    }
    const next = items[nextIndex];
    if (next === undefined) {
      return;
    }
    event.preventDefault();
    select(next.id, true);
  }

  return (
    <div className={className} data-tabs>
      <div
        role="tablist"
        aria-label={ariaLabel}
        onKeyDown={handleKeyDown}
        className="flex flex-wrap gap-1 border-b border-line"
      >
        {items.map((item) => {
          const selected = item.id === activeId;
          return (
            <button
              key={item.id}
              ref={(element) => {
                tabRefs.current[item.id] = element;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${item.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(item.id, false)}
              className={cx(
                'relative -mb-px h-10 border-b-2 px-4',
                'font-hud text-label uppercase tracking-wide',
                'transition-colors duration-[var(--duration-fast)] ease-out-expo',
                selected
                  ? 'border-accent text-text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary',
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {items.map((item) => (
        <Activity key={item.id} mode={item.id === activeId ? 'visible' : 'hidden'}>
          <div
            role="tabpanel"
            id={`${baseId}-panel-${item.id}`}
            aria-labelledby={`${baseId}-tab-${item.id}`}
            tabIndex={0}
          >
            <ViewTransition enter="fade" exit="fade" default="none">
              {item.content}
            </ViewTransition>
          </div>
        </Activity>
      ))}
    </div>
  );
}
