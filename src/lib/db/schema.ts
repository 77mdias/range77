import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
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

/**
 * `match_cache`: cache durável do payload bruto de UMA partida (v4
 * match_id). TTL controlado por `expires_at` (24h na aplicação) — evita
 * requisições repetidas à HenrikDev ao abrir o detalhe de partida.
 */
export const matchCache = pgTable(
  'match_cache',
  {
    matchId: text('match_id').primaryKey(),
    region: text('region').notNull(),
    payload: jsonb('payload').notNull(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [index('match_cache_expires_at_idx').on(table.expiresAt)],
);

/**
 * ======================================================================
 * TABELAS DO BETTER AUTH (core schema, doc oficial /concepts/database)
 * ======================================================================
 * Espelham o schema core (user/session/account/verification) para o
 * `drizzleAdapter` (`provider: 'pg'`). IDs em `text` — o Better Auth gera
 * os próprios IDs. `email` é NULLABLE com índice único: o Discord pode
 * retornar `email: null` (contas só-celular) e o Postgres aceita múltiplos
 * NULLs em índice único ("único quando presente").
 */

/** Usuário autenticado (Google/Discord — sem email+senha no MVP). */
export const user = pgTable(
  'user',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email'),
    emailVerified: boolean('email_verified').notNull().default(false),
    image: text('image'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('user_email_unique_idx').on(table.email)],
);

/** Sessão (cookie do Better Auth → linha aqui). */
export const session = pgTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Conta de provedor social (Google/Discord) vinculada ao usuário. */
export const account = pgTable('account', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Verificações/tokens temporários do Better Auth. */
export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * `tracked_players`: jogadores seguidos por um usuário (domínio do
 * dashboard). Unique `(user_id, region, name_key, tag_key)` — seguir duas
 * vezes é idempotente; remover o usuário remove os follows (cascade).
 */
export const trackedPlayers = pgTable(
  'tracked_players',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    region: text('region').notNull(),
    nameKey: text('name_key').notNull(),
    tagKey: text('tag_key').notNull(),
    displayName: text('display_name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('tracked_players_unique_idx').on(
      table.userId,
      table.region,
      table.nameKey,
      table.tagKey,
    ),
    index('tracked_players_user_idx').on(table.userId, table.createdAt),
  ],
);

/**
 * `user_riot_account`: Riot ID vinculado ao USUÁRIO LOGADO (self-tracking).
 * Unique `(user_id)` — UM Riot ID por usuário (revincular = upsert);
 * lookup por `(region, name_key, tag_key)` (chaves em minúsculas, mesma
 * convenção das outras tabelas). Remover o usuário remove o vínculo
 * (cascade).
 */
export const userRiotAccounts = pgTable(
  'user_riot_account',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    region: text('region').notNull(),
    nameKey: text('name_key').notNull(),
    tagKey: text('tag_key').notNull(),
    displayName: text('display_name').notNull(),
    /** Nulo nos vínculos legados (sem consentimento RSO). */
    puuid: text('puuid').unique(),
    linkedVia: text('linked_via', { enum: ['legacy', 'rso_mock', 'rso'] })
      .notNull()
      .default('legacy'),
    /** Opt-in: perfil só é público após o dono ligar o toggle. */
    profilePublic: boolean('profile_public').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('user_riot_account_unique_idx').on(table.userId),
    index('user_riot_account_lookup_idx').on(table.region, table.nameKey, table.tagKey),
  ],
);

/** Registrado no final: todas as tabelas já estão declaradas. */
export const schema = {
  playerCombatSnapshots,
  matchCache,
  user,
  session,
  account,
  verification,
  trackedPlayers,
  userRiotAccounts,
};
