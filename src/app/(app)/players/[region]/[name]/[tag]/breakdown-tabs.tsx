'use client';

import { Activity, useEffect, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';
import { cx } from '@/lib/cx';
import { getNextTabIndex } from '@/components/ui/tabs/tabs.logic';

/**
 * BreakdownTabs — seletor de seções da tela "Partidas & Breakdown" (Stitch
 * "match-breakdown"): duas abas de HUD (`DESEMPENHO POR AGENTE & MAPA` e
 * `PARTIDAS & HISTÓRICO COMPLETO`) com marcador de contagem. A troca roda em
 * ilha client; painéis inativos ficam em `<Activity hidden>` (preserva estado
 * dos filtros). As âncoras `#agentes-mapas`/`#partidas` do shell selecionam a
 * aba correspondente ao montar (e em navegações por hash).
 */

export type BreakdownTabId = 'agentes-mapas' | 'partidas';

export interface BreakdownTabsProps {
  readonly matchCount: number;
  readonly agentsMaps: ReactNode;
  readonly history: ReactNode;
}

interface TabDefinition {
  readonly id: BreakdownTabId;
  readonly label: string;
  readonly icon: 'grid' | 'history';
  readonly badge?: string;
}

const HASH_TO_TAB: Readonly<Record<string, BreakdownTabId>> = {
  '#agentes-mapas': 'agentes-mapas',
  '#partidas': 'partidas',
};

export function BreakdownTabs({ matchCount, agentsMaps, history }: BreakdownTabsProps) {
  const [activeId, setActiveId] = useState<BreakdownTabId>('agentes-mapas');

  // Âncora do shell (`#agentes-mapas` / `#partidas`) escolhe a aba. Em SSR não
  // há `window`; o efeito roda só no cliente.
  useEffect(() => {
    const applyHash = (): void => {
      const tab = HASH_TO_TAB[window.location.hash];
      if (tab !== undefined) {
        setActiveId(tab);
      }
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, []);

  const tabs: readonly TabDefinition[] = [
    { id: 'agentes-mapas', label: 'Desempenho por agente & mapa', icon: 'grid' },
    {
      id: 'partidas',
      label: 'Partidas & histórico completo',
      icon: 'history',
      badge: `${matchCount} partidas`,
    },
  ];

  const activeIndex = tabs.findIndex((tab) => tab.id === activeId);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    const nextIndex = getNextTabIndex(activeIndex, tabs.length, event.key);
    if (nextIndex === null) {
      return;
    }
    const next = tabs[nextIndex];
    if (next === undefined) {
      return;
    }
    event.preventDefault();
    setActiveId(next.id);
    const focusId = `breakdown-tab-${next.id}`;
    document.getElementById(focusId)?.focus();
  }

  return (
    <div data-breakdown-tabs className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line">
        <div
          role="tablist"
          aria-label="Seções de Partidas & Breakdown"
          onKeyDown={handleKeyDown}
          className="flex flex-wrap items-center gap-1"
        >
          {tabs.map((tab) => {
            const selected = tab.id === activeId;
            return (
              <button
                key={tab.id}
                id={`breakdown-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={tab.id}
                tabIndex={selected ? 0 : -1}
                data-tab={tab.id}
                onClick={() => setActiveId(tab.id)}
                className={cx(
                  '-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-3',
                  'font-display text-heading-sm font-bold uppercase tracking-tight',
                  'transition-colors duration-[var(--duration-fast)] ease-out-expo',
                  selected
                    ? 'border-line bg-accent text-text-primary'
                    : 'border-transparent text-text-secondary hover:bg-surface-recessed hover:text-text-primary',
                )}
              >
                <Icon name={tab.icon} size="md" />
                <span>{tab.label}</span>
                {tab.badge !== undefined ? (
                  <span
                    className={cx(
                      'ml-1 rounded-sm border border-line px-1.5 py-0.5 font-hud text-label-xs font-bold uppercase',
                      selected ? 'bg-surface text-text-primary' : 'bg-surface-highest text-text-primary',
                    )}
                  >
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="hidden items-center gap-1.5 pb-1 font-hud text-label uppercase text-text-secondary sm:flex">
          <Icon name="refresh" size="xs" className="text-accent-ink" />
          Histórico atualizado via HenrikDev API
        </div>
      </div>

      <Activity mode={activeId === 'agentes-mapas' ? 'visible' : 'hidden'}>
        <div
          role="tabpanel"
          id="agentes-mapas"
          aria-labelledby="breakdown-tab-agentes-mapas"
          tabIndex={0}
          className="flex scroll-mt-24 flex-col gap-4"
        >
          {agentsMaps}
        </div>
      </Activity>

      <Activity mode={activeId === 'partidas' ? 'visible' : 'hidden'}>
        <div
          role="tabpanel"
          id="partidas"
          aria-labelledby="breakdown-tab-partidas"
          tabIndex={0}
          className="flex scroll-mt-24 flex-col gap-4"
        >
          {history}
        </div>
      </Activity>
    </div>
  );
}
