import type { CoachInsight } from '@/contracts/coach';
import type { HenrikDevMatchV4, MatchCombatStats } from '@/contracts/henrikdev';
import {
  buildCombatCoachInsight,
  calculateCombatMetrics,
  type AimClass,
  type CombatRawMetrics,
  type ImpactClass,
} from '@/services/analytics/combat';
import type { HenrikDevClient } from '@/services/henrikdev/client';
import { normalizeMatchesToCombat } from '@/services/henrikdev/normalize';
import type { TacticalVectors } from '@/services/analytics/tactical-vectors';
import type { TrackerSource } from '@/services/tracker/source';
import { createHenrikDevSource, getTrackerSource } from '@/services/tracker/sources';
import {
  createCombatSnapshotStore,
  type CombatSnapshotRecord,
  type CombatSnapshotStore,
} from '@/lib/db/combat-snapshot-store';

/**
 * PASSO 3 — IMPLEMENTAÇÃO: orquestração de coaching do jogador.
 *
 * Pipeline: `TrackerSource` (porta injetável — DIP; padrão simulado) →
 * amostra canônica de combate → analytics pura → envelope CoachInsight de 3
 * camadas + identidade/avaliação.
 */

export class PlayerNoMatchesError extends Error {
  constructor(
    message = 'Nenhuma partida competitiva válida encontrada para este jogador.',
  ) {
    super(message);
    this.name = 'PlayerNoMatchesError';
  }
}

/**
 * Amostra padrão: 5 partidas. O payload v4 de partidas COMPLETAS é pesado
 * (MBs por resposta); 5 equilibrara latência do chatbot e significância
 * estatística. Ajustável via ?size= (1–10).
 */
export const DEFAULT_MATCH_SAMPLE_SIZE = 5;

export interface PlayerCombatInsight extends CoachInsight<CombatRawMetrics> {
  readonly player: {
    readonly region: string;
    readonly name: string;
    readonly tag: string;
    readonly platform: 'pc';
  };
  readonly evaluation: {
    readonly aimClass: AimClass;
    readonly impactClass: ImpactClass;
  };
  /** Vetores táticos (só rótulos/números); ausente quando a fonte não os fornece. */
  readonly tactical?: TacticalVectors;
}

export interface BuildPlayerCombatInsightParams {
  readonly region: string;
  readonly name: string;
  readonly tag: string;
  readonly size?: number;
  /** Fonte do tracker. Padrão: `getTrackerSource()` (`TRACKER_DATA_SOURCE`). */
  readonly source?: TrackerSource;
  /** Atalho legado (testes): client HenrikDev → fonte `henrikdev`. */
  readonly client?: HenrikDevClient;
  /**
   * Store de snapshots: `undefined` cria o padrão (exige DATABASE_URL —
   * fail fast) para fontes reais e DESLIGA para a fonte simulada; `null`
   * desliga explicitamente; implementação própria é injetada nos testes.
   */
  readonly snapshotStore?: CombatSnapshotStore | null;
}

/**
 * Resolve o store de snapshots: o cache durável (Neon) é só das fontes reais —
 * a fonte simulada não polui a evolução (`/history`) com dados fabricados.
 */
export function resolveSnapshotStore(
  source: TrackerSource,
  snapshotStore: CombatSnapshotStore | null | undefined,
): CombatSnapshotStore | null {
  if (snapshotStore === null) {
    return null;
  }
  if (snapshotStore !== undefined) {
    return snapshotStore;
  }
  return source.kind === 'mock' ? null : createCombatSnapshotStore();
}

