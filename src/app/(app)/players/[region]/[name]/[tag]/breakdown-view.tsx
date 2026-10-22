import type { PlayerOverview } from '@/services/tracker/player-overview';
import { SimulatedBadge } from '@/components/ui/simulated-badge';
import { SectionHeader } from '@/components/ui/section-header';
import { Card } from '@/components/ui/card';
import { DeathHeatmap } from '@/components/charts/death-heatmap';
import { EconomyDisciplineCard } from '@/components/player/economy-discipline-card';
import { minimapFor } from '@/lib/valorant-maps';
import { DeathHeatmapSelector } from './death-heatmap-selector';
import { AgentsMapsExplorer } from './agents-maps-explorer';
import { BreakdownTabs } from './breakdown-tabs';
import { MatchHistoryTab } from './match-history-tab';

/**
 * BreakdownView — tela PARTIDAS & BREAKDOWN do jogador (Stitch
 * "match-breakdown"): cabeçalho + DUAS abas de HUD:
 *   1. "Desempenho por Agente & Mapa" (matriz, map pool e advice — ilha de
 *      filtros já existente);
 *   2. "Partidas & Histórico Completo" (registro denso de partidas + KPIs +
 *      painel de coaching IA).
 * A antiga lista "Últimas partidas jogadas" foi removida: virou a aba de
 * histórico. Apresentação PURA — dados prontos do overview.
 */
export function BreakdownView({
  overview,
  simulated = false,
}: {
  readonly overview: PlayerOverview;
  readonly simulated?: boolean;
}) {
  const eloBase =
    overview.rank?.tier ?? overview.rrHistory[overview.rrHistory.length - 1]?.tier ?? undefined;

  const { tactical } = overview;
  const heatmaps = overview.deathHeatmaps.flatMap((h) => {
    const minimap = minimapFor(h.mapId);
    return minimap === null ? [] : [{ ...h, src: minimap.src }];
  });

  return (
    <div
      data-player-breakdown
      className="flex w-full flex-col gap-6 px-4 py-6 md:px-6 xl:px-8"
    >
      <SectionHeader
        as="h1"
        title="Partidas & Breakdown"
        annotation="TELEMETRY_PIPELINE"
        meta={
          <span className="flex items-center gap-2 font-hud text-label uppercase text-text-secondary">
            {simulated ? <SimulatedBadge /> : null}
            <span>
              {overview.player.name}#{overview.player.tag} •{' '}
              {overview.player.region.toUpperCase()}
            </span>
          </span>
        }
      />

      {tactical !== null ? (
        <section data-breakdown-tactical className="flex flex-col gap-4">
          <SectionHeader as="h2" title="Vetores táticos" annotation="POSITION_ECONOMY" />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
            <div className="flex flex-col gap-4">
              <EconomyDisciplineCard discipline={tactical.discipline} />
              {tactical.topDeathZones.length > 0 ? (
                <Card label="Onde você mais morre">
                  <ol data-top-death-zones className="flex flex-col gap-2">
                    {tactical.topDeathZones.map((zone) => (
                      <li
                        key={zone.label}
                        className="flex items-center justify-between font-hud text-label uppercase text-text-primary"
                      >
                        <span>{zone.label}</span>
                        <span className="text-text-secondary">{`${zone.deaths} mortes`}</span>
                      </li>
                    ))}
                  </ol>
                </Card>
              ) : null}
            </div>
            {heatmaps.length > 0 ? (
              <Card label="Heatmap de mortes">
                <DeathHeatmapSelector
                  maps={heatmaps.map((h) => ({ id: h.mapId, label: h.mapName }))}
                  panels={heatmaps.map((h) => (
                    <DeathHeatmap key={h.mapId} grid={h.grid} mapName={h.mapName} minimapSrc={h.src} />
                  ))}
                />
              </Card>
            ) : null}
          </div>
        </section>
      ) : null}

      <BreakdownTabs
        matchCount={overview.matches.length}
        agentsMaps={<AgentsMapsExplorer matches={overview.matches} eloBase={eloBase} />}
        history={
          <MatchHistoryTab
            matches={overview.matches}
            rrHistory={overview.rrHistory}
            player={{
              region: overview.player.region,
              name: overview.player.name,
              tag: overview.player.tag,
            }}
            coachingHooks={overview.combat.coaching_hooks}
            eloBase={eloBase}
          />
        }
      />
    </div>
  );
}
