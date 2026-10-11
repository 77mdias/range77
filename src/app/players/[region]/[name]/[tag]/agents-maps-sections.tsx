import { AgentCard, MapCard, type AgentCardProps } from '@/components/agents';
import { AgentRadar } from '@/components/charts';
import { CoachingTip } from '@/components/ui/coaching-tip';
import { EmptyState } from '@/components/ui/states';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/table';
import { agentArtSrc, mapSplashSrc } from '@/lib/valorant-assets';
import {
  MAIN_WINRATE_THRESHOLD,
  buildAgentCardProfiles,
  buildMapCardProfiles,
  buildMapPoolAdvice,
  type AgentCardProfile,
  type AgentTier,
  type MapPoolStatus,
} from '@/services/analytics/agent-map-profiles';
import type { GroupedStat } from '@/contracts/tracker';

/**
 * Seções "Agentes" e "Mapas" do perfil (tela Stitch) — apresentação PURA:
 * recebem as agregações prontas e só renderizam. Módulo compartilhado entre
 * o RSC do perfil e a ilha client de filtros (`agents-maps-explorer`).
 */

export function GroupedStatTable({
  rows,
  keyLabel,
}: {
  readonly rows: readonly GroupedStat[];
  readonly keyLabel: string;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="Sem dados"
        description="Nenhuma partida válida para agregar nesta seção."
      />
    );
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>{keyLabel}</TableHeaderCell>
          <TableHeaderCell numeric>J</TableHeaderCell>
          <TableHeaderCell numeric>Win%</TableHeaderCell>
          <TableHeaderCell numeric>KDA</TableHeaderCell>
          <TableHeaderCell numeric>ACS</TableHeaderCell>
          <TableHeaderCell numeric>HS%</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.key}>
            <TableCell>{row.key}</TableCell>
            <TableCell numeric>{row.matches}</TableCell>
            <TableCell numeric>{row.winrate}%</TableCell>
            <TableCell numeric>{row.kda}</TableCell>
            <TableCell numeric>{row.avgAcs}</TableCell>
            <TableCell numeric>
              {row.avgHsPercentage === null ? '—' : `${row.avgHsPercentage}%`}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** Rótulos/tom por tier — mapeamento de apresentação (texto puro). */
const TIER_LABELS: Record<AgentTier, string> = {
  main: 'Tier S main',
  solid: 'Solid sec',
  bottleneck: 'Bottleneck',
};

function toAgentCardProps(profile: AgentCardProfile): AgentCardProps {
  const tacticalNote: AgentCardProps['tacticalNote'] =
    profile.tier === 'bottleneck'
      ? {
          tone: 'warning',
          title: 'Alerta // gargalo crítico:',
          description: `Win rate de ${profile.winRatePercent}% derruba o elo — revise o kit e as rotinas com ${profile.name}.`,
        }
      : profile.tier === 'main'
        ? {
            tone: 'positive',
            title: 'Status tático // recomendado:',
            description: `Mantenha ${profile.name} como main — impacto consistente (${profile.winRatePercent}% WR).`,
          }
        : {
            tone: 'neutral',
            title: '// Viável:',
            description: `${profile.name} segura como opção no pool (${profile.winRatePercent}% WR).`,
          };

  return {
    name: profile.name,
    matches: profile.matches,
    winRate: `${profile.winRatePercent}%`,
    tier: profile.tier,
    tierLabel: TIER_LABELS[profile.tier],
    portraitSrc: agentArtSrc(profile.name) ?? undefined,
    stats: [
      { label: 'ACS', value: String(profile.avgAcs) },
      { label: 'K/D', value: profile.kdRatio.toFixed(2) },
      { label: 'HS%', value: profile.hsPercent === null ? '—' : `${profile.hsPercent}%` },
    ],
    progresses: [
      {
        label: 'Win rate',
        percent: profile.winRatePercent,
        displayValue: `${profile.winRatePercent}%`,
      },
      {
        label: 'Headshot',
        percent: profile.hsPercent ?? 0,
        displayValue: profile.hsPercent === null ? '—' : `${profile.hsPercent}%`,
      },
    ],
    tacticalNote,
  };
}

export function AgentsTab({ agents }: { readonly agents: readonly GroupedStat[] }) {
  const profiles = buildAgentCardProfiles(agents);

  if (profiles.length === 0) {
    return (
      <EmptyState
        title="Sem agentes"
        description="Nenhuma partida válida para computar o desempenho por agente."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" data-agent-cards>
        {profiles.map((profile) => (
          <AgentCard key={profile.name} {...toAgentCardProps(profile)} />
        ))}
      </div>
      <AgentRadar agents={agents} />
      <GroupedStatTable rows={agents} keyLabel="Agente" />
    </div>
  );
}

const STATUS_LABELS: Record<MapPoolStatus, string> = {
  best: 'Melhor mapa',
  stable: 'Estável',
  neutral: 'Neutro',
  worst: 'Pior mapa',
};

export function MapsTab({ maps }: { readonly maps: readonly GroupedStat[] }) {
  const profiles = buildMapCardProfiles(maps);
  const advice = buildMapPoolAdvice(maps);

  if (profiles.length === 0) {
    return (
      <EmptyState
        title="Sem mapas"
        description="Nenhuma partida válida para computar o desempenho por mapa."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-map-cards>
        {profiles.map((profile) => (
          <MapCard
            key={profile.name}
            map={profile.name}
            status={profile.status}
            statusLabel={STATUS_LABELS[profile.status]}
            winRate={`${profile.winRatePercent}%`}
            matches={profile.matches}
            record={{ wins: profile.wins, losses: profile.losses }}
            winPercent={profile.winRatePercent}
            imageSrc={mapSplashSrc(profile.name) ?? undefined}
          />
        ))}
      </div>
      {advice !== null ? (
        <CoachingTip
          title="Protocol advice: map pool deficit engine"
          priority={advice.worstWinRate < 45 ? 'critica' : 'alta'}
          impact={
            <span>
              Referência de benchmark: {MAIN_WINRATE_THRESHOLD}% WR · split ATK/DEF chega com o
              endpoint de detalhe por mapa
            </span>
          }
        >
          {advice.bestMap !== null ? (
            <>
              Priorize treino direcionado em <strong>{advice.worstMap}</strong> (WR{' '}
              {advice.worstWinRate}% em {advice.worstMatches} partidas) e pendule o pool com{' '}
              <strong>{advice.bestMap}</strong> ({advice.bestWinRate}% WR), seu melhor mapa
              elegível.
            </>
          ) : (
            <>
              Priorize treino direcionado em <strong>{advice.worstMap}</strong> (WR{' '}
              {advice.worstWinRate}% em {advice.worstMatches} partidas) — é o único mapa com
              amostra elegível.
            </>
          )}
          <span className="mt-2 block font-hud text-label uppercase text-text-secondary">
            Drill sugerido: 1 deathmatch + 1 ranked no mapa déficit antes da próxima sessão.
          </span>
        </CoachingTip>
      ) : null}
      <GroupedStatTable rows={maps} keyLabel="Mapa" />
    </div>
  );
}
