'use client';

import { useState, type ReactNode } from 'react';
import { RoundSelector, type RoundOption } from '@/components/match/round-selector';

/**
 * Ilha client do mapa de abates: só guarda o round ativo. Os painéis (um
 * `KillMap` por round) chegam já renderizados no servidor; mostramos um.
 */
export interface MatchRoundSelectorProps {
  readonly rounds: readonly RoundOption[];
  /** Mesmo índice de `rounds`. */
  readonly panels: readonly ReactNode[];
}

export function MatchRoundSelector({ rounds, panels }: MatchRoundSelectorProps) {
  const [activeId, setActiveId] = useState(rounds[0]?.id ?? '');
  const index = Math.max(0, rounds.findIndex((round) => round.id === activeId));

  return (
    <div className="flex flex-col gap-4">
      <RoundSelector
        rounds={rounds}
        activeId={activeId}
        onSelect={setActiveId}
        ariaLabel="Round do mapa de abates"
      />
      <div role="tabpanel">{panels[index]}</div>
    </div>
  );
}
