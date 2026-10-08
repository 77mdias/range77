import {
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * Schema Drizzle — Neon Postgres.
 *
 * `player_combat_snapshots`: histórico write-through de cada análise de
 * combate servida pela API. Base para análise de evolução (tendência entre
 * snapshots) e para enriquecer o contexto do chatbot com "última análise".
 *
 * Convenção de chaves: `name_key`/`tag_key` em minúsculas para lookup
 * case-insensitive; `name`/`tag` preservam a exibição.
 */
export const playerCombatSnapshots = pgTable(
  'player_combat_snapshots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    region: text('region').notNull(),
    name: text('name').notNull(),
    tag: text('tag').notNull(),
    nameKey: text('name_key').notNull(),
    tagKey: text('tag_key').notNull(),
    /** Tamanho da amostra solicitada (1–10). */
    sampleSize: integer('sample_size').notNull(),
    kdr: doublePrecision('kdr').notNull(),
    kpr: doublePrecision('kpr').notNull(),
    acs: integer('acs').notNull(),
    /** Nullable = métrica não computável na amostra (nunca 0 enganoso). */
    hsPercentage: doublePrecision('hs_percentage'),
    kast: doublePrecision('kast'),
    firstBloods: integer('first_bloods'),
    firstDeaths: integer('first_deaths'),
    matches: integer('matches').notNull(),
    rounds: integer('rounds').notNull(),
    aimClass: text('aim_class').notNull(),
    impactClass: text('impact_class').notNull(),
    contextualRating: jsonb('contextual_rating').$type<Record<string, string>>().notNull(),
    coachingHooks: jsonb('coaching_hooks').$type<string[]>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('player_combat_snapshots_lookup_idx').on(
      table.region,
      table.nameKey,
      table.tagKey,
      table.createdAt,
    ),
  ],
);

export const schema = { playerCombatSnapshots };
