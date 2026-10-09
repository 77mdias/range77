import { and, desc, eq } from 'drizzle-orm';
import { createDatabase, type ValCoachDatabase } from './index';
import { trackedPlayers } from './schema';

/**
 * Store dos jogadores seguidos (porta de persistência — padrão DIP).
 *
 * A interface é o contrato consumido pelas Server Actions e páginas; a
 * implementação Drizzle (neon-http) só roda em dev/prod com Neon real.
 * `add` é idempotente (unique user+região+riot-id → onConflictDoNothing).
 */

export type TrackedPlayerRow = typeof trackedPlayers.$inferSelect;

/** Chave canônica de um jogador seguido (name/tag em minúsculas). */
export interface TrackedPlayerKey {
  readonly userId: string;
  readonly region: string;
  readonly nameKey: string;
  readonly tagKey: string;
}

export interface TrackedPlayerInput extends TrackedPlayerKey {
  readonly displayName: string;
}

export interface TrackedPlayersStore {
  /** Jogadores seguidos, mais recentes PRIMEIRO. */
  listByUser(userId: string): Promise<TrackedPlayerRow[]>;
  /** Seguir (idempotente). */
  add(input: TrackedPlayerInput): Promise<void>;
  /** Deixar de seguir. */
  remove(key: TrackedPlayerKey): Promise<void>;
  /** O usuário já segue este jogador? */
  isTracked(key: TrackedPlayerKey): Promise<boolean>;
}

export function createTrackedPlayersStore(
  db: ValCoachDatabase = createDatabase(),
): TrackedPlayersStore {
  return {
    async listByUser(userId) {
      return db
        .select()
        .from(trackedPlayers)
        .where(eq(trackedPlayers.userId, userId))
        .orderBy(desc(trackedPlayers.createdAt))
        .limit(50);
    },

    async add(input) {
      await db
        .insert(trackedPlayers)
        .values({
          userId: input.userId,
          region: input.region,
          nameKey: input.nameKey,
          tagKey: input.tagKey,
          displayName: input.displayName,
        })
        .onConflictDoNothing({
          target: [
            trackedPlayers.userId,
            trackedPlayers.region,
            trackedPlayers.nameKey,
            trackedPlayers.tagKey,
          ],
        });
    },

    async remove(key) {
      await db
        .delete(trackedPlayers)
        .where(
          and(
            eq(trackedPlayers.userId, key.userId),
            eq(trackedPlayers.region, key.region),
            eq(trackedPlayers.nameKey, key.nameKey),
            eq(trackedPlayers.tagKey, key.tagKey),
          ),
        );
    },

    async isTracked(key) {
      const rows = await db
        .select({ id: trackedPlayers.id })
        .from(trackedPlayers)
        .where(
          and(
            eq(trackedPlayers.userId, key.userId),
            eq(trackedPlayers.region, key.region),
            eq(trackedPlayers.nameKey, key.nameKey),
            eq(trackedPlayers.tagKey, key.tagKey),
          ),
        )
        .limit(1);
      return rows.length > 0;
    },
  };
}

/** Singleton lazy: importa barato e exige DATABASE_URL só no primeiro uso. */
let storeInstance: TrackedPlayersStore | null = null;

export function getTrackedPlayersStore(): TrackedPlayersStore {
  storeInstance ??= createTrackedPlayersStore();
  return storeInstance;
}
