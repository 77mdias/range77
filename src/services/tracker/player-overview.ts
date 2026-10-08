import { loadAppEnv, requireEnv } from '@/config/env';
import { COMPETITIVE_QUEUE_ID, type HenrikDevMatchV4 } from '@/contracts/henrikdev';
import type {
  AgentStat,
  MapStat,
  MatchSummary,
  StreakSummary,
  TrendSummary,
} from '@/contracts/tracker';
import { buildTrackerAggregations } from '@/services/analytics/tracker-aggregations';
import {
  buildCombatInsightFromMatches,
  DEFAULT_MATCH_SAMPLE_SIZE,
  PlayerNoMatchesError,
  type PlayerCombatInsight,
} from '@/services/coaching/player-combat';
import {
  createHenrikDevClient,
  type HenrikDevClient,
} from '@/services/henrikdev/client';
import { normalizeMatchesToSummaries } from '@/services/henrikdev/normalize-tracker';
import {
  createCombatSnapshotStore,
  type CombatSnapshotStore,
} from '@/lib/db/combat-snapshot-store';

/**
 * PASSO 3 — IMPLEMENTAÇÃO: visão geral do jogador em UM fetch.
 *
 * Busca a amostra de partidas uma única vez e deriva, do MESMO payload:
 *   - o envelope de coaching existente (3 camadas + avaliação);
 *   - o histórico normalizado (MatchSummary[]);
 *   - agregações por agente/mapa, streaks e tendência de ACS.
 *
 * A persistência do snapshot de combate (`/history`) acontece aqui, de forma
 * best-effort, reaproveitando `buildCombatInsightFromMatches`.
 */

export interface PlayerOverview {
  readonly player: {
    readonly region: string;
    readonly name: string;
    readonly tag: string;
    readonly platform: 'pc';
  };
  readonly combat: PlayerCombatInsight;
  readonly matches: readonly MatchSummary[];
  readonly agents: readonly AgentStat[];
  readonly maps: readonly MapStat[];
  readonly streaks: StreakSummary;
  readonly trend: TrendSummary;
}

export interface BuildPlayerOverviewParams {
  readonly region: string;
  readonly name: string;
  readonly tag: string;
  readonly size?: number;
  /** Client injetado (testes). Sem ele, cria um com HENRIKDEV_API_KEY do env. */
  readonly client?: HenrikDevClient;
  readonly snapshotStore?: CombatSnapshotStore | null;
}

export async function buildPlayerOverview(
  params: BuildPlayerOverviewParams,
): Promise<PlayerOverview> {
  const { region, name, tag, size = DEFAULT_MATCH_SAMPLE_SIZE } = params;

  const store =
    params.snapshotStore === null
      ? null
      : (params.snapshotStore ?? createCombatSnapshotStore());

  const client =
    params.client ??
    createHenrikDevClient({ apiKey: requireEnv(loadAppEnv(), 'HENRIKDEV_API_KEY') });

  const rawMatches: readonly HenrikDevMatchV4[] = await client.fetchPlayerMatches({
    affinity: region.toLowerCase(),
    platform: 'pc',
    name,
    tag,
    mode: COMPETITIVE_QUEUE_ID,
    size,
  });

  const combat = await buildCombatInsightFromMatches(rawMatches, {
    region,
    name,
    tag,
    size,
    snapshotStore: store,
  });

  const matches = normalizeMatchesToSummaries(rawMatches, { name, tag }, region);
  if (matches.length === 0) {
    // `buildCombatInsightFromMatches` já garante ≥1 partida válida; guarda extra.
    throw new PlayerNoMatchesError();
  }

  const { agents, maps, streaks, trend } = buildTrackerAggregations(matches);

  return {
    player: { region: region.toLowerCase(), name, tag, platform: 'pc' },
    combat,
    matches,
    agents,
    maps,
    streaks,
    trend,
  };
}
