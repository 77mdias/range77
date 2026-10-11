import type { PlayerOverview } from '@/services/tracker/player-overview';
import { SectionHeader } from '@/components/ui/section-header';
import { indexRrDeltaByMatchId } from '@/services/analytics/rr-trend';
import { AgentsMapsExplorer } from './agents-maps-explorer';
import { MatchesTab } from './profile-view';

/**
 * BreakdownView — tela PARTIDAS & BREAKDOWN do jogador (Stitch
 * "partidas-breakdown"): strip de filtros reais + seção "Agentes & Mapas"
 * (matriz de performance, map pool e advice) + histórico completo de
 * partidas. Apresentação PURA — dados prontos do overview.
 */
export function BreakdownView({ overview }: { readonly overview: PlayerOverview }) {
  const rrDeltas = indexRrDeltaByMatchId(overview.rrHistory);
  const eloBase =
    overview.rank?.tier ?? overview.rrHistory[overview.rrHistory.length - 1]?.tier ?? undefined;

  return (
    <div
      data-player-breakdown
      className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6"
    >
      <SectionHeader
        as="h1"
        title="Partidas & Breakdown"
        annotation="TELEMETRY_PIPELINE"
        meta={
          <span className="font-hud text-label uppercase text-text-secondary">
            {overview.player.name}#{overview.player.tag} •{' '}
            {overview.player.region.toUpperCase()}
          </span>
        }
      />

      <section id="agentes-mapas" data-breakdown-section="agentes-mapas" className="flex flex-col gap-4 scroll-mt-24">
        <AgentsMapsExplorer matches={overview.matches} eloBase={eloBase} />
      </section>

      <section id="partidas" data-breakdown-section="partidas" className="flex flex-col gap-4 scroll-mt-24">
        <SectionHeader
          title="Partidas"
          annotation="HISTÓRICO COMPLETO"
          meta={
            <span className="font-hud text-label uppercase text-text-secondary">
              {overview.matches.length} na janela • ΔRR quando disponível
            </span>
          }
        />
        <MatchesTab matches={overview.matches} region={overview.player.region} rrDeltas={rrDeltas} />
      </section>
    </div>
  );
}
