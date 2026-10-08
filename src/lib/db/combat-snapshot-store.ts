import { and, desc, eq } from 'drizzle-orm';
import { createDatabase, type ValCoachDatabase } from './index';
import { playerCombatSnapshots } from './schema';

/**
 * Store de snapshots de análise de combate (porta de persistência).
 *
 * A interface é o contrato consumido pela orquestração (DIP): testes
 * injetam implementações falsas e a implementação Drizzle só é exercitada
 * em dev/prod com Neon real.
 */

/** Registro a persistir — espelha as colunas graváveis da tabela. */
export interface CombatSnapshotRecord {
  readonly region: string;
  readonly name: string;
  readonly tag: string;
  readonly nameKey: string;
  readonly tagKey: string;
  readonly sampleSize: number;
  readonly kdr: number;
  readonly kpr: number;
  readonly acs: number;
  readonly hsPercentage?: number | null;
  readonly kast?: number | null;
  readonly firstBloods?: number | null;
  readonly firstDeaths?: number | null;
  readonly matches: number;
  readonly rounds: number;
  readonly aimClass: string;
  readonly impactClass: string;
  readonly contextualRating: Record<string, string>;
  readonly coachingHooks: string[];
}

export type CombatSnapshotRow = typeof playerCombatSnapshots.$inferSelect;

export interface CombatSnapshotPlayerKey {
  readonly region: string;
  readonly nameKey: string;
  readonly tagKey: string;
}

export interface CombatSnapshotStore {
  insertSnapshot(record: CombatSnapshotRecord): Promise<void>;
  /** Snapshot mais recente do jogador (ou null) — leitura para o chatbot. */
  getLatestSnapshot(player: CombatSnapshotPlayerKey): Promise<CombatSnapshotRow | null>;
}

export function createCombatSnapshotStore(
  db: ValCoachDatabase = createDatabase(),
): CombatSnapshotStore {
  return {
    async insertSnapshot(record) {
      await db.insert(playerCombatSnapshots).values(record);
    },

    async getLatestSnapshot({ region, nameKey, tagKey }) {
      const rows = await db
        .select()
        .from(playerCombatSnapshots)
        .where(
          and(
            eq(playerCombatSnapshots.region, region),
            eq(playerCombatSnapshots.nameKey, nameKey),
            eq(playerCombatSnapshots.tagKey, tagKey),
          ),
        )
        .orderBy(desc(playerCombatSnapshots.createdAt))
        .limit(1);
      return rows[0] ?? null;
    },
  };
}
