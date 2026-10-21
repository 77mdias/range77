import type { ReactNode } from 'react';
import { AiCoachTerminal } from '@/components/ai';
import { RrTrendChart, TrendLine } from '@/components/charts';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { CoachingTip } from '@/components/ui/coaching-tip';
import { KpiTile } from '@/components/ui/kpi-tile';
import {
  InsightList,
  type InsightItem,
} from '@/components/ui/insight-list';
import { SectionHeader } from '@/components/ui/section-header';
import { EmptyState } from '@/components/ui/states';
import { MatchHistoryTable, PlayerHeader, type MatchHistoryEntry } from '@/components/player';
import { buildAgentCardProfiles } from '@/services/analytics/agent-map-profiles';
import { computeFirstBloodRate, computeWinrate } from '@/services/analytics/tracker-aggregations';
import { computeRrNet, indexRrDeltaByMatchId } from '@/services/analytics/rr-trend';
import { agentIconSrc } from '@/lib/valorant-assets';
import { rankSnapshotFromOverview } from '@/lib/recents/recent-players';
import type { MatchSummary } from '@/contracts/tracker';
import type { PlayerOverview } from '@/services/tracker/player-overview';
import { ProfileAiSandbox } from './ai-sandbox';
import { RecentRankSync } from './recent-rank-sync';

/**
 * PlayerProfileView — tela VISÃO GERAL do jogador (Stitch
 * "Visão Geral do Jogador & AI Coaching Hub"): faixa de contexto, header de
 * identidade (cartão/nível/ranque reais), strip de 6 KPIs, workspace 8/4
 * (trajetória de RR + histórico recente + motor de insights | hub de
 * coaching IA) e faixa de status da pipeline. Apresentação PURA: todo
 * cálculo vem de `services/analytics`.
 */

function formatPct(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${value}%`;
}

/** K/D de exibição (presentacional; divisão por zero → kills). */
function displayKd(kills: number, deaths: number): number {
  return deaths === 0 ? kills : Math.round((kills / deaths) * 100) / 100;
}

/** Linhas do histórico (compartilhado entre a visão geral e o breakdown). */
function toHistoryEntries(
  matches: readonly MatchSummary[],
  region: string,
  rrDeltas: ReadonlyMap<string, number> | undefined,
  player: { readonly name: string; readonly tag: string },
): MatchHistoryEntry[] {
  const viewer = encodeURIComponent(`${player.name}#${player.tag}`);
  return matches.map((match) => ({
    id: match.matchId,
    agent: match.agent,
    agentIconSrc: match.agent === null ? null : agentIconSrc(match.agent),
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
    href: `/matches/${match.matchId}?region=${region}&player=${viewer}`,
  }));
}

/**
 * Motor de insights (Stitch: "Pontos Fortes Computados" / "Pontos Críticos
 * Identificados") — SOMENTE classificações já computadas pelo analytics
 * (streaks, tendência, tiers de agente). Coluna sem item → cartão omitido.
 */
export function buildInsightColumns(overview: PlayerOverview): {
  readonly strengths: readonly InsightItem[];
  readonly weaknesses: readonly InsightItem[];
} {
  const strengths: InsightItem[] = [];
  const weaknesses: InsightItem[] = [];
  const { current, longestWin, longestLoss } = overview.streaks;
  const windowSize = overview.trend.perMatch.length;

  if (current.result === 'win' && current.length >= 2) {
    strengths.push({
      title: `sequência: ${current.length} vitórias`,
      description: `Maior sequência da janela: ${longestWin} vitórias. Mantenha a rotina pré-fila.`,
    });
  }
  if (overview.trend.direction === 'up') {
    strengths.push({
      title: `tendência ACS: +${overview.trend.delta}`,
      description: `De ${overview.trend.first} para ${overview.trend.last} ACS na janela de ${windowSize} partidas.`,
    });
  } else if (overview.trend.direction === 'down') {
    weaknesses.push({
      title: `tendência ACS: ${overview.trend.delta}`,
      description: `De ${overview.trend.first} para ${overview.trend.last} ACS na janela de ${windowSize} partidas — revise o aquecimento.`,
    });
  }

  for (const profile of buildAgentCardProfiles(overview.agents)) {
    if (profile.tier === 'main') {
      strengths.push({
        title: `main: ${profile.name}`,
        description: `${profile.winRatePercent}% WR em ${profile.matches} partidas — mantenha no pool aberto.`,
      });
    }
    if (profile.tier === 'bottleneck') {
      weaknesses.push({
        title: `gargalo: ${profile.name}`,
        description: `${profile.winRatePercent}% WR em ${profile.matches} partidas — revise kit e rotinas antes da fila.`,
      });
    }
  }

  if (longestLoss >= 3) {
    weaknesses.push({
      title: `sequência de derrotas: ${longestLoss}`,
      description: 'Pausas curtas entre sessões preservam a tomada de decisão.',
    });
  }

  return { strengths, weaknesses };
}

