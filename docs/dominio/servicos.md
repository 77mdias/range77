# Serviços

A camada `src/services/` é organizada em famílias: fonte de dados
(formato Riot), orquestração, consentimento, cálculo e coaching. A integração
HenrikDev continua no repositório, **guardada e desligada**.

## `riot/` — formato oficial da Riot

- **`normalize-riot.ts`** — DTO Riot → contratos do tracker:
  `normalizeRiotMatchToSummary`, `normalizeRiotMatchToDetail`,
  `normalizeRiotMatchToCombat`, `normalizeRiotEconomy`, `normalizeRiotRounds`,
  `normalizeRiotKills`, `normalizeRiotScoreboard`, `normalizeRiotRank`,
  `normalizeRiotRrHistory`, `isRiotCompetitiveCompleted`.
- **`catalog.ts`** — tabelas explícitas de id → nome (mapa, agente, arma,
  armadura, tier, temporada). Os ids fora do mock foram escritos de memória —
  revalidar com a chave.
- **`mock/`** — gerador determinístico de partidas simuladas. Ver
  [fontes de dados](../arquitetura/fontes-de-dados.md).

## `access/` — consentimento

- **`profile-access.ts`** — `decideProfileAccess` (pura) e
  `resolveProfileAccess` (busca o vínculo; fail-closed). Ver
  [consentimento e RSO](../arquitetura/consentimento-e-rso.md).

## `henrikdev/` — integração antiga (guardada)

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
| `source.ts` | porta `TrackerSource` (`getPlayerSample`, `getMatchDetail(region, matchId, focus?)`, `getPlayerCard`) + `TrackerNotFoundError` |
| `sources/index.ts` | `getTrackerSource()`, `getTrackerSourceKind()`, `isSimulatedDataSource()` (fail-safe) |
| `sources/mock-source.ts` | fonte simulada (padrão): gera e normaliza; preenche `details` |
| `sources/henrikdev-source.ts` | fonte HenrikDev (guardada) — usa `match-detail.ts`/`player-card.ts` |
| `player-overview.ts` | `buildPlayerOverview` — amostra da fonte → overview + agregações + combate + RR/card/rank + `tactical`/`deathHeatmaps` (calculados no servidor) |
| `match-detail.ts` | `getMatchDetail` da HenrikDev — cache durável (24h) → HenrikDev → normaliza |
| `player-card.ts` | `getPlayerCard` da HenrikDev — best-effort |
| `tracked-players-service.ts` | `followPlayer` (recusa perfil privado) / `unfollowPlayer` |
| `user-riot-service.ts` | `setProfilePublic` (lê a sessão; recusa vínculo legado → `NOT_LINKED`) / `unlinkRiotAccount` |

Tudo com **DIP**: `source?`, `client?`, `cacheStore?/snapshotStore?`
(`undefined` cria o padrão que exige `DATABASE_URL`; `null` desliga),
`getSession`, `resolveAccess?`, `now?`.

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
| `riot-match-stats.ts` | somas por jogador (tiros, dano, HS%, ACS) a partir dos dados por round do formato Riot |
| `map-projection.ts` | `projectToMinimap` (coordenada de mundo → u/v do minimapa) |
| `buy-type.ts` | `classifyBuy` / `classifyTeamBuy` (pistol · eco < 2000 · force < 3900 · full) |
| `economy-discipline.ts` | forçou com o time em eco / economizou com o time comprando; win% por tipo de compra |
| `death-heatmap.ts` | grade de mortes por mapa (u/v) |
| `tactical-vectors.ts` | top 3 zonas de morte + disciplina econômica (entrada do coach) |

Fórmulas detalhadas em [métricas](./metricas.md).

## `coaching/` — orquestração do envelope

- **`player-combat.ts`** — `buildPlayerCombatInsight` /
  `buildCombatInsightFromCombatStats`: amostra da fonte → `calculateCombatMetrics`
  → `buildCombatCoachInsight` + identidade/avaliação (+ `tactical` opcional);
  grava snapshot **best-effort** (só na fonte HenrikDev). Erro `PlayerNoMatchesError`; `DEFAULT_MATCH_SAMPLE_SIZE = 5`.
- **`player-evolution.ts`** — `buildPlayerEvolutionInsight`: lê snapshots
  recentes (ordem crescente), exige ≥2 e monta o envelope. Erro
  `PlayerNoHistoryError`; `DEFAULT_HISTORY_LIMIT = 10`.

## Regras transversais

- Cálculo **sempre** em `analytics/**`; orquestração em `tracker/**`/`coaching/**`.
- Nada de I/O em `analytics/**` (funções puras, cobertura 100%).
- Falha de persistência/auxiliares best-effort nunca derruba a resposta.
