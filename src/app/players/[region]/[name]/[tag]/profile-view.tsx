import type { ReactNode } from 'react';
import { RrTrendChart, TrendLine } from '@/components/charts';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { CoachingTip } from '@/components/ui/coaching-tip';
import { KpiTile } from '@/components/ui/kpi-tile';
import { EmptyState } from '@/components/ui/states';
import { MatchHistoryTable, PlayerHeader, type MatchHistoryEntry } from '@/components/player';
import { computeFirstBloodRate, computeWinrate } from '@/services/analytics/tracker-aggregations';
import { computeRrNet, indexRrDeltaByMatchId } from '@/services/analytics/rr-trend';
import type { MatchSummary } from '@/contracts/tracker';
import type { PlayerOverview } from '@/services/tracker/player-overview';
import { AgentsMapsExplorer } from './agents-maps-explorer';
import { ProfileAiSandbox } from './ai-sandbox';

/**
 * PlayerProfileView — apresentação PURA (síncrona) do perfil no design
 * Stitch. Página única: PlayerHeader, strip de KPIs, tendência, avaliação e
 * histórico, seguidos da seção "Agentes & Mapas" (ilha client com filtros
 * reais) — nav por âncoras, sem abas. Separada da página assíncrona para ser
 * testável com `renderToStaticMarkup`.
 */

