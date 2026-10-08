import { eq } from 'drizzle-orm';
import { createDatabase, type ValCoachDatabase } from './index';
import { matchCache } from './schema';

/**
 * Store do cache durável de partidas (porta de persistência).
 *
 * Segue o padrão DIP do `combat-snapshot-store`: a orquestração depende da
 * interface, e os testes injetam um store falso. A política de expiração
 * (TTL) fica na orquestração — este store apenas lê/grava.
 */

export type MatchCacheRow = typeof matchCache.$inferSelect;

export interface MatchCacheRecord {
  readonly matchId: string;
  readonly region: string;
  readonly payload: unknown;
  readonly expiresAt: Date;
}

export interface MatchCacheStore {
  /** Retorna a linha (mesmo expirada) ou `null` se ausente. */
  get(matchId: string): Promise<MatchCacheRow | null>;
  /** Insere ou substitui (upsert por match_id). */
  put(record: MatchCacheRecord): Promise<void>;
}

export function createMatchCacheStore(
  db: ValCoachDatabase = createDatabase(),
): MatchCacheStore {
  return {
    async get(matchId) {
      const rows = await db
        .select()
        .from(matchCache)
        .where(eq(matchCache.matchId, matchId))
        .limit(1);
      return rows[0] ?? null;
    },

    async put(record) {
      await db
        .insert(matchCache)
        .values({
          matchId: record.matchId,
          region: record.region,
          payload: record.payload,
          expiresAt: record.expiresAt,
        })
        .onConflictDoUpdate({
          target: matchCache.matchId,
          set: {
            region: record.region,
            payload: record.payload,
            fetchedAt: new Date(),
            expiresAt: record.expiresAt,
          },
        });
    },
  };
}
