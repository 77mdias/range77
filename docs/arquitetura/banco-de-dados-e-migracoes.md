# Banco de dados e migrações

Persistência via **Drizzle ORM** + **Neon Postgres**. O schema vive em
`src/lib/db/schema.ts`; as migrações em `drizzle/`.

## Conexões

| Arquivo | Driver | Uso |
| --- | --- | --- |
| `src/lib/db/index.ts` | `@neondatabase/serverless` + `drizzle-orm/neon-http` | queries do app (uma requisição HTTP por query; sem pool TCP) |
| `src/lib/db/auth-connection.ts` | `@neondatabase/serverless` `Pool` + `drizzle-orm/neon-serverless` (WebSocket) | **só o Better Auth** — precisa de `db.transaction()` interativa |

`createDatabase()` usa `requireEnv(env, 'DATABASE_URL')` **no momento da
criação** — importar o módulo é barato e não exige credencial. O auth usa
`AUTH_DATABASE_URL` se existir (pooler dedicado), com fallback para
`DATABASE_URL`. Em Node < 21 o pool registra `ws` em
`neonConfig.webSocketConstructor`.

## Tabelas

### `player_combat_snapshots` — histórico de combate (write-through)

Colunas: `id` (uuid pk), `region`, `name`, `tag`, `name_key`, `tag_key`,
`sample_size`, `kdr`, `kpr`, `acs`, `hs_percentage?`, `kast?`,
`first_bloods?`, `first_deaths?`, `matches`, `rounds`, `aim_class`,
`impact_class`, `contextual_rating` (jsonb), `coaching_hooks` (jsonb),
`created_at`.
Índice: `(region, name_key, tag_key, created_at)`.
Campos nullable = métrica não computável (nunca `0` enganoso).

### `match_cache` — cache durável de partidas

Colunas: `match_id` (text pk), `region`, `payload` (jsonb), `fetched_at`,
`expires_at`.
Índice: `(expires_at)`. TTL de aplicação: **24h** (`MATCH_CACHE_TTL_MS` em
`src/services/tracker/match-detail.ts`) — partidas concluídas são imutáveis.

### Better Auth (core schema)

`user` (`id` text pk, `name`, `email?` — nullable com índice único, pois o
Discord pode devolver `email: null`), `session`, `account`, `verification`.
FKs para `user` com `ON DELETE cascade`.

### `tracked_players` — jogadores seguidos por usuário

`id` (uuid pk), `user_id` (fk → `user`, cascade), `region`, `name_key`,
`tag_key`, `display_name`, `created_at`.
Unique `(user_id, region, name_key, tag_key)`; índice `(user_id, created_at)`.

### `user_riot_account` — Riot ID vinculado ao usuário

`id` (uuid pk), `user_id` (fk → `user`, cascade, **único**), `region`,
`name_key`, `tag_key`, `display_name`, `created_at`, `updated_at`.
Índice `(region, name_key, tag_key)`.

> Convenção: `name_key`/`tag_key` sempre em **minúsculas** para lookup
> case-insensitive; `name`/`tag`/`display_name` preservam a forma exibida.

## Stores (padrão DIP)

Cada store segue o mesmo desenho (`combat-snapshot-store.ts`,
`match-cache-store.ts`, `tracked-players-store.ts`, `user-riot-store.ts`):

- `type <X>Row = typeof tabela.$inferSelect`;
- uma **interface** (porta) + um tipo de registro de entrada;
- `create<X>Store(db: ValCoachDatabase = createDatabase())` — injeção de
  dependência; os testes passam um fake;
- singletons **lazy** (`getTrackedPlayersStore()` / `getUserRiotStore()`)
  quando consumidos por Server Actions.

A política de TTL fica na orquestração, não no store: `match-cache-store.get`
retorna a linha mesmo expirada (ou `null`), e `getMatchDetail` decide.

## Migrações

```bash
npm run db:generate    # gera SQL a partir do schema (drizzle-kit)
npm run db:migrate     # aplica as migrações
```

`drizzle.config.ts`: dialect `postgresql`, `schema: './src/lib/db/schema.ts'`,
`out: './drizzle'`, `dbCredentials.url = process.env.DATABASE_URL`.

Migrações aplicadas (em `drizzle/`):

| Migração | Conteúdo |
| --- | --- |
| `0000` | `player_combat_snapshots` + índice de lookup |
| `0001` | `match_cache` + índice de expiração |
| `0002` | `user`, `session`, `account`, `verification`, `tracked_players` |
| `0003` | `user_riot_account` |

> **Aplicar migração é tarefa do dono no host**:
> `infisical run --env=dev -- npm run db:migrate`. O agente gera o SQL com
> `db:generate`; jamais aplica credenciais nem cria arquivos `.env`.