export async function buildPlayerCombatInsight(
  params: BuildPlayerCombatInsightParams,
): Promise<PlayerCombatInsight> {
  const { region, name, tag, size = DEFAULT_MATCH_SAMPLE_SIZE } = params;

  const source =
    params.source ??
    (params.client !== undefined ? createHenrikDevSource(params.client) : getTrackerSource());

  // Fail fast de CONFIGURAÇÃO antes de qualquer I/O caro: um problema de
  // variável de ambiente deve falhar em milissegundos (com remediação),
  // nunca depois de um fetch de 10s upstream.
  const store = resolveSnapshotStore(source, params.snapshotStore);

  const sample = await source.getPlayerSample({ region, name, tag, size });

  return buildCombatInsightFromCombatStats(sample.combat, {
    region,
    name,
    tag,
    size,
    snapshotStore: store,
  });
}

export interface FinalizeCombatInsightParams {
  readonly region: string;
  readonly name: string;
  readonly tag: string;
  readonly size: number;
  /** `null` desliga a persistência; implementação injetável nos testes. */
  readonly snapshotStore: CombatSnapshotStore | null;
  readonly tactical?: TacticalVectors | null;
}

/**
 * Normaliza as partidas JÁ buscadas, calcula as métricas/envelope de coaching
 * e persiste um snapshot (best-effort). Extraído para a rota `/overview`
 * reaproveitar a MESMA partida buscada, sem um segundo fetch na HenrikDev.
 */
export async function buildCombatInsightFromMatches(
  rawMatches: readonly HenrikDevMatchV4[],
  params: FinalizeCombatInsightParams,
): Promise<PlayerCombatInsight> {
  const { name, tag } = params;
  return buildCombatInsightFromCombatStats(normalizeMatchesToCombat(rawMatches, { name, tag }), params);
}

/**
 * Calcula as métricas/envelope de coaching sobre a amostra canônica de
 * combate JÁ normalizada (qualquer fonte) e persiste um snapshot
 * (best-effort).
 */
export async function buildCombatInsightFromCombatStats(
  combatMatches: readonly MatchCombatStats[],
  params: FinalizeCombatInsightParams,
): Promise<PlayerCombatInsight> {
  const { region, name, tag, size, snapshotStore, tactical } = params;

  if (combatMatches.length === 0) {
    throw new PlayerNoMatchesError();
  }

  // Funções puras: recomputar `calculateCombatMetrics` aqui é barato e evita
  // alterar o contrato do envelope de 3 camadas.
  const metrics = calculateCombatMetrics(combatMatches);
  const insight = buildCombatCoachInsight(combatMatches);

  const result: PlayerCombatInsight = {
    ...insight,
    player: { region: region.toLowerCase(), name, tag, platform: 'pc' },
    evaluation: {
      aimClass: metrics.evaluation.aimClass,
      impactClass: metrics.evaluation.impactClass,
    },
    // Chave omitida sem tactical: payload idêntico ao anterior.
    ...(tactical != null ? { tactical } : {}),
  };

  // Write-through best-effort: falhas de ESCRITA não derrubam o envelope.
  if (snapshotStore !== null) {
    const record: CombatSnapshotRecord = {
      region: result.player.region,
      name: result.player.name,
      tag: result.player.tag,
      nameKey: result.player.name.toLowerCase(),
      tagKey: result.player.tag.toLowerCase(),
      sampleSize: size,
      kdr: result.raw_metrics.kdr,
      kpr: result.raw_metrics.kpr,
      acs: result.raw_metrics.acs,
      hsPercentage: result.raw_metrics.hsPercentage ?? null,
      kast: result.raw_metrics.kast ?? null,
      firstBloods: result.raw_metrics.firstBloods ?? null,
      firstDeaths: result.raw_metrics.firstDeaths ?? null,
      matches: result.raw_metrics.matches,
      rounds: result.raw_metrics.rounds,
      aimClass: result.evaluation.aimClass,
      impactClass: result.evaluation.impactClass,
      // Entries presentes estão sempre definidas (chaves ausentes foram omitidas).
      contextualRating: { ...result.contextual_rating } as Record<string, string>,
      coachingHooks: [...result.coaching_hooks],
    };
    try {
      await snapshotStore.insertSnapshot(record);
    } catch (error) {
      console.warn('[player-combat] snapshot não persistido (best-effort):', error);
    }
  }

  return result;
}
