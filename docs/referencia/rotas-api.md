# Rotas de API (Route Handlers)

Todas as rotas de erro usam o envelope `ApiErrorBody`
(`{ error: { code, message, hint? } }`); a stack nunca vaza no body. O mapa
canônico de erros upstream está em `src/lib/http/api-error.ts`:
`404 → recurso` · `429 → 503` · `401 → 500 CONFIG_ERROR` ·
`0 (rede) → 502 UPSTREAM_UNREACHABLE` · outro upstream → `502 UPSTREAM_ERROR` ·
env inválido → `500 CONFIG_ERROR` · desconhecido → `500 INTERNAL_ERROR`.

## `GET /api/health`

`src/app/api/health/route.ts` — `await connection()` + `loadAppEnv()`.
Resposta: `{ status: 'ok', service: 'valcoach-ai', environment, timestamp }`.

## `GET|POST /api/auth/[...all]`

`src/app/api/auth/[...all]/route.ts` — delega ao handler do Better Auth
(`(await getAuth()).handler(request)`). Sem mapeamento próprio de erros.

## `GET /api/players/[region]/[name]/[tag]`

`src/app/api/players/[region]/[name]/[tag]/route.ts`

- `params: Promise<{ region, name, tag }>` (aguardado).
- Query `size`: inteiro **1–10**, default **5**.
- Valida com `parsePlayerRouteParams`; inválido → `400 INVALID_PARAMS`.
- Resposta: `PlayerCombatInsight` (envelope de combate).
- Cache: `getCachedInsight` (`'use cache'`, stale 60 / revalidate 300 /
  expire 3600), tag `player-combat:{region}:{name}:{tag}:{size}`.
- Erros: `404 PLAYER_NOT_FOUND` · `503 UPSTREAM_RATE_LIMITED` ·
  `404 NO_VALID_MATCHES` (`PlayerNoMatchesError`) · `500 CONFIG_ERROR` (env/chave)
  · `500 ANALYTICS_ERROR` · `502 UPSTREAM_ERROR` · `500 INTERNAL_ERROR`.

## `GET /api/players/[region]/[name]/[tag]/overview`

`.../overview/route.ts`

- Mesmos `params` e query `size` (1–10, default 5).
- Resposta: `PlayerOverview`.
- Cache **compartilhado com a página do perfil**
  (`getCachedPlayerOverview`, stale 60 / revalidate 300 / expire 3600).
- Erros: `404 NO_VALID_MATCHES` (`PlayerNoMatchesError`); demais via
  `mapUpstreamError` com `notFoundCode: PLAYER_NOT_FOUND` (hint para conferir o
  Riot ID e a região).

## `GET /api/players/[region]/[name]/[tag]/history`

`.../history/route.ts`

- Query `limit`: inteiro **2–20**, default **10**.
- Resposta: `PlayerEvolutionInsight` (lê snapshots persistidos no Neon).
- **Não cacheado** aqui.
- Erros: `404 INSUFFICIENT_HISTORY` (`PlayerNoHistoryError`) ·
  `500 CONFIG_ERROR` · `500 INTERNAL_ERROR`.

## `GET /api/matches/[region]/[matchId]`

`src/app/api/matches/[region]/[matchId]/route.ts`

- `params: Promise<{ region, matchId }>`; `parseMatchRouteParams` (matchId é
  UUID); inválido → `400 INVALID_PARAMS`.
- Resposta: `MatchDetail`.
- Cache: `getCachedMatchDetail` (`'use cache'` + cache durável Neon
  `match_cache`, TTL 24h).
- Erros: `404 MATCH_NOT_FOUND`; demais via `mapUpstreamError`.

## Server Actions

- `src/app/actions/tracked-players.ts` — `followPlayer` / `unfollowPlayer`
  (revalida `/dashboard`). `ActionResult.code ∈ OK | UNAUTHENTICATED | INVALID_PARAMS`.
- `src/app/actions/user-riot.ts` — `linkRiotAccount` / `unlinkRiotAccount`
  (revalida `/dashboard/settings`).

Ver [autenticação](../arquitetura/autenticacao.md) e
[cache](../arquitetura/cache-e-revalidacao.md).
