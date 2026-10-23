import { and, eq, ne, sql } from 'drizzle-orm';
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

interface UserRiotAccountBase {
  readonly userId: string;
  readonly region: string;
  readonly nameKey: string;
  readonly tagKey: string;
  readonly displayName: string;
}

/** Legado (padrão) não tem puuid; vínculo RSO exige. */
export type UserRiotAccountInput =
  | (UserRiotAccountBase & { readonly puuid?: undefined; readonly linkedVia?: 'legacy' })
  | (UserRiotAccountBase & { readonly puuid: string; readonly linkedVia: 'rso_mock' | 'rso' });

export interface UserRiotStore {
  /** Riot ID vinculado ao usuário (ou `null` quando não há vínculo). */
  get(userId: string): Promise<UserRiotAccountRow | null>;
  /** Dono de um Riot ID (chaves já em minúsculas). */
  getByRiotId(region: string, nameKey: string, tagKey: string): Promise<UserRiotAccountRow | null>;
  /** Liga/desliga o perfil público do usuário. */
  setProfilePublic(userId: string, value: boolean): Promise<void>;
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

    async getByRiotId(region, nameKey, tagKey) {
      const rows = await db
        .select()
        .from(userRiotAccounts)
        .where(
          and(
            eq(userRiotAccounts.region, region),
            eq(userRiotAccounts.nameKey, nameKey),
            eq(userRiotAccounts.tagKey, tagKey),
            // Legado nunca concede acesso e pode "squatar" um Riot ID: fora da busca.
            ne(userRiotAccounts.linkedVia, 'legacy'),
          ),
        )
        .limit(1);
      return rows[0] ?? null;
    },

    async setProfilePublic(userId, value) {
      await db
        .update(userRiotAccounts)
        .set({ profilePublic: value, updatedAt: new Date() })
        .where(eq(userRiotAccounts.userId, userId));
    },

    async upsert(input) {
      const linkedVia = input.linkedVia ?? 'legacy';
      // Trocar o puuid (inclusive relink legado -> null) revoga o consentimento.
      const rsoSet = {
        puuid: input.puuid ?? null,
        linkedVia,
        profilePublic: sql`CASE WHEN ${userRiotAccounts.puuid} IS NOT DISTINCT FROM ${input.puuid ?? null} THEN ${userRiotAccounts.profilePublic} ELSE false END`,
      };
      await db
        .insert(userRiotAccounts)
        .values({
          userId: input.userId,
          region: input.region,
          nameKey: input.nameKey,
          tagKey: input.tagKey,
          displayName: input.displayName,
          puuid: input.puuid,
          linkedVia,
        })
        .onConflictDoUpdate({
          target: userRiotAccounts.userId,
          set: {
            region: input.region,
            nameKey: input.nameKey,
            tagKey: input.tagKey,
            displayName: input.displayName,
            ...rsoSet,
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
