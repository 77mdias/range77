import {
  AgentCard,
  BenchmarkBar,
  MapCard,
  type AgentCardProps,
  type AgentProgress,
} from '@/components/agents';
import { CoachingTip } from '@/components/ui/coaching-tip';
import { EmptyState } from '@/components/ui/states';
import { TagLabel } from '@/components/ui/tag-label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/table';
import { agentRole } from '@/lib/agent-roles';
import { agentIconSrc, mapSplashSrc } from '@/lib/valorant-assets';
import {
  MAIN_WINRATE_THRESHOLD,
  buildAgentCardProfiles,
  buildMapCardProfiles,
  buildMapPoolAdvice,
  sortAgentProfiles,
  type AgentCardProfile,
  type AgentSortKey,
  type AgentTier,
  type MapPoolStatus,
  type SortDirection,
} from '@/services/analytics/agent-map-profiles';
import type { AgentSignature } from '@/services/analytics/agent-signatures';
import type { BenchmarkMetric } from '@/services/analytics/benchmark';
import type { MapSideStat } from '@/services/analytics/map-sides';
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

function toAgentCardProps(
  profile: AgentCardProfile,
  signature: AgentSignature | undefined,
): AgentCardProps {
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

  // Assinatura tática por papel: no máximo uma barra; ausente quando o dado
  // real não é computável (nada é fabricado).
  const progresses: readonly AgentProgress[] =
    signature === undefined
      ? []
      : [
          {
            label: signature.label,
            percent: signature.percent,
            displayValue: signature.displayValue,
          },
        ];

  return {
    name: profile.name,
    role: agentRole(profile.name) ?? undefined,
    matches: profile.matches,
    winRate: `${profile.winRatePercent}%`,
    tier: profile.tier,
    tierLabel: TIER_LABELS[profile.tier],
    portraitSrc: agentIconSrc(profile.name) ?? undefined,
    stats: [
      { label: 'K/D Ratio', value: profile.kdRatio.toFixed(2), delta: profile.kdDelta },
      { label: 'Avg ACS', value: String(profile.avgAcs), delta: profile.acsDelta },
      { label: 'Headshot %', value: profile.hsPercent === null ? '—' : `${profile.hsPercent}%` },
    ],
    progresses,
    tacticalNote,
  };
}

/**
 * Bloco "Benchmark Calibration" (Stitch): compara as métricas reais do
 * jogador com a referência do elo em barras duplas. Oculto sem amostra.
 */
function BenchmarkCalibration({
  metrics,
  eloLabel,
}: {
  readonly metrics: readonly BenchmarkMetric[];
  readonly eloLabel?: string;
}) {
  if (metrics.length === 0) {
    return null;
  }

  const eloName = eloLabel ?? 'do elo';

  return (
    <section
      data-component="benchmark-calibration"
      className="flex flex-col gap-3 rounded-md border border-line bg-surface p-4"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div className="min-w-0">
          <TagLabel withPrefix={false}>Benchmark calibration</TagLabel>
          <h3 className="font-display text-heading-sm font-bold uppercase tracking-tight text-text-primary">
            Comparativo direto: player vs média {eloName}
          </h3>
        </div>
        <div className="flex items-center gap-3 font-hud text-label uppercase text-text-secondary">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block size-3 rounded-sm bg-accent" />
            <span className="font-bold text-text-primary">Player</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block size-3 rounded-sm bg-surface-highest" />
            <span>Média elo</span>
          </span>
        </div>
      </header>
      <div className="grid gap-3 md:grid-cols-2">
        {metrics.map((metric) => (
          <BenchmarkBar
            key={metric.key}
            label={metric.label}
            playerValue={metric.playerValue}
            eloValue={metric.eloValue}
            playerPercent={metric.playerPercent}
            eloPercent={metric.eloPercent}
            above={metric.above}
            scale={metric.scale}
          />
        ))}
      </div>
    </section>
  );
}

export function AgentsTab({
  agents,
  signatures,
  benchmark,
  eloBase,
  sort = 'acs',
  direction = 'desc',
}: {
  readonly agents: readonly GroupedStat[];
  readonly signatures?: ReadonlyMap<string, AgentSignature>;
  readonly benchmark?: readonly BenchmarkMetric[];
  /** Elo de referência (nome exibido) usado no título do benchmark. */
  readonly eloBase?: string;
  /** Métrica de ordenação da matriz (padrão: ACS). */
  readonly sort?: AgentSortKey;
  /** Direção da ordenação (padrão: decrescente). */
  readonly direction?: SortDirection;
}) {
  const profiles = sortAgentProfiles(buildAgentCardProfiles(agents), sort, direction);

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
          <AgentCard
            key={profile.name}
            {...toAgentCardProps(profile, signatures?.get(profile.name))}
          />
        ))}
      </div>
      <BenchmarkCalibration metrics={benchmark ?? []} eloLabel={eloBase} />
    </div>
  );
}

const STATUS_LABELS: Record<MapPoolStatus, string> = {
  best: 'Melhor mapa',
  good: 'Positivo',
  stable: 'Estável',
  neutral: 'Neutro',
  unfavorable: 'Desfavorável',
  worst: 'Pior mapa',
};

export function MapsTab({
  maps,
  sides,
}: {
  readonly maps: readonly GroupedStat[];
  /** Splits DEF/ATK reais por mapa (`buildMapSideStats`); ausente → sem split. */
  readonly sides?: ReadonlyMap<string, MapSideStat>;
}) {
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
      <div className="min-w-0 overflow-x-auto pb-2" data-map-cards-scroll>
        <div
          className="grid grid-flow-col grid-rows-1 gap-3 [grid-auto-columns:calc((100%_-_0.75rem)/2)] md:[grid-auto-columns:calc((100%_-_1.5rem)/3)] lg:[grid-auto-columns:calc((100%_-_3.75rem)/6)]"
          data-map-cards
        >
          {profiles.map((profile) => {
            const side = sides?.get(profile.name);
            return (
              <MapCard
                key={profile.name}
                map={profile.name}
                status={profile.status}
                statusLabel={STATUS_LABELS[profile.status]}
                winRate={`${profile.winRatePercent}%`}
                matches={profile.matches}
                record={{ wins: profile.wins, losses: profile.losses }}
                winPercent={profile.winRatePercent}
                attackPercent={side?.attackPercent ?? undefined}
                defensePercent={side?.defensePercent ?? undefined}
                imageSrc={mapSplashSrc(profile.name) ?? undefined}
              />
            );
          })}
        </div>
      </div>
      {advice !== null ? (
        <CoachingTip
          title="Protocol advice: map pool deficit engine"
          priority={advice.worstWinRate < 45 ? 'critica' : 'alta'}
          impact={
            <span>
              Referência de benchmark: {MAIN_WINRATE_THRESHOLD}% WR · status do pool por faixa de
              win rate real
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
