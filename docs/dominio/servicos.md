# Serviços

A camada `src/services/` é organizada em quatro famílias: integração externa,
orquestração/normalização, cálculo e coaching.

## `henrikdev/` — integração externa

- **`client.ts`** — `createHenrikDevClient(...)` com os seis métodos de
  fetch (ver [fluxo de dados](../arquitetura/fluxo-de-dados.md)). Trata erros
  como `HenrikDevApiError` (status no `name`) e respostas malformadas como
  `502 MALFORMED_RESPONSE`.
- **`cached-client.ts`** — `createCachedHenrikDevClient()`: os mesmos seis
  métodos, mas cada um com `'use cache'` + `cacheLife`/`cacheTag` próprios
  (`henrikdev:*`), para Perfil e Breakdown compartilharem conta/MMR/histórico
  em vez de repetir upstream. Ver
  [cache e revalidação](../arquitetura/cache-e-revalidacao.md).
- **`normalize.ts`** — `normalizeMatchesToCombat(matches, player)` →
  `MatchCombatStats[]`. Filtra competitivas, concluídas, jogador presente e
  rounds deriváveis; deriva KAST e first bloods/deaths quando há timeline.
- **`normalize-tracker.ts`** — normaliza para os contratos do tracker:
  `normalizeMatchToSummary`, `normalizeMatchesToSummaries`,
  `normalizeMatchToScoreboard`, `normalizeMatchToRounds`,
  `normalizeMatchToPlayerRounds`, `normalizeMatchToKills`,
  `normalizeMatchToDetail`, `resolveWinningTeamId`, `resolveAccountLevel`,
  `resolveAccountCard`, `resolveRankSummary`, `buildKastInputFromMatch`.

## `tracker/` — orquestração e persistência

| Arquivo | Responsabilidade |
| --- | --- |
| `player-overview.ts` | `buildPlayerOverview` — um fetch alimenta overview + agregações + snapshot + RR/card/rank; no modo por ato pagina em blocos de 10; retorna `PlayerOverview` |
| `match-detail.ts` | `getMatchDetail` — cache durável (24h) → HenrikDev → normaliza; `MATCH_CACHE_TTL_MS` |
| `player-card.ts` | `getPlayerCard` — best-effort (`null` quando indisponível) |
| `tracked-players-service.ts` | `followPlayer`/`unfollowPlayer` (Server Actions) |
| `user-riot-service.ts` | `linkRiotAccount`/`unlinkRiotAccount` (Server Actions) |

Tudo com **DIP**: `client?`, `cacheStore?/snapshotStore?` (`undefined` cria o
padrão que exige `DATABASE_URL`; `null` desliga), `getSession`, `now?`.

## `analytics/` — cálculo puro (cobertura 100%)

| Arquivo | Responsabilidade |
| --- | --- |
| `combat.ts` | núcleo: KDR/KPR/ACS/KAST/HS%/FB/FD + `roundTo`/`rateMetric`/`CombatMetricsError` |
| `adr.ts` | ADR ponderado por rounds |
| `kast.ts` | KAST% por jogador a partir dos eventos de abate |
| `rating.ts` | Rating ValCoach composto |
| `entry.ts` | agressividade de entrada (FB/FD/attempts) |
| `consistency.ts` | consistência de ACS (desvio populacional + CV) |
| `evolution.ts` | evolução entre snapshots (regra das metades) |
| `tracker-aggregations.ts` | agregações por agente/mapa, streaks, tendência |
| `match-breakdown.ts` | FB/FD por jogador, armas, MVP, halves, ADR, timeline, rank range, totais de time |
| `rr-trend.ts` | trajetória de RR (`mmr-history` → pontos) |
| `act-window.ts` | amostra por ato (`seasonal[].games` → nº de partidas, teto/fallback) |
| `agent-map-filters.ts` | filtros reais (temporada/fila/amostra mínima) |
| `agent-map-profiles.ts` | tier de agente e status de map pool (faixas de WR) |
| `map-sides.ts` | splits DEF/ATK (`halves`) agregados por mapa |
| `chart-transforms.ts` | domínios/pontos/células/radar para os charts |

Fórmulas detalhadas em [métricas](./metricas.md).

## `coaching/` — orquestração do envelope

- **`player-combat.ts`** — `buildPlayerCombatInsight` /
  `buildCombatInsightFromMatches`: fetch → normaliza → `calculateCombatMetrics`
  → `buildCombatCoachInsight` + identidade/avaliação; grava snapshot
  **best-effort**. Erro `PlayerNoMatchesError`; `DEFAULT_MATCH_SAMPLE_SIZE = 5`.
- **`player-evolution.ts`** — `buildPlayerEvolutionInsight`: lê snapshots
  recentes (ordem crescente), exige ≥2 e monta o envelope. Erro
  `PlayerNoHistoryError`; `DEFAULT_HISTORY_LIMIT = 10`.

## Regras transversais

- Cálculo **sempre** em `analytics/**`; orquestração em `tracker/**`/`coaching/**`.
- Nada de I/O em `analytics/**` (funções puras, cobertura 100%).
- Falha de persistência/auxiliares best-effort nunca derruba a resposta.
