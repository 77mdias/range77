import { loadAppEnv, requireEnv } from '@/config/env';
import type { CoachInsight } from '@/contracts/coach';
import {
  COMPETITIVE_QUEUE_ID,
  type HenrikDevMatchV4,
} from '@/contracts/henrikdev';
import {
  buildCombatCoachInsight,
  calculateCombatMetrics,
  type AimClass,
  type CombatRawMetrics,
  type ImpactClass,
} from '@/services/analytics/combat';
import {
  createHenrikDevClient,
  type HenrikDevClient,
} from '@/services/henrikdev/client';
import { normalizeMatchesToCombat } from '@/services/henrikdev/normalize';
import {
  createCombatSnapshotStore,
  type CombatSnapshotRecord,
  type CombatSnapshotStore,
} from '@/lib/db/combat-snapshot-store';

/**
 * PASSO 3 — IMPLEMENTAÇÃO: orquestração de coaching do jogador.
 *
 * Pipeline: HenrikDev (client injetável — DIP) → normalização → analytics
 * pura → envelope CoachInsight de 3 camadas + identidade/avaliação.
 *
 * A chave `HENRIKDEV_API_KEY` só é exigida quando nenhum client é injetado
 * (produção/rota real); testes injetam um client falso e rodam sem rede.
 */

export class PlayerNoMatchesError extends Error {
  constructor(
    message = 'Nenhuma partida competitiva válida encontrada para este jogador no histórico recente.',
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
}

export interface BuildPlayerCombatInsightParams {
  readonly region: string;
  readonly name: string;
  readonly tag: string;
  readonly size?: number;
  /** Client injetado (testes). Sem ele, cria um com HENRIKDEV_API_KEY do env. */
  readonly client?: HenrikDevClient;
  /**
   * Store de snapshots: `undefined` cria o padrão (exige DATABASE_URL —
   * fail fast); `null` desliga a persistência explicitamente (contextos
   * sem DB); implementação própria é injetada nos testes.
   */
  readonly snapshotStore?: CombatSnapshotStore | null;
}

export async function buildPlayerCombatInsight(
  params: BuildPlayerCombatInsightParams,
): Promise<PlayerCombatInsight> {
  const { region, name, tag, size = DEFAULT_MATCH_SAMPLE_SIZE } = params;

  // Fail fast de CONFIGURAÇÃO antes de qualquer I/O caro: um problema de
  // variável de ambiente deve falhar em milissegundos (com remediação),
  // nunca depois de um fetch de 10s na HenrikDev.
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

  return buildCombatInsightFromMatches(rawMatches, {
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
  const { region, name, tag, size, snapshotStore } = params;

  const combatMatches = normalizeMatchesToCombat(rawMatches, { name, tag });
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
