# Cache e revalidação

ValCoach usa o modelo **Cache Components** do Next 16 (`cacheComponents: true`)
e uma segunda camada durável no Neon. O objetivo é proteger a cota da
HenrikDev e responder rápido sem servir dado velho por muito tempo.

## Camada 1 — Cache Components (`'use cache'`)

A camada Data é centralizada em `src/lib/cache/tracker.ts` e **compartilhada
entre Route Handlers e páginas** (abrir o perfil esquenta a API e vice-versa).

| Helper | `cacheLife` (stale/revalidate/expire s) | `cacheTag` |
| --- | --- | --- |
| `getCachedPlayerOverview(region,name,tag,size)` | 300 / 1500 / 21600 | `player-overview:{region}:{name}:{tag}:{size}` |
| `getCachedBreakdownOverview(region,name,tag)` | 300 / 1500 / 21600 | `player-breakdown:{region}:{name}:{tag}` |
| `getCachedMatchDetail(region,matchId)` | 300 / 3600 / 86400 | `match:{region}:{matchId}` |
| `getCachedPlayerCard(name,tag)` | 300 / 3600 / 86400 | `player-card:{name}:{tag}` |

O Route Handler de combate tem o próprio wrapper
`getCachedInsight(region,name,tag,size)` em
`src/app/api/players/[region]/[name]/[tag]/route.ts`, com
`stale: 300 / revalidate: 1500 / expire: 21600` e
`cacheTag('player-combat:{region}:{name}:{tag}:{size}')`.

> `revalidate: 1500` **= 25 min**: uma partida ranqueada dura ~30–50 min, então
> a janela não muda entre navegações e não faz sentido rebuscar antes disso.
> Dados de conta que mudam raramente sobem para 1 h/24 h.

> A chave de cache inclui `size`: a Visão Geral usa **5** partidas e a API
> aceita 1–10. A tela Breakdown **não** usa `size` fixo: a amostra é resolvida
> por ato (até `ACT_SAMPLE_CAP = 30`, fallback `ACT_SAMPLE_FALLBACK = 15`) e
> tem entrada de cache própria (`player-breakdown:*`).

### Camada 1b — cache POR RECURSO (`cached-client.ts`)

O envelope acima é grosso: Perfil e Breakdown são entradas **diferentes**, e
alternar entre as telas re-buscaria conta/MMR/histórico duas vezes. Para evitar
isso, os helpers (`getCached*`) injetam `createCachedHenrikDevClient()`
(`src/services/henrikdev/cached-client.ts`), cujo cada método tem `'use cache'`
próprio — o mesmo padrão de `cacheLife`/`cacheTag`, mas na granularidade de
**recurso**:

| Recurso (`henrikdev:*`) | `revalidate` | Motivo |
| --- | --- | --- |
| `matches` (v4, por `size`/`start`) | 1500 (25 min) | muda a cada partida |
| `mmr-history` (v2) | 1500 (25 min) | muda a cada partida |
| `mmr` (v2, ranque atual) | 1500 (25 min) | muda a cada partida |
| `mmr-v3` (`seasonal[]`) | 1500 (25 min) | base da amostra por ato |
| `account` (v1, nível/cartão) | 3600 (1 h) | muda raramente |
| `match` (v4 por id) | 3600 (1 h) | payload imutável |

Assim a segunda tela do mesmo jogador esquenta a partir do cache do primeiro.
A chave exige `HENRIKDEV_API_KEY` só no **miss** (fail-fast); num hit nada é
lido do ambiente. Os serviços seguem recebendo o client por injeção (DIP), então
os testes injetam um client falso e não tocam `next/cache`.

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
