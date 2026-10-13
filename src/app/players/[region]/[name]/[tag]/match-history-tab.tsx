'use client';

import { useState } from 'react';
import { EmptyState } from '@/components/ui/states';
import {
  FilterBar,
  FilterLabel,
  FilterSelect,
  type FilterSelectProps,
} from '@/components/ui/filter-bar';
import { cx } from '@/lib/cx';
import type { MatchSummary, RrHistoryPoint } from '@/contracts/tracker';
import {
  FILTER_ALL,
  distinctSortedDesc,
  filterMatchesForProfiles,
  queueOptions,
  seasonOptions,
} from '@/services/analytics/agent-map-filters';
import {
  buildHistoryMetrics,
  sortMatchesByRecency,
} from '@/services/analytics/match-history';
import { indexRrDeltaByMatchId } from '@/services/analytics/rr-trend';
import { MatchHistoryCard } from './match-history-card';
import { MatchHistorySidebar } from './match-history-sidebar';

/**
 * MatchHistoryTab — aba "Partidas & Histórico Completo" (Stitch
 * "match-breakdown"): matriz de filtros REAIS (ato/fila/agente/mapa/resultado),
 * fita de KPIs, registro denso de partidas em cards e painel de coaching IA.
 * Toda a derivação passa por `services/analytics`; aqui só há estado de filtro
 * + paginação e render.
 */

const PAGE_SIZE = 6;

type ResultFilter = 'all' | 'win' | 'loss';

const RESULT_OPTIONS: readonly { readonly value: ResultFilter; readonly label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'win', label: 'Vitórias' },
  { value: 'loss', label: 'Derrotas' },
];

export interface MatchHistoryTabProps {
  readonly matches: readonly MatchSummary[];
  readonly rrHistory: readonly RrHistoryPoint[];
  readonly player: { readonly region: string; readonly name: string; readonly tag: string };
  /** Hooks de coaching reais (`overview.combat.coaching_hooks`). */
  readonly coachingHooks: readonly string[];
  readonly eloBase?: string;
}

function toOptions(
  values: readonly (string | null)[],
  allLabel: string,
): FilterSelectProps['options'] {
  return [
    { value: FILTER_ALL, label: allLabel },
    ...distinctSortedDesc(values).map((value) => ({ value, label: value })),
  ];
}

