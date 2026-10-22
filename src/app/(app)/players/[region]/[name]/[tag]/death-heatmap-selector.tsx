'use client';

import { useState, type ReactNode } from 'react';
import { RoundSelector, type RoundOption } from '@/components/match/round-selector';

/**
 * Ilha client do heatmap de mortes: só guarda o mapa ativo. Os painéis (um
 * `DeathHeatmap` por mapa) chegam já renderizados no servidor.
 */
export interface DeathHeatmapSelectorProps {
  readonly maps: readonly RoundOption[];
  /** Mesmo índice de `maps`. */
  readonly panels: readonly ReactNode[];
}

export function DeathHeatmapSelector({ maps, panels }: DeathHeatmapSelectorProps) {
  const [activeId, setActiveId] = useState(maps[0]?.id ?? '');
  const index = Math.max(0, maps.findIndex((map) => map.id === activeId));

  return (
    <div className="flex flex-col gap-3">
      {maps.length > 1 ? (
        <RoundSelector
          rounds={maps}
          activeId={activeId}
          onSelect={setActiveId}
          ariaLabel="Mapa do heatmap de mortes"
        />
      ) : null}
      <div role={maps.length > 1 ? 'tabpanel' : undefined}>{panels[index]}</div>
    </div>
  );
}
