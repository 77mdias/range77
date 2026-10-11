'use client';

import { useState } from 'react';
import {
  FilterBar,
  FilterCheckbox,
  FilterLabel,
  FilterSelect,
} from '@/components/ui/filter-bar';
import { summarizeByAgent, summarizeByMap } from '@/services/analytics/tracker-aggregations';
import {
  FILTER_ALL,
  filterByMinMatches,
  filterMatchesForProfiles,
  queueOptions,
  seasonOptions,
} from '@/services/analytics/agent-map-filters';
import { MIN_SAMPLE } from '@/services/analytics/agent-map-profiles';
import type { MatchSummary } from '@/contracts/tracker';
import { AgentsTab, MapsTab } from './agents-maps-sections';

/**
 * Ilha client da seção "Agentes & Mapas" (Stitch): FilterBar com filtros
 * REAIS que o contrato suporta (temporada/fila sobre `MatchSummary` e
 * amostra mínima sobre as agregações) — recalculados client-side via
 * `analytics`, sem fetch novo. Toda a derivação mora em `services/analytics`;
 * este componente só orquestra estado + render.
 */

export function AgentsMapsExplorer({ matches }: { readonly matches: readonly MatchSummary[] }) {
  const [season, setSeason] = useState(FILTER_ALL);
  const [queue, setQueue] = useState(FILTER_ALL);
  const [minMatches, setMinMatches] = useState(false);

  const filtered = filterMatchesForProfiles(matches, {
    season: season === FILTER_ALL ? null : season,
    queue: queue === FILTER_ALL ? null : queue,
  });
  const agents = filterByMinMatches(summarizeByAgent(filtered), minMatches ? MIN_SAMPLE : null);
  const maps = filterByMinMatches(summarizeByMap(filtered), minMatches ? MIN_SAMPLE : null);

  return (
    <div className="flex flex-col gap-4" data-agents-maps-explorer>
      <FilterBar>
        <div className="flex flex-wrap items-center gap-3">
          <FilterLabel>Filtros ativos:</FilterLabel>
          <FilterSelect
            label="Temporada"
            value={season}
            onChange={setSeason}
            options={seasonOptions(matches)}
          />
          <FilterSelect
            label="Fila"
            value={queue}
            onChange={setQueue}
            options={queueOptions(matches)}
          />
          <FilterCheckbox
            label={`Mínimo de ${MIN_SAMPLE} jogos`}
            checked={minMatches}
            onChange={setMinMatches}
          />
        </div>
        <span
          data-sample-total
          className="font-hud text-label uppercase text-text-secondary"
        >
          Amostra total: {filtered.length} partidas
        </span>
      </FilterBar>

      <div data-filtered-agents>
        <AgentsTab agents={agents} />
      </div>
      <div data-filtered-maps>
        <MapsTab maps={maps} />
      </div>
    </div>
  );
}
