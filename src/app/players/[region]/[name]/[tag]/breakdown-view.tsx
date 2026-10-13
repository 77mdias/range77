import type { PlayerOverview } from '@/services/tracker/player-overview';
import { SectionHeader } from '@/components/ui/section-header';
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
export function BreakdownView({ overview }: { readonly overview: PlayerOverview }) {
  const eloBase =
    overview.rank?.tier ?? overview.rrHistory[overview.rrHistory.length - 1]?.tier ?? undefined;

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
          <span className="font-hud text-label uppercase text-text-secondary">
            {overview.player.name}#{overview.player.tag} •{' '}
            {overview.player.region.toUpperCase()}
          </span>
        }
      />

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