function formatPct(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${value}%`;
}

/** K/D de exibição (presentacional; divisão por zero → kills). */
function displayKd(kills: number, deaths: number): number {
  return deaths === 0 ? kills : Math.round((kills / deaths) * 100) / 100;
}

/** Linhas do histórico (compartilhado entre o overview e a aba Partidas). */
function toHistoryEntries(
  matches: readonly MatchSummary[],
  region: string,
  rrDeltas: ReadonlyMap<string, number> | undefined,
): MatchHistoryEntry[] {
  return matches.map((match) => ({
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
    rrDelta: rrDeltas?.get(match.matchId),
    href: `/matches/${match.matchId}?region=${region}`,
  }));
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

  const wins = overview.matches.filter((match) => match.result === 'win').length;
  const losses = overview.matches.length - wins;
  const winRate = computeWinrate(wins, overview.matches.length);
  const firstBloodRate = computeFirstBloodRate(metrics.firstBloods ?? 0, metrics.rounds);

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
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6" data-kpi-strip>
        <KpiTile label="K/D" value={metrics.kdr} trailing={`${metrics.matches} partidas`} />
        <KpiTile label="Win Rate" value={`${winRate}%`} trailing={`${wins}V ${losses}D`} />
        <KpiTile label="HS%" value={formatPct(metrics.hsPercentage)} />
        <KpiTile
          label="ACS"
          value={metrics.acs}
          accent={trendAccent}
          accentTone={trendUp ? 'positive' : trendDown ? 'negative' : 'neutral'}
        />
        <KpiTile label="KAST" value={formatPct(metrics.kast)} trailing={`${metrics.rounds} rounds`} />
        <KpiTile
          label="First Blood / R"
          value={firstBloodRate}
          trailing={
            metrics.firstDeaths === null
              ? undefined
              : `FB ${metrics.firstBloods ?? 0} / FD ${metrics.firstDeaths}`
          }
        />
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

      <Card label="Histórico Recente (últimos 5 jogos)">
        <MatchesTab
          matches={overview.matches}
          region={overview.player.region}
          rrDeltas={indexRrDeltaByMatchId(overview.rrHistory)}
          limit={5}
        />
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
        <Card label="Protocol advice">
          <div className="flex flex-col gap-3" data-coaching-tips>
            {overview.combat.coaching_hooks.map((hook) => (
              <CoachingTip key={hook} title="Protocol advice">
                {hook}
              </CoachingTip>
            ))}
          </div>
        </Card>
      ) : null}

      <Card
        label="Consultar IA (sandbox demo)"
        action={
          <span className="font-hud text-label uppercase text-text-secondary">
            Respostas simuladas
          </span>
        }
      >
        <ProfileAiSandbox />
      </Card>
    </div>
  );
}

export function MatchesTab({
  matches,
  region,
  rrDeltas,
  limit,
}: {
  readonly matches: readonly MatchSummary[];
  readonly region: string;
  /** Índice `matchId → ΔRR` (mmr-history) para a coluna RR. */
  readonly rrDeltas?: ReadonlyMap<string, number>;
  /** Máximo de linhas exibidas (ex.: 5 no histórico recente do overview). */
  readonly limit?: number;
}) {
  const visible = limit === undefined ? matches : matches.slice(0, limit);
  if (visible.length === 0) {
    return (
      <EmptyState
        title="Sem partidas"
        description="Nenhuma partida competitiva concluída recente foi encontrada."
      />
    );
  }

  return <MatchHistoryTable matches={toHistoryEntries(visible, region, rrDeltas)} />;
}

export interface PlayerProfileViewProps {
  readonly overview: PlayerOverview;
  /** Slot de ação do header (ex.: botão Seguir — injetado pela página). */
  readonly headerAction?: ReactNode;
}

/** Seções da página única do perfil (âncoras no topo, sem abas). */
const PROFILE_SECTIONS = [
  { id: 'visao-geral', label: 'Visão Geral' },
  { id: 'partidas', label: 'Partidas & Breakdown' },
  { id: 'agentes-mapas', label: 'Agentes & Mapas' },
] as const;

function ProfileSection({
  id,
  title,
  children,
}: {
  readonly id: string;
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <section id={id} data-profile-section={id} className="flex scroll-mt-24 flex-col gap-4">
      <h2 className="font-display text-heading-sm uppercase tracking-tight text-text-primary">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function PlayerProfileView({ overview, headerAction }: PlayerProfileViewProps) {
  const { player } = overview;
  const rrDeltas = indexRrDeltaByMatchId(overview.rrHistory);
  const currentRr = overview.rrHistory[overview.rrHistory.length - 1];

  const headerMeta = [
    { label: 'Região', value: player.region.toUpperCase() },
    { label: 'Plataforma', value: player.platform.toUpperCase() },
    ...(player.level !== null ? [{ label: 'Nível', value: String(player.level) }] : []),
    ...(currentRr !== undefined
      ? [{ label: 'RR Pool', value: `${currentRr.rr} / 100` }]
      : []),
  ];

  return (
    <div data-player-profile className="flex flex-col gap-8">
      <PlayerHeader
        name={player.name}
        tag={player.tag}
        level={player.level ?? undefined}
        rank={currentRr?.tier}
        // O Riot ID só chega aqui após um lookup bem-sucedido na HenrikDev —
        // "verificado" significa exatamente isso (conta Riot resolvida).
        verified
        meta={headerMeta}
        actions={headerAction}
      />

      <nav
        aria-label="Seções do perfil"
        data-profile-section-nav
        className="flex flex-wrap gap-1 border-b border-line"
      >
        {PROFILE_SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="relative -mb-px h-10 border-b-2 border-transparent px-4 font-hud text-label uppercase leading-10 tracking-wide text-text-secondary transition-colors duration-[var(--duration-fast)] ease-out-expo hover:text-text-primary"
          >
            {section.label}
          </a>
        ))}
      </nav>

      <ProfileSection id="visao-geral" title="Visão Geral">
        <OverviewTab overview={overview} />
      </ProfileSection>

      <ProfileSection id="partidas" title="Partidas & Breakdown">
        <MatchesTab matches={overview.matches} region={player.region} rrDeltas={rrDeltas} />
      </ProfileSection>

      <ProfileSection id="agentes-mapas" title="Agentes & Mapas">
        <AgentsMapsExplorer matches={overview.matches} />
      </ProfileSection>
    </div>
  );
}
