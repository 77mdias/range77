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
  AGENT_ROLE_OPTIONS,
  AGENT_SORT_OPTIONS,
  FILTER_ALL,
  filterAgentsByRole,
  filterByMinMatches,
  filterMatchesForProfiles,
  queueOptions,
  seasonOptions,
} from '@/services/analytics/agent-map-filters';
import {
  MIN_SAMPLE,
  type AgentSortKey,
  type SortDirection,
} from '@/services/analytics/agent-map-profiles';
import type { AgentRole } from '@/lib/agent-roles';
import { buildAgentSignatures } from '@/services/analytics/agent-signatures';
import { buildBenchmarkComparison } from '@/services/analytics/benchmark';
import { buildMapSideStats } from '@/services/analytics/map-sides';
import type { MatchSummary } from '@/contracts/tracker';
import { AgentsTab, MapsTab } from './agents-maps-sections';

/**
 * Ilha client da seção "Agentes & Mapas" (Stitch): FilterBar com filtros
 * REAIS que o contrato suporta (temporada/fila sobre `MatchSummary` e
 * amostra mínima sobre as agregações) + controles da matriz de agentes
 * (papel e ordenação por métrica real) — recalculados client-side via
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
  const [role, setRole] = useState(FILTER_ALL);
  const [sort, setSort] = useState<AgentSortKey>('acs');
  const [direction, setDirection] = useState<SortDirection>('desc');

  const filtered = filterMatchesForProfiles(matches, {
    season: season === FILTER_ALL ? null : season,
    queue: queue === FILTER_ALL ? null : queue,
  });
  const agents = filterByMinMatches(summarizeByAgent(filtered), minMatches ? MIN_SAMPLE : null);
  // Filtro de papel + ordenação da matriz de agentes (client-side, sem fetch).
  const agentsByRole = filterAgentsByRole(agents, role === FILTER_ALL ? null : (role as AgentRole));
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
          meta={`${agentsByRole.length} agentes na amostra`}
        />
        <div data-agent-controls className="flex flex-wrap items-center gap-3">
          <FilterLabel>Filtrar & ordenar</FilterLabel>
          <FilterSelect
            label="Papel"
            value={role}
            onChange={setRole}
            options={AGENT_ROLE_OPTIONS}
          />
          <FilterSelect
            label="Ordenar por"
            value={sort}
            onChange={(value) => setSort(value as AgentSortKey)}
            options={AGENT_SORT_OPTIONS}
          />
          <button
            type="button"
            data-sort-direction={direction}
            onClick={() => setDirection((current) => (current === 'desc' ? 'asc' : 'desc'))}
            aria-label={
              direction === 'desc'
                ? 'Ordenação decrescente (maior primeiro) — clique para inverter'
                : 'Ordenação crescente (menor primeiro) — clique para inverter'
            }
            className="cursor-pointer rounded-md border border-line bg-surface px-2.5 py-2 font-hud text-label uppercase text-text-primary transition-colors duration-[var(--duration-fast)] hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-text-primary"
          >
            {direction === 'desc' ? '↓ maior' : '↑ menor'}
          </button>
        </div>
        <AgentsTab
          agents={agentsByRole}
          signatures={signatures}
          benchmark={benchmark}
          eloBase={eloBase}
          sort={sort}
          direction={direction}
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
