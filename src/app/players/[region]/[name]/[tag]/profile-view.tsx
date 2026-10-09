import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { MatchRow } from '@/components/ui/match-row';
import { Sparkline } from '@/components/ui/sparkline';
import { StatCard } from '@/components/ui/stat-card';
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
import type { GroupedStat, MatchSummary } from '@/contracts/tracker';
import type { PlayerOverview } from '@/services/tracker/player-overview';

/**
 * PlayerProfileView — apresentação PURA (síncrona) do perfil: header do
 * jogador, StatCards do envelope de combate, streaks/avaliação e as abas
 * Visão Geral | Partidas | Agentes | Mapas. Separada da página assíncrona
 * para ser testável com `renderToStaticMarkup`.
 */

function formatPct(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${value}%`;
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

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="KDR" value={metrics.kdr} />
        <StatCard label="HS%" value={formatPct(metrics.hsPercentage)} />
        <StatCard
          label="ACS"
          value={metrics.acs}
          sparkline={<Sparkline points={overview.trend.perMatch} ariaLabel="Tendência de ACS" />}
        />
        <StatCard label="KAST" value={formatPct(metrics.kast)} />
      </div>

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
    <Card label={`Últimas ${matches.length} partidas`}>
      <ul className="-mx-5 -my-5 divide-y divide-line">
        {matches.map((match) => (
          <li key={match.matchId}>
            <MatchRow
              map={match.map}
              result={match.result}
              kills={match.kills}
              deaths={match.deaths}
              assists={match.assists}
              acs={match.acs}
              hsPercentage={match.hsPercentage ?? undefined}
              playedAt={match.startedAt}
              href={`/matches/${match.matchId}?region=${region}`}
            />
          </li>
        ))}
      </ul>
    </Card>
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
      content: <GroupedStatTable rows={overview.agents} keyLabel="Agente" />,
    },
    {
      id: 'maps',
      label: 'Mapas',
      content: <GroupedStatTable rows={overview.maps} keyLabel="Mapa" />,
    },
  ];

  return (
    <div data-player-profile className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <p className="text-label uppercase text-accent">{player.region.toUpperCase()} · PC</p>
          <h1 className="font-display text-display-md uppercase text-text-primary" data-player-name>
            {player.name} <span className="text-text-secondary">#{player.tag}</span>
          </h1>
        </div>
        {headerAction !== undefined ? headerAction : null}
      </header>

      <Tabs items={items} ariaLabel="Seções do perfil" />
    </div>
  );
}
