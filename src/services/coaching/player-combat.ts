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

/** Amostra padrão: 10 partidas (máximo por requisição na v4). */
export const DEFAULT_MATCH_SAMPLE_SIZE = 10;

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
}

export async function buildPlayerCombatInsight(
  params: BuildPlayerCombatInsightParams,
): Promise<PlayerCombatInsight> {
  const { region, name, tag, size = DEFAULT_MATCH_SAMPLE_SIZE } = params;

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

  const combatMatches = normalizeMatchesToCombat(rawMatches, { name, tag });
  if (combatMatches.length === 0) {
    throw new PlayerNoMatchesError();
  }

  // Funções puras: recomputar `calculateCombatMetrics` aqui é barato e evita
  // alterar o contrato do envelope de 3 camadas.
  const metrics = calculateCombatMetrics(combatMatches);
  const insight = buildCombatCoachInsight(combatMatches);

  return {
    ...insight,
    player: { region: region.toLowerCase(), name, tag, platform: 'pc' },
    evaluation: {
      aimClass: metrics.evaluation.aimClass,
      impactClass: metrics.evaluation.impactClass,
    },
  };
}
