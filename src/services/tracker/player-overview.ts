import type {
  AgentStat,
  MapStat,
  MatchSummary,
  RrHistoryPoint,
  StreakSummary,
  TrendSummary,
} from '@/contracts/tracker';
import type { ActSampleOptions } from '@/services/analytics/act-window';
import { buildTrackerAggregations } from '@/services/analytics/tracker-aggregations';
import {
  buildCombatInsightFromCombatStats,
  DEFAULT_MATCH_SAMPLE_SIZE,
  PlayerNoMatchesError,
  resolveSnapshotStore,
  type PlayerCombatInsight,
} from '@/services/coaching/player-combat';
import type { PlayerRankSummary } from '@/services/henrikdev/normalize-tracker';
import type { CombatSnapshotStore } from '@/lib/db/combat-snapshot-store';
import type { TrackerSource } from '@/services/tracker/source';
import { getTrackerSource } from '@/services/tracker/sources';

/**
 * PASSO 3 — IMPLEMENTAÇÃO: visão geral do jogador sobre UMA amostra da fonte.
 *
 * Pede a amostra normalizada à `TrackerSource` (padrão: simulada; HenrikDev
 * guardada) e deriva, do MESMO conjunto:
 *   - o envelope de coaching existente (3 camadas + avaliação);
 *   - o histórico normalizado (MatchSummary[]);
 *   - agregações por agente/mapa, streaks e tendência de ACS.
 *
 * A persistência do snapshot de combate (`/history`) acontece aqui, de forma
 * best-effort — só para fontes reais (o mock não grava snapshot).
 */

export interface PlayerOverview {
  readonly player: {
    readonly region: string;
    readonly name: string;
    readonly tag: string;
    readonly platform: 'pc';
    /** Nível de conta (conta); `null` se indisponível. */
    readonly level: number | null;
    /** Ícone do cartão de jogador ; `null` se indisponível. */
    readonly cardSrc: string | null;
  };
  /** Ranque atual (v2 mmr: tier + imagem do elo + RR no tier); `null` se falhou. */
  readonly rank: PlayerRankSummary | null;
  readonly combat: PlayerCombatInsight;
  readonly matches: readonly MatchSummary[];
  readonly agents: readonly AgentStat[];
  readonly maps: readonly MapStat[];
  readonly streaks: StreakSummary;
  readonly trend: TrendSummary;
  /** Trajetória de RR (cronológica). Vazia se o MMR history não estiver disponível. */
  readonly rrHistory: readonly RrHistoryPoint[];
}

export interface BuildPlayerOverviewParams {
  readonly region: string;
  readonly name: string;
  readonly tag: string;
  readonly size?: number;
  /**
   * Amostra dinâmica por ATO (tela Breakdown): a fonte resolve quantas
   * partidas trazer (teto + fallback). Tem precedência sobre `size`.
   */
  readonly actSample?: ActSampleOptions;
  /** Fonte injetada (testes). Padrão: `getTrackerSource()`. */
  readonly source?: TrackerSource;
  readonly snapshotStore?: CombatSnapshotStore | null;
}

export async function buildPlayerOverview(
  params: BuildPlayerOverviewParams,
): Promise<PlayerOverview> {
  const { region, name, tag, size = DEFAULT_MATCH_SAMPLE_SIZE } = params;

  const source = params.source ?? getTrackerSource();
  // Fail fast de configuração (DATABASE_URL) ANTES do I/O da amostra.
  const store = resolveSnapshotStore(source, params.snapshotStore);

  const sample = await source.getPlayerSample({
    region,
    name,
    tag,
    size,
    ...(params.actSample !== undefined ? { actSample: params.actSample } : {}),
  });

  // O envelope de combate/snapshot fica na janela padrão (5) mesmo no modo por
  // ato: a tela Breakdown exibe só as PARTIDAS (janela maior), e manter o
  // snapshot consistente com o perfil evita "ruído" na evolução (`/history`).
  // No modo fixo preserva o `size` pedido (comportamento histórico).
  const combatStats =
    params.actSample !== undefined
      ? sample.combat.slice(0, DEFAULT_MATCH_SAMPLE_SIZE)
      : sample.combat;
  const combatSampleSize = params.actSample !== undefined ? combatStats.length : size;

  const combat = await buildCombatInsightFromCombatStats(combatStats, {
    region,
    name,
    tag,
    size: combatSampleSize,
    snapshotStore: store,
  });

  const { matches } = sample;
  if (matches.length === 0) {
    // `buildCombatInsightFromCombatStats` já garante ≥1 partida válida; guarda extra.
    throw new PlayerNoMatchesError();
  }

  const { agents, maps, streaks, trend } = buildTrackerAggregations(matches);

  return {
    player: {
      region: region.toLowerCase(),
      name,
      tag,
      platform: 'pc',
      level: sample.level,
      cardSrc: sample.cardSrc,
    },
    rank: sample.rank,
    combat,
    matches,
    agents,
    maps,
    streaks,
    trend,
    rrHistory: sample.rrHistory,
  };
}
