import type { ReactNode } from 'react';
import { AgentCard, MapCard, type AgentCardProps } from '@/components/agents';
import { AgentRadar, RrTrendChart, TrendLine } from '@/components/charts';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { KpiTile } from '@/components/ui/kpi-tile';
import { EmptyState } from '@/components/ui/states';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/table';
import { Tabs, type TabItem } from '@/components/ui/tabs';
import { MatchHistoryTable, PlayerHeader } from '@/components/player';
import {
  MAIN_WINRATE_THRESHOLD,
  buildAgentCardProfiles,
  buildMapCardProfiles,
  type AgentCardProfile,
  type AgentTier,
  type MapPoolStatus,
} from '@/services/analytics/agent-map-profiles';
import { computeRrNet } from '@/services/analytics/rr-trend';
import type { AgentStat, GroupedStat, MapStat, MatchSummary } from '@/contracts/tracker';
import type { PlayerOverview } from '@/services/tracker/player-overview';

/**
 * PlayerProfileView — apresentação PURA (síncrona) do perfil no design
 * Stitch: PlayerHeader, strip de KPIs, tendência, avaliação e abas
 * Visão Geral | Partidas | Agentes | Mapas. Separada da página assíncrona
 * para ser testável com `renderToStaticMarkup`.
 */

