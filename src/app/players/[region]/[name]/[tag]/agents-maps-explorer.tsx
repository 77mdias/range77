'use client';

import { useState } from 'react';
import {
  FilterBar,
  FilterCheckbox,
  FilterLabel,
  FilterSelect,
} from '@/components/ui/filter-bar';
import { SectionHeader } from '@/components/ui/section-header';
import { summarizeByAgent, summarizeByMap } from '@/services/analytics/tracker-aggregations';
import {
  FILTER_ALL,
  filterByMinMatches,
  filterMatchesForProfiles,
  queueOptions,
  seasonOptions,
} from '@/services/analytics/agent-map-filters';
import { MIN_SAMPLE } from '@/services/analytics/agent-map-profiles';
import { buildAgentSignatures } from '@/services/analytics/agent-signatures';
import { buildBenchmarkComparison } from '@/services/analytics/benchmark';
import { buildMapSideStats } from '@/services/analytics/map-sides';
import type { MatchSummary } from '@/contracts/tracker';
import { AgentsTab, MapsTab } from './agents-maps-sections';

/**
 * Ilha client da seção "Agentes & Mapas" (Stitch): FilterBar com filtros
 * REAIS que o contrato suporta (temporada/fila sobre `MatchSummary` e
 * amostra mínima sobre as agregações) — recalculados client-side via
 * `analytics`, sem fetch novo. Toda a derivação mora em `services/analytics`;
 * este componente só orquestra estado + render.
 */

export interface AgentsMapsExplorerProps {
  readonly matches: readonly MatchSummary[];
  /** Elo de referência exibido à direita da FilterBar (tier atual real). */
  readonly eloBase?: string;
}

export function AgentsMapsExplorer({ matches, eloBase }: AgentsMapsExplorerProps) {
  const [season, setSeason] = useState(FILTER_ALL);
  const [queue, setQueue] = useState(FILTER_ALL);
  const [minMatches, setMinMatches] = useState(false);

  const filtered = filterMatchesForProfiles(matches, {
    season: season === FILTER_ALL ? null : season,
    queue: queue === FILTER_ALL ? null : queue,
  });
  const agents = filterByMinMatches(summarizeByAgent(filtered), minMatches ? MIN_SAMPLE : null);
  const maps = filterByMinMatches(summarizeByMap(filtered), minMatches ? MIN_SAMPLE : null);
  const signatures = buildAgentSignatures(filtered);
  const benchmark = buildBenchmarkComparison(filtered);
  const mapSides = buildMapSideStats(filtered);

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
        <span className="flex items-center gap-3">
          <span
            data-sample-total
            className="border border-line bg-surface px-1.5 py-0.5 font-hud text-label uppercase text-text-secondary"
          >
            Amostra total: {filtered.length} partidas
          </span>
          {eloBase !== undefined ? (
            <span
              data-elo-base
              className="border border-line bg-accent px-1.5 py-0.5 font-hud text-label font-bold uppercase text-text-primary"
            >
              Elo base: {eloBase}
            </span>
          ) : null}
        </span>
      </FilterBar>

      <div data-filtered-agents className="flex flex-col gap-4">
        <SectionHeader
          title="Matriz de Performance por Agente"
          annotation="AGENT_TELEMETRY_PIPELINE"
          marker="accent"
          meta="SORT: ACS DECRESCENTE"
        />
        <AgentsTab
          agents={agents}
          signatures={signatures}
          benchmark={benchmark}
          eloBase={eloBase}
        />
      </div>
      <div data-filtered-maps className="flex flex-col gap-4">
        <SectionHeader
          title="Performance por Mapa (Map Pool Analytics)"
          annotation="MAP_VECTOR_BREAKDOWN"
          meta={`${maps.length} mapas na amostra`}
        />
        <MapsTab maps={maps} sides={mapSides} />
      </div>
    </div>
  );
}
