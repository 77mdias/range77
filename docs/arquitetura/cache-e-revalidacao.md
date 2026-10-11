# Cache e revalidação

ValCoach usa o modelo **Cache Components** do Next 16 (`cacheComponents: true`)
e uma segunda camada durável no Neon. O objetivo é proteger a cota da
HenrikDev e responder rápido sem servir dado velho por muito tempo.

## Camada 1 — Cache Components (`'use cache'`)

A camada Data é centralizada em `src/lib/cache/tracker.ts` e **compartilhada
entre Route Handlers e páginas** (abrir o perfil esquenta a API e vice-versa).

| Helper | `cacheLife` (stale/revalidate/expire s) | `cacheTag` |
| --- | --- | --- |
| `getCachedPlayerOverview(region,name,tag,size)` | 60 / 300 / 3600 | `player-overview:{region}:{name}:{tag}:{size}` |
| `getCachedMatchDetail(region,matchId)` | 300 / 3600 / 86400 | `match:{region}:{matchId}` |
| `getCachedPlayerCard(name,tag)` | 300 / 3600 / 86400 | `player-card:{name}:{tag}` |

O Route Handler de combate tem o próprio wrapper
`getCachedInsight(region,name,tag,size)` em
`src/app/api/players/[region]/[name]/[tag]/route.ts`, com
`stale: 60 / revalidate: 300 / expire: 3600` e
`cacheTag('player-combat:{region}:{name}:{tag}:{size}')`.

> A chave de cache inclui `size`: a Visão Geral usa **5** partidas e a tela
> Breakdown usa **20** — amostras diferentes não podem compartilhar entrada.

### `connection()` em vez de `dynamic = 'force-dynamic'`

No Cache Components o modo dinâmico é opt-in. O health usa
`await connection()` (`src/app/api/health/route.ts`).

## Camada 2 — Cache durável no Neon

`match_cache` guarda o payload cru da partida por 24h. Ordem em
`getMatchDetail`:

1. resolve o `cacheStore` (`null` desliga; `undefined` cria o padrão);
2. `cacheStore.get(matchId)` e compara `expiresAt` com o relógio injetável;
3. **hit** → normaliza e retorna **sem tocar a HenrikDev** (não exige API key);
4. **miss** → exige `HENRIKDEV_API_KEY`, busca, grava best-effort
   (falha só emite `console.warn`) e normaliza.

## Invalidação

- **Páginas após mutações**: Server Actions chamam `revalidatePath`
  (`/dashboard` para follow/unfollow; `/dashboard/settings` para link/unlink
  do Riot ID). **Não há uso de `revalidateTag` no código.**
- **`updateTag`/`revalidateTag`** ficam no backlog para quando o cache de
  dados precisar ser invalidado pontualmente.

## Pegadinha: erros atravessam o `'use cache'` serializados

A fronteira `'use cache'` serializa erros e preserva apenas `name`/`message`
— sem protótipo, sem props. Consequências no código:

- `HenrikDevApiError` embute o status no `name` (`HenrikDevApiError:404`) e
  `henrikDevErrorStatus(error)` lê do prefixo, nunca só de `instanceof`.
- `hasErrorName(error, name)` faz detecção **estrutural** (`src/lib/http/api-error.ts`).
- O mapeamento para `ApiErrorBody` reconhece `PlayerNoMatchesError`,
  `PlayerNoHistoryError`, `EnvironmentValidationError`, `CombatMetricsError`
  por nome.

Ver também [banco de dados](../arquitetura/banco-de-dados-e-migracoes.md) e
[rotas de API](../referencia/rotas-api.md).