function formatPct(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${value}%`;
}

/** K/D de exibição (presentacional; divisão por zero → kills). */
function displayKd(kills: number, deaths: number): number {
  return deaths === 0 ? kills : kills / deaths;
}

export function OverviewTab({ overview }: { readonly overview: PlayerOverview }) {
  const metrics = overview.combat.raw_metrics;
  const { current, longestWin, longestLoss } = overview.streaks;
  const streakVariant =
    current.result === 'win' ? 'win' : current.result === 'loss' ? 'loss' : 'neutral';
  const streakLabel =
    current.result === 'none'
      ? 'Sem sequência'
      : `${current.length} ${current.result === 'win' ? 'vitórias' : 'derrotas'} seguidas`;

  const trendUp = overview.trend.direction === 'up';
  const trendDown = overview.trend.direction === 'down';
  const trendAccent = trendUp
    ? `▲ +${overview.trend.delta} ACS`
    : trendDown
      ? `▼ ${overview.trend.delta} ACS`
      : undefined;

  const rrSeries = overview.rrHistory.map((point) => ({ rr: point.rr, result: point.result }));
  const lastRr = overview.rrHistory[overview.rrHistory.length - 1];
  const rrNet = computeRrNet(overview.rrHistory);
  const rrNetLabel = rrNet > 0 ? `NET: +${rrNet} RR` : `NET: ${rrNet} RR`;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4" data-kpi-strip>
        <KpiTile label="K/D" value={metrics.kdr} trailing={`${metrics.matches} partidas`} />
        <KpiTile label="HS%" value={formatPct(metrics.hsPercentage)} />
        <KpiTile
          label="ACS"
          value={metrics.acs}
          accent={trendAccent}
          accentTone={trendUp ? 'positive' : trendDown ? 'negative' : 'neutral'}
        />
        <KpiTile label="KAST" value={formatPct(metrics.kast)} trailing={`${metrics.rounds} rounds`} />
      </div>

      <Card
        label="Trajetória RR"
        action={
          <span className="font-hud text-label uppercase text-text-secondary">{rrNetLabel}</span>
        }
      >
        <RrTrendChart series={rrSeries} />
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-hud text-label uppercase text-text-secondary">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-accent" aria-hidden /> Vitória (+RR)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-text-primary" aria-hidden /> Derrota (-RR)
          </span>
          {lastRr !== undefined ? (
            <span className="ml-auto">
              Atual: {lastRr.rr} RR ({lastRr.tier})
            </span>
          ) : null}
        </div>
      </Card>

      <Card label="Tendência de ACS">
        <TrendLine values={overview.trend.perMatch} />
      </Card>

      <Card label="Avaliação">
        <div className="flex flex-wrap gap-2">
          <Badge variant="accent">Mira: {overview.combat.evaluation.aimClass}</Badge>
          <Badge variant="neutral">Impacto: {overview.combat.evaluation.impactClass}</Badge>
          <Badge variant={streakVariant}>{streakLabel}</Badge>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-body sm:grid-cols-4">
          <div>
            <dt className="text-text-secondary">Maior seq. de vitórias</dt>
            <dd className="font-hud text-body-lg text-text-primary">{longestWin}</dd>
          </div>
          <div>
            <dt className="text-text-secondary">Maior seq. de derrotas</dt>
            <dd className="font-hud text-body-lg text-text-primary">{longestLoss}</dd>
          </div>
          <div>
            <dt className="text-text-secondary">Partidas</dt>
            <dd className="font-hud text-body-lg text-text-primary">{metrics.matches}</dd>
          </div>
          <div>
            <dt className="text-text-secondary">Rounds</dt>
            <dd className="font-hud text-body-lg text-text-primary">{metrics.rounds}</dd>
          </div>
        </dl>
      </Card>

      {overview.combat.coaching_hooks.length > 0 ? (
        <Card label="Hooks de coaching">
          <ul className="flex list-disc flex-col gap-1 pl-5 text-body text-text-secondary">
            {overview.combat.coaching_hooks.map((hook) => (
              <li key={hook}>{hook}</li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

export function MatchesTab({
  matches,
  region,
}: {
  readonly matches: readonly MatchSummary[];
  readonly region: string;
}) {
  if (matches.length === 0) {
    return (
      <EmptyState
        title="Sem partidas"
        description="Nenhuma partida competitiva concluída recente foi encontrada."
      />
    );
  }

  return (
    <MatchHistoryTable
      matches={matches.map((match) => ({
        id: match.matchId,
        agent: match.agent,
        map: match.map,
        result: match.result,
        scoreTeam: match.score.us,
        scoreEnemy: match.score.them,
        kills: match.kills,
        deaths: match.deaths,
        assists: match.assists,
        kd: displayKd(match.kills, match.deaths),
        acs: match.acs,
        hsPercentage: match.hsPercentage,
        href: `/matches/${match.matchId}?region=${region}`,
      }))}
    />
  );
}

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
            <TableCell numeric>{formatPct(row.avgHsPercentage)}</TableCell>
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

export function AgentsTab({ agents }: { readonly agents: readonly AgentStat[] }) {
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

export function MapsTab({ maps }: { readonly maps: readonly MapStat[] }) {
  const profiles = buildMapCardProfiles(maps);

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
          />
        ))}
      </div>
      <p className="font-hud text-label uppercase text-text-secondary">
        Referência de benchmark: {MAIN_WINRATE_THRESHOLD}% WR — split ATK/DEF chega com o
        endpoint de detalhe por mapa.
      </p>
      <GroupedStatTable rows={maps} keyLabel="Mapa" />
    </div>
  );
}

export interface PlayerProfileViewProps {
  readonly overview: PlayerOverview;
  /** Slot de ação do header (ex.: botão Seguir — injetado pela página). */
  readonly headerAction?: ReactNode;
}

export function PlayerProfileView({ overview, headerAction }: PlayerProfileViewProps) {
  const { player } = overview;

  const items: TabItem[] = [
    { id: 'overview', label: 'Visão Geral', content: <OverviewTab overview={overview} /> },
    {
      id: 'matches',
      label: 'Partidas',
      content: <MatchesTab matches={overview.matches} region={player.region} />,
    },
    {
      id: 'agents',
      label: 'Agentes',
      content: <AgentsTab agents={overview.agents} />,
    },
    {
      id: 'maps',
      label: 'Mapas',
      content: <MapsTab maps={overview.maps} />,
    },
  ];

  return (
    <div data-player-profile className="flex flex-col gap-6">
      <PlayerHeader
        name={player.name}
        tag={player.tag}
        meta={[
          { label: 'Região', value: player.region.toUpperCase() },
          { label: 'Plataforma', value: player.platform.toUpperCase() },
        ]}
        actions={headerAction}
      />

      <Tabs items={items} ariaLabel="Seções do perfil" />
    </div>
  );
}
