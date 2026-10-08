import { createCombatSnapshotStore, type CombatSnapshotRow, type CombatSnapshotStore } from '@/lib/db/combat-snapshot-store';
import {
  buildEvolutionCoachInsight,
  type EvolutionSnapshotInput,
  type PlayerEvolutionInsight,
} from '@/services/analytics/evolution';

/**
 * PASSO 3 — IMPLEMENTAÇÃO: orquestração de evolução do jogador.
 *
 * Lê os snapshots mais recentes do Neon (store injetável — DIP), garante a
 * pré-condição da analytics (≥2 snapshots, ordem cronológica) e monta o
 * envelope de evolução pronto para o chatbot.
 */

export class PlayerNoHistoryError extends Error {
  constructor(
    message = 'Histórico insuficiente: são necessárias pelo menos 2 análises para medir a evolução deste jogador.',
  ) {
    super(message);
    this.name = 'PlayerNoHistoryError';
  }
}

/** Janela padrão: 10 análises (limite máximo do parâmetro ?limit=). */
export const DEFAULT_HISTORY_LIMIT = 10;

export interface BuildPlayerEvolutionInsightParams {
  readonly region: string;
  readonly name: string;
  readonly tag: string;
  readonly limit?: number;
  /** Store injetado (testes). Sem ele, cria o padrão (exige DATABASE_URL). */
  readonly store?: CombatSnapshotStore;
}

function toEvolutionInput(row: CombatSnapshotRow): EvolutionSnapshotInput {
  return {
    kdr: row.kdr,
    kpr: row.kpr,
    acs: row.acs,
    hsPercentage: row.hsPercentage,
    kast: row.kast,
    firstBloods: row.firstBloods,
    firstDeaths: row.firstDeaths,
    createdAt: row.createdAt,
  };
}

export async function buildPlayerEvolutionInsight(
  params: BuildPlayerEvolutionInsightParams,
): Promise<PlayerEvolutionInsight> {
  const { region, name, tag, limit = DEFAULT_HISTORY_LIMIT } = params;

  // Fail fast de configuração antes de qualquer I/O.
  const store = params.store ?? createCombatSnapshotStore();

  const rows = await store.getRecentSnapshots(
    { region: region.toLowerCase(), nameKey: name.toLowerCase(), tagKey: tag.toLowerCase() },
    limit,
  );

  if (rows.length < 2) {
    throw new PlayerNoHistoryError();
  }

  // O store retorna DESC (mais novo primeiro); a analytics espera ordem
  // cronológica crescente.
  const snapshots = rows
    .slice()
    .reverse()
    .map(toEvolutionInput);

  return buildEvolutionCoachInsight(snapshots, {
    region: region.toLowerCase(),
    name,
    tag,
  });
}
