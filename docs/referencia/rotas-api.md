# Rotas de API (Route Handlers)

Todas as rotas de erro usam o envelope `ApiErrorBody`
(`{ error: { code, message, hint? } }`); a stack nunca vaza no body. O mapa
canônico de erros upstream está em `src/lib/http/api-error.ts`:
`404 → recurso` · `429 → 503` · `401 → 500 CONFIG_ERROR` ·
`0 (rede) → 502 UPSTREAM_UNREACHABLE` · outro upstream → `502 UPSTREAM_ERROR` ·
env inválido → `500 CONFIG_ERROR` · desconhecido → `500 INTERNAL_ERROR`.
As mensagens falam em "provedor de dados", nunca no nome do fornecedor.

## Consentimento em todas as rotas de jogador e partida

Antes de qualquer cache ou fonte, a rota lê o viewer dos headers e chama
`resolveProfileAccess`. Perfil **privado** e perfil **inexistente** respondem
igual — `404 PROFILE_NOT_PUBLIC` com
`Este jogador não tornou o perfil público.` —, então a API não revela se uma
conta existe. Parâmetros malformados (`size`, `limit`, região) ainda dão
`400` antes da checagem (não revelam nada da conta). Ver
[consentimento e RSO](../arquitetura/consentimento-e-rso.md).

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
- Cache: `getCachedInsight` (`'use cache'`, stale 300 / revalidate 1500 /
  expire 21600), tag `player-combat:{kind}:{region}:{name}:{tag}:{size}`.
- Erros: `404 PROFILE_NOT_PUBLIC` · `404 PLAYER_NOT_FOUND` ·
  `503 UPSTREAM_RATE_LIMITED` · `404 NO_VALID_MATCHES` (`PlayerNoMatchesError`)
  · `500 CONFIG_ERROR` · `500 ANALYTICS_ERROR` · `502 UPSTREAM_ERROR` ·
  `500 INTERNAL_ERROR`.

## `GET /api/players/[region]/[name]/[tag]/overview`

`.../overview/route.ts`

- Mesmos `params` e query `size` (1–10, default 5).
- Resposta: `PlayerOverview` (inclui `tactical` e `deathHeatmaps` na fonte
  simulada; nunca os `details` brutos).
- Cache **compartilhado com a página do perfil** (`getCachedPlayerOverview`,
  stale 300 / revalidate 1500 / expire 21600).
- Erros: `404 PROFILE_NOT_PUBLIC`; `404 NO_VALID_MATCHES`; demais via
  `mapUpstreamError` com `notFoundCode: PLAYER_NOT_FOUND`.
- Também usada pela home para revalidar o rank dos perfis recentes (falha →
  card sem rank).

## `GET /api/players/[region]/[name]/[tag]/history`

`.../history/route.ts`

- Query `limit`: inteiro **2–20**, default **10**.
- Resposta: `PlayerEvolutionInsight` (lê snapshots persistidos no Neon).
- **Não cacheado** aqui.
- Erros: `404 PROFILE_NOT_PUBLIC` · `404 INSUFFICIENT_HISTORY`
  (`PlayerNoHistoryError`) · `500 CONFIG_ERROR` · `500 INTERNAL_ERROR`.

## `GET /api/matches/[region]/[matchId]?player=Nome%23Tag`

`src/app/api/matches/[region]/[matchId]/route.ts`

- `params: Promise<{ region, matchId }>`; `parseMatchRouteParams` (matchId é
  UUID); inválido → `400 INVALID_PARAMS`.
- Query **`player` obrigatória**: é o foco da partida e o perfil cujo
  consentimento é checado. Ausente ou privado → `404 PROFILE_NOT_PUBLIC`;
  malformado → `400`.
- Resposta: `MatchDetail` (com posições, spike e economia na fonte simulada).
- Cache: `getCachedMatchDetail(region, matchId, focus)`.
- Erros: `404 MATCH_NOT_FOUND` (inclui partida fora do histórico do foco na
  fonte simulada); demais via `mapUpstreamError`.

## `GET /api/rso/authorize?region=<afinidade>`

`src/app/api/rso/authorize/route.ts` — exige sessão (senão
`/login?next=…`); região inválida → `/dashboard/settings?rso=error`. Grava o
cookie `rso_state` (httpOnly, lax, 10 min) e redireciona para
`/rso/consent?state=…&region=…`.

## `GET /api/rso/callback?code=…&state=…`

`src/app/api/rso/callback/route.ts` — confere `state` com o cookie, verifica o
`code` (HMAC, 5 min), exige o mesmo usuário e `puuid`, grava o vínculo
`rso_mock`, apaga o cookie e redireciona para
`/dashboard/settings?rso=linked`. Qualquer falha (inclusive `puuid` já
vinculado a outro usuário) → `?rso=error`, sem gravar nada.

## Server Actions

- `src/app/actions/tracked-players.ts` — `followPlayer` / `unfollowPlayer`
  (revalida `/dashboard`). `ActionResult.code ∈ OK | UNAUTHENTICATED |
  INVALID_PARAMS | PROFILE_NOT_PUBLIC`.
- `src/app/actions/user-riot.ts` — `setProfilePublic(value)` (revalida
  settings e o perfil; `NOT_LINKED` sem vínculo RSO) / `unlinkRiotAccount()`
  (revalida `/dashboard/settings`).
- `src/app/actions/rso.ts` — `authorizeRso(state, region)` **devolve** a URL do
  callback (o client navega com `window.location.assign`); `denyRso()`
  redireciona para `?rso=denied`.

Ver [autenticação](../arquitetura/autenticacao.md) e
[cache](../arquitetura/cache-e-revalidacao.md).