export function MatchesTab({
  matches,
  region,
  player,
  rrDeltas,
  limit,
}: {
  readonly matches: readonly MatchSummary[];
  readonly region: string;
  /** Riot ID do jogador buscado → links já levam a perspectiva `?player=`. */
  readonly player: { readonly name: string; readonly tag: string };
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
        description="Nenhuma partida competitiva concluída foi encontrada."
      />
    );
  }

  return <MatchHistoryTable matches={toHistoryEntries(visible, region, rrDeltas, player)} />;
}

export interface PlayerProfileViewProps {
  readonly overview: PlayerOverview;
  /** Slot de ação do header (ex.: botão Seguir — injetado pela página). */
  readonly headerAction?: ReactNode;
}

export function PlayerProfileView({ overview, headerAction }: PlayerProfileViewProps) {
  const { player } = overview;
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

  const rrDeltas = indexRrDeltaByMatchId(overview.rrHistory);
  const rrSeries = overview.rrHistory.map((point) => ({ rr: point.rr, result: point.result }));
  const lastRr = overview.rrHistory[overview.rrHistory.length - 1];
  const rrNet = computeRrNet(overview.rrHistory);
  const rrNetLabel = rrNet > 0 ? `NET: +${rrNet} RR` : `NET: ${rrNet} RR`;

  const rank = overview.rank;
  const rankTier = rank?.tier ?? lastRr?.tier ?? undefined;
  const rrInTier = rank?.rrInTier ?? lastRr?.rr ?? null;
  const { strengths, weaknesses } = buildInsightColumns(overview);

  return (
    <div data-player-profile className="flex flex-col">
      <RecentRankSync
        riotId={`${player.name}#${player.tag}`}
        region={player.region}
        {...rankSnapshotFromOverview(overview)}
      />
      {/* ── Faixa de contexto (só o que é real do ambiente) ─────────── */}
      <div
        data-context-strip
        className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line bg-surface-raised px-4 py-1.5 font-hud text-label uppercase text-text-secondary"
      >
        <div className="flex flex-wrap items-center gap-x-4">
          <span className="font-semibold text-text-primary">
            Região: {player.region.toUpperCase()}
          </span>
          <span>Pipeline: 3-layer</span>
          <span>Payload: camada 3 sintetizada</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4">
          <span className="inline-flex items-center gap-1.5 text-text-primary">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />
            HenrikDev API: OK
          </span>
          <span>Sync: cache</span>
        </div>
      </div>

      {/* ── Header de identidade ─────────────────────────────────────── */}
      <PlayerHeader
        name={player.name}
        tag={player.tag}
        avatarSrc={player.cardSrc ?? undefined}
        level={player.level ?? undefined}
        rank={rankTier}
        rankImageSrc={rank?.imageSrc ?? undefined}
        // O Riot ID só chega aqui após um lookup bem-sucedido na HenrikDev —
        // "verificado" significa exatamente isso (conta Riot resolvida).
        verified
        meta={[
          ...(rrInTier !== null ? [{ label: 'RR Pool', value: `${rrInTier} / 100` }] : []),
          { label: 'Roster', value: 'Competitivo 5v5' },
          { label: 'Amostra', value: `${metrics.matches} partidas` },
        ]}
        actions={headerAction}
      />

      {/* ── Strip de KPIs (3 linhas: label+meta, valor, trailing real) ─ */}
      <div className="w-full px-4 pt-6 md:px-6 xl:px-8">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6" data-kpi-strip>
          <KpiTile
            label="K/D Ratio"
            value={metrics.kdr}
            trailing={`${metrics.rounds} rounds`}
          />
          <KpiTile
            label="Win Rate"
            accent={`${overview.matches.length} GMS`}
            accentTone="neutral"
            value={`${winRate}%`}
            trailing={`${wins}W ${losses}D`}
          />
          <KpiTile label="Headshot %" value={formatPct(metrics.hsPercentage)} />
          <KpiTile
            label="ACS Médio"
            accent={trendAccent}
            accentTone={trendUp ? 'positive' : trendDown ? 'negative' : 'neutral'}
            value={metrics.acs}
            trailing="Combate"
          />
          <KpiTile
            label="KAST %"
            value={formatPct(metrics.kast)}
            trailing={`${metrics.rounds} rounds`}
          />
          <KpiTile
            label="First Blood / RD"
            value={firstBloodRate}
            trailing={
              metrics.firstDeaths === null
                ? undefined
                : `FB ${metrics.firstBloods ?? 0} / FD ${metrics.firstDeaths}`
            }
          />
        </div>
      </div>

      {/* ── Workspace 8/4 ───────────────────────────────────────────── */}
      <div className="grid w-full gap-4 px-4 py-6 md:px-6 xl:grid-cols-12 xl:px-8">
        {/* Coluna esquerda (8): telemetria + histórico + insights */}
        <div className="flex flex-col gap-4 xl:col-span-8">
          <Card
            label={`Trajetória RR • Últimas ${overview.rrHistory.length} partidas`}
            action={
              <span className="border border-line bg-surface-high px-1.5 py-0.5 font-hud text-label font-bold uppercase text-text-primary">
                {rrNetLabel}
              </span>
            }
          >
            <RrTrendChart series={rrSeries} />
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-2 font-hud text-label uppercase text-text-secondary">
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="size-2 rounded-full bg-accent" /> Vitória
                (+RR)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="size-2 rounded-full bg-text-primary" />{' '}
                Derrota (-RR)
              </span>
              {lastRr !== undefined ? (
                <span className="ml-auto font-bold text-text-primary">
                  Atual: {lastRr.rr} RR ({lastRr.tier})
                </span>
              ) : null}
            </div>
          </Card>

          <Card
            label="Últimas 5 partidas jogadas"
            action={
              <span className="font-hud text-label uppercase text-text-secondary">
                Camada 2 parsed
              </span>
            }
          >
            <MatchesTab
              matches={overview.matches}
              region={player.region}
              player={{ name: player.name, tag: player.tag }}
              rrDeltas={rrDeltas}
              limit={5}
            />
          </Card>

          <div className="grid gap-3 md:grid-cols-2" data-insight-columns>
            {strengths.length > 0 ? (
              <InsightList tone="strength" label="Pontos fortes computados" items={strengths} />
            ) : null}
            {weaknesses.length > 0 ? (
              <InsightList tone="weakness" label="Pontos críticos identificados" items={weaknesses} />
            ) : null}
          </div>

          <Card label="Tendência de ACS">
            <TrendLine values={overview.trend.perMatch} />
          </Card>

          <Card label="Avaliação da camada 2">
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
        </div>

        {/* Coluna direita (4): hub de coaching IA */}
        <div className="xl:col-span-4">
          <AiCoachTerminal
            status="Layer 3 online"
            title="Diagnóstico do Coach IA"
            scoreLine={`${metrics.matches} partidas analisadas • 3-layer`}
          >
            <div className="flex flex-col gap-3" data-coaching-tips>
              {overview.combat.coaching_hooks.map((hook) => (
                <CoachingTip key={hook} title="Protocol advice">
                  {hook}
                </CoachingTip>
              ))}
            </div>
            <div className="mt-4 border-t border-line pt-3">
              <SectionHeader
                title="Consultar IA"
                annotation="SANDBOX DEMO"
                className="mb-2"
              />
              <ProfileAiSandbox />
            </div>
          </AiCoachTerminal>
        </div>
      </div>

      {/* ── Faixa de status da pipeline ─────────────────────────────── */}
      <div
        data-pipeline-strip
        className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line bg-surface-raised px-4 py-2 font-hud text-label uppercase text-text-secondary"
      >
        <div className="flex flex-wrap items-center gap-x-4">
          <span className="font-bold text-text-primary">Match pipeline status:</span>
          <span>Fontes: HenrikDev</span>
          <span>Cálculo: analytics local</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4">
          <span>Região: {player.region.toUpperCase()}</span>
          <span className="font-bold text-text-primary">Cache: ativo</span>
        </div>
      </div>
    </div>
  );
}
