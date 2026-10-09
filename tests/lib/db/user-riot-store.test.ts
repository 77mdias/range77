import { describe, expect, it } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import { userRiotAccounts } from '@/lib/db/schema';
import type { ValCoachDatabase } from '@/lib/db';
import { createUserRiotStore, type UserRiotAccountRow } from '@/lib/db/user-riot-store';

/**
 * SUITE TDD — store do Riot ID vinculado (self-tracking). O db é um FAKE
 * que registra a cadeia de chamadas Drizzle (select/insert/delete) sem
 * tocar no Neon; as condições `eq()` são inspecionadas via `queryChunks`.
 */

/** Extrai os valores dos Params de uma condição SQL (`eq(coluna, valor)`). */
function paramValues(condition: SQL): unknown[] {
  return condition.queryChunks
    .filter((chunk) => chunk?.constructor.name === 'Param')
    .map((chunk) => (chunk as unknown as { value: unknown }).value);
}

const row: UserRiotAccountRow = {
  id: '0f0e0d0c-1111-4222-8333-444455556666',
  userId: 'user-1',
  region: 'br',
  nameKey: 'player one',
  tagKey: 'br1',
  displayName: 'Player One',
  createdAt: new Date('2026-10-01T00:00:00.000Z'),
  updatedAt: new Date('2026-10-02T00:00:00.000Z'),
};

interface FakeDbCalls {
  readonly selectedWhere: SQL[];
  readonly insertedValues: unknown[];
  conflictConfig: unknown;
  readonly deletedWhere: SQL[];
  readonly limits: number[];
}

function createFakeDb(rows: UserRiotAccountRow[] = []) {
  const calls: FakeDbCalls = {
    selectedWhere: [],
    insertedValues: [],
    conflictConfig: null,
    deletedWhere: [],
    limits: [],
  };

  const db = {
    select: () => ({
      from: (table: unknown) => {
        expect(table).toBe(userRiotAccounts);
        return {
          where: (condition: SQL) => {
            calls.selectedWhere.push(condition);
            return {
              limit: (n: number) => {
                calls.limits.push(n);
                return Promise.resolve([...rows]);
              },
            };
          },
        };
      },
    }),
    insert: (table: unknown) => {
      expect(table).toBe(userRiotAccounts);
      return {
        values: (values: unknown) => {
          calls.insertedValues.push(values);
          return {
            onConflictDoUpdate: (config: unknown) => {
              calls.conflictConfig = config;
              return Promise.resolve();
            },
          };
        },
      };
    },
    delete: (table: unknown) => {
      expect(table).toBe(userRiotAccounts);
      return {
        where: (condition: SQL) => {
          calls.deletedWhere.push(condition);
          return Promise.resolve();
        },
      };
    },
  };

  return { db: db as unknown as ValCoachDatabase, calls };
}

describe('schema: user_riot_account', () => {
  it('tem índice ÚNICO por usuário e índice de lookup região+chaves', () => {
    const config = getTableConfig(userRiotAccounts);
    expect(config.name).toBe('user_riot_account');

    const columnOf = (column: unknown) => column as { readonly name: string };
    const unique = config.indexes.find(
      (index) => index.config.name === 'user_riot_account_unique_idx',
    );
    expect(unique?.config.unique).toBe(true);
    expect(unique?.config.columns.map(columnOf).map((column) => column.name)).toEqual(['user_id']);

    const lookup = config.indexes.find(
      (index) => index.config.name === 'user_riot_account_lookup_idx',
    );
    expect(lookup?.config.unique ?? false).toBe(false);
    expect(lookup?.config.columns.map(columnOf).map((column) => column.name)).toEqual([
      'region',
      'name_key',
      'tag_key',
    ]);
  });
});

describe('createUserRiotStore', () => {
  it('get retorna o vínculo do usuário (where userId, limit 1)', async () => {
    const { db, calls } = createFakeDb([row]);

    await expect(createUserRiotStore(db).get('user-1')).resolves.toEqual(row);
    expect(paramValues(calls.selectedWhere[0]!)).toEqual(['user-1']);
    expect(calls.limits).toEqual([1]);
  });

  it('get retorna null quando o usuário não tem vínculo', async () => {
    const { db } = createFakeDb([]);

    await expect(createUserRiotStore(db).get('user-1')).resolves.toBeNull();
  });

  it('upsert insere com alvo de conflito userId e refreshed updatedAt no set', async () => {
    const { db, calls } = createFakeDb();

    await createUserRiotStore(db).upsert({
      userId: 'user-1',
      region: 'br',
      nameKey: 'player one',
      tagKey: 'br1',
      displayName: 'Player One',
    });

    expect(calls.insertedValues).toEqual([
      {
        userId: 'user-1',
        region: 'br',
        nameKey: 'player one',
        tagKey: 'br1',
        displayName: 'Player One',
      },
    ]);

    const conflict = calls.conflictConfig as { target: unknown; set: Record<string, unknown> };
    // UM Riot ID por usuário: o conflito é resolvido sobre o próprio userId.
    expect(conflict.target).toBe(userRiotAccounts.userId);
    expect(conflict.set).toMatchObject({
      region: 'br',
      nameKey: 'player one',
      tagKey: 'br1',
      displayName: 'Player One',
    });
    expect(conflict.set.updatedAt).toBeInstanceOf(Date);
  });

  it('remove deleta o vínculo pelo userId', async () => {
    const { db, calls } = createFakeDb([row]);

    await createUserRiotStore(db).remove('user-1');

    expect(paramValues(calls.deletedWhere[0]!)).toEqual(['user-1']);
  });
});