export function MatchHistoryTab({
  matches,
  rrHistory,
  player,
  coachingHooks,
  eloBase,
}: MatchHistoryTabProps) {
  const [season, setSeason] = useState<string>(FILTER_ALL);
  const [queue, setQueue] = useState<string>(FILTER_ALL);
  const [agent, setAgent] = useState<string>(FILTER_ALL);
  const [map, setMap] = useState<string>(FILTER_ALL);
  const [result, setResult] = useState<ResultFilter>('all');
  const [page, setPage] = useState(0);

  // — Estado de filtro: qualquer troca volta para a 1ª página —
  const update =
    <T,>(setter: (value: T) => void) =>
    (value: T): void => {
      setter(value);
      setPage(0);
    };

  const filtered = filterMatchesForProfiles(matches, {
    season: season === FILTER_ALL ? null : season,
    queue: queue === FILTER_ALL ? null : queue,
  }).filter(
    (match) =>
      (agent === FILTER_ALL || match.agent === agent) &&
      (map === FILTER_ALL || match.map === map) &&
      (result === 'all' || match.result === result),
  );
  const ordered = sortMatchesByRecency(filtered);

  const rrDeltas = indexRrDeltaByMatchId(rrHistory);
  const rrPointsById = new Map(rrHistory.map((point) => [point.matchId, point]));
  const metrics = buildHistoryMetrics(ordered, rrDeltas);
  const visibleIds = new Set(ordered.map((match) => match.matchId));
  const windowPoints = rrHistory.filter((point) => visibleIds.has(point.matchId));

  const totalPages = Math.max(1, Math.ceil(ordered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageItems = ordered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const netTone = metrics.netRr > 0 ? 'positive' : metrics.netRr < 0 ? 'negative' : 'neutral';
  const rrRange =
    windowPoints.length > 0
      ? `${windowPoints[0]!.tier} (${windowPoints[0]!.rr} RR) → ${windowPoints[windowPoints.length - 1]!.tier} (${windowPoints[windowPoints.length - 1]!.rr} RR)`
      : 'Sem janela de MMR para o filtro';

  return (
    <div data-match-history-tab className="flex flex-col gap-5">
      {/* ————————————————— Matriz de filtros (real) ————————————————— */}
      <FilterBar>
        <div className="flex flex-wrap items-center gap-3">
          <FilterLabel>Filtros ativos:</FilterLabel>
          <FilterSelect
            label="Ato"
            value={season}
            onChange={update(setSeason)}
            options={seasonOptions(matches)}
          />
          <FilterSelect
            label="Modo"
            value={queue}
            onChange={update(setQueue)}
            options={queueOptions(matches)}
          />
          <FilterSelect
            label="Agente"
            value={agent}
            onChange={update(setAgent)}
            options={toOptions(
              matches.map((match) => match.agent),
              'Todos os agentes',
            )}
          />
          <FilterSelect
            label="Mapa"
            value={map}
            onChange={update(setMap)}
            options={toOptions(
              matches.map((match) => match.map),
              'Todos os mapas',
            )}
          />
          <div className="flex items-center overflow-hidden rounded-sm border border-line">
            {RESULT_OPTIONS.map((option) => {
              const active = option.value === result;
              return (
                <button
                  key={option.value}
                  type="button"
                  data-result-filter={option.value}
                  aria-pressed={active}
                  onClick={() => update(setResult)(option.value)}
                  className={cx(
                    'border-r border-line px-2.5 py-1.5 font-hud text-label uppercase last:border-r-0',
                    'transition-colors duration-[var(--duration-fast)]',
                    active
                      ? 'bg-accent font-bold text-text-primary'
                      : 'bg-surface text-text-secondary hover:bg-surface-recessed hover:text-text-primary',
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="font-hud text-label uppercase text-text-secondary">
            Indexados: {ordered.length} partidas
          </span>
          {eloBase !== undefined ? (
            <span className="border border-line bg-accent px-1.5 py-0.5 font-hud text-label font-bold uppercase text-text-primary">
              Elo base: {eloBase}
            </span>
          ) : null}
        </div>
      </FilterBar>

      {/* ————————————————— Fita de KPIs ————————————————— */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6" data-history-kpis>
        <KpiCard
          label="Winrate"
          accent={`${metrics.wins}V - ${metrics.losses}D`}
          value={`${metrics.winrate}%`}
        >
          <div className="mt-1 flex h-1.5 w-full overflow-hidden rounded-sm border border-line bg-surface-highest">
            <div className="h-full bg-line" style={{ width: `${metrics.winrate}%` }} />
          </div>
        </KpiCard>
        <KpiCard label="Net RR" value={signed(metrics.netRr, ' RR')} accent={netTone === 'positive' ? 'Δ positivo' : netTone === 'negative' ? 'Δ negativo' : 'Δ neutro'}>
          <p className="truncate font-hud text-label-xs uppercase text-text-secondary">{rrRange}</p>
        </KpiCard>
        <KpiCard label="K/D médio" value={metrics.avgKd.toFixed(2)} />
        <KpiCard label="ACS médio" value={metrics.avgAcs} accent="pts/rnd" />
        <KpiCard
          label="Precisão (HS%)"
          value={metrics.avgHsPercentage === null ? '—' : `${metrics.avgHsPercentage}%`}
        />
        <KpiCard
          label="First bloods"
          value={metrics.firstBloods === null ? '—' : metrics.firstBloods}
          accent={metrics.firstBloodsPerMatch === null ? undefined : `${metrics.firstBloodsPerMatch}/jogo`}
        />
      </div>

      {/* ————————————————— Registro + painel IA ————————————————— */}
      {ordered.length === 0 ? (
        <EmptyState
          title="Sem partidas no filtro"
          description="Ajuste os filtros para visualizar o histórico competitivo."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <div className="flex flex-col gap-2 lg:col-span-8 xl:col-span-9" data-history-registry>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-surface-recessed px-3 py-2 font-hud text-label-xs uppercase text-text-secondary">
              <span>Matriz telemétrica // execução competitiva</span>
              <span>Mostrando {pageItems.length} de {ordered.length}</span>
            </div>

            {pageItems.map((match) => (
              <MatchHistoryCard
                key={match.matchId}
                match={match}
                region={player.region}
                player={{ name: player.name, tag: player.tag }}
                rrDelta={rrDeltas.get(match.matchId)}
                rrPoint={rrPointsById.get(match.matchId)}
              />
            ))}

            {totalPages > 1 ? (
              <div className="flex flex-wrap items-center gap-1 border-t border-line pt-3">
                {Array.from({ length: totalPages }, (_, index) => (
                  <button
                    key={index}
                    type="button"
                    aria-current={index === currentPage ? 'page' : undefined}
                    onClick={() => setPage(index)}
                    className={cx(
                      'rounded-sm border border-line px-2.5 py-1 font-hud text-label-sm',
                      index === currentPage
                        ? 'bg-accent font-bold text-text-primary'
                        : 'bg-surface text-text-primary hover:bg-surface-hover',
                    )}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="lg:col-span-4 xl:col-span-3">
            <MatchHistorySidebar
              coachingHooks={coachingHooks}
              rrPoints={windowPoints}
              metrics={metrics}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function signed(value: number, suffix: string): string {
  return `${value >= 0 ? '+' : ''}${value}${suffix}`;
}

function KpiCard({
  label,
  value,
  accent,
  children,
}: {
  readonly label: string;
  readonly value: React.ReactNode;
  readonly accent?: string;
  readonly children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between rounded-md border border-line bg-surface p-3">
      <div className="flex items-center justify-between gap-2 font-hud text-label-xs uppercase text-text-secondary">
        <span className="truncate">{label}</span>
        {accent !== undefined ? <span className="shrink-0 font-bold">{accent}</span> : null}
      </div>
      <div className="my-1 font-display text-heading-lg font-bold text-text-primary">{value}</div>
      {children}
    </div>
  );
}
