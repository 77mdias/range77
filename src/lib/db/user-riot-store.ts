import { eq } from 'drizzle-orm';
import { createDatabase, type ValCoachDatabase } from './index';
import { userRiotAccounts } from './schema';

/**
 * Store do Riot ID vinculado ao usuário logado (porta de persistência —
 * padrão DIP, espelha `tracked-players-store`).
 *
 * A interface é o contrato consumido pelas Server Actions e páginas; a
 * implementação Drizzle (neon-http) só roda em dev/prod com Neon real.
 * `upsert` resolve no unique `(user_id)`: UM Riot ID por usuário —
 * vincular de novo SUBSTITUI o vínculo anterior (não duplica).
 */

export type UserRiotAccountRow = typeof userRiotAccounts.$inferSelect;

export interface UserRiotAccountInput {
  readonly userId: string;
  readonly region: string;
  readonly nameKey: string;
  readonly tagKey: string;
  readonly displayName: string;
}

export interface UserRiotStore {
  /** Riot ID vinculado ao usuário (ou `null` quando não há vínculo). */
  get(userId: string): Promise<UserRiotAccountRow | null>;
  /** Vincular/substituir (idempotente sobre o unique de `user_id`). */
  upsert(input: UserRiotAccountInput): Promise<void>;
  /** Desvincular. */
  remove(userId: string): Promise<void>;
}

export function createUserRiotStore(db: ValCoachDatabase = createDatabase()): UserRiotStore {
  return {
    async get(userId) {
      const rows = await db
        .select()
        .from(userRiotAccounts)
        .where(eq(userRiotAccounts.userId, userId))
        .limit(1);
      return rows[0] ?? null;
    },

    async upsert(input) {
      await db
        .insert(userRiotAccounts)
        .values({
          userId: input.userId,
          region: input.region,
          nameKey: input.nameKey,
          tagKey: input.tagKey,
          displayName: input.displayName,
        })
        .onConflictDoUpdate({
          target: userRiotAccounts.userId,
          set: {
            region: input.region,
            nameKey: input.nameKey,
            tagKey: input.tagKey,
            displayName: input.displayName,
            updatedAt: new Date(),
          },
        });
    },

    async remove(userId) {
      await db.delete(userRiotAccounts).where(eq(userRiotAccounts.userId, userId));
    },
  };
}

/** Singleton lazy: importa barato e exige DATABASE_URL só no primeiro uso. */
let storeInstance: UserRiotStore | null = null;

export function getUserRiotStore(): UserRiotStore {
  storeInstance ??= createUserRiotStore();
  return storeInstance;
}
