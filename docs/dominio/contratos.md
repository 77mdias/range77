# Contratos

Os formatos de dados que atravessam o sistema ficam em `src/contracts/`.

## `riot.ts` — espelho do payload oficial da Riot

Tipos crus de **VAL-MATCH-V1** e **ACCOUNT-V1**, com a grafia oficial e o
prefixo `Riot`, conferidos no portal (tabela campo a campo em
[`riot-val-match-v1.md`](../referencia/riot-val-match-v1.md)). **Só tipos**;
nunca usado pelas páginas.

- `RiotMatchDto` (`matchInfo`, `players`, `teams`, `roundResults`),
  `RiotRoundResultDto` (`roundNum` **0-based**, plant/defuse com
  `Location`/`PlayerLocations`), `RiotPlayerRoundStatsDto` (`kills`, `damage`,
  `economy`, `ability`), `RiotKillDto` (`victimLocation`, `playerLocations`
  com `viewRadians`), `RiotEconomyDto` (`loadoutValue`, `weapon`, `armor`,
  `remaining`, `spent`), `RiotAccountDto`, `RiotMatchlistDto`.
- `RiotAbilityDto` por round são 4 strings opacas — **não** há contagem nem
  linha do tempo de habilidades por round; contagens só por partida.
- `MockRankSnapshot` / `MockRrPoint` — **sem equivalente oficial** (a Riot não
  expõe rank/RR atuais); existem só para o mock e somem com a chave.

## `access.ts` — estado neutro de perfil

`PRIVATE_PROFILE_MESSAGE` (`Este jogador não tornou o perfil público.`) e
`PROFILE_NOT_PUBLIC_CODE`. Fica em `contracts/` para que componentes client
importem a copy sem puxar o banco.

## `henrikdev.ts` — espelho da HenrikDev (fonte guardada)

Reflete o formato da API HenrikDev (v4/v2/v1) em `snake_case`. Usado só pela
fonte `henrikdev`, que está desligada. **Não é usado pelas páginas.**

- Constantes: `HENRIKDEV_AFFINITIES` (`eu | na | ap | kr | latam | br`),
  `HENRIKDEV_PLATFORMS` (`pc | console`), `COMPETITIVE_QUEUE_ID = 'competitive'`.
- Tipos-chave: `HenrikDevMatchV4` (`metadata`, `players[]`, `teams[]`,
  `rounds?`, `kills?`), `HenrikDevPlayerV4` (stats, agente, economia,
  `ability_casts`, tier), `HenrikDevRoundV4` (`winning_team`, `plant`,
  `defuse`; `id` 0-based), `HenrikDevKillV4` (round, tempos, killer, victim,
  assistants, weapon), `HenrikDevMmrHistoryEntryV2`, `HenrikDevAccountV1`,
  `HenrikDevMmrV2`.
- `MatchCombatStats` — forma **canônica pós-normalização** consumida pela
  analytics de combate: `kills, deaths, assists, roundsPlayed, headshots,
  bodyshots, legshots, score` (obrigatórios) + `kast?, firstBloods?,
  firstDeaths?, damageDealt?` (opcionais).

## `tracker.ts` — contrato interno estável

Formato normalizado (`camelCase`, valores derivados resolvidos) usado por
analytics e páginas.

| Tipo | Conteúdo |
| --- | --- |
| `MatchScoreboardRow` | uma linha por jogador: `puuid, name, tag, teamId, agent, tier, kills, deaths, assists, score, acs, hsPercentage, damageDealt, damageReceived, kastPercentage, economy, abilityCasts` |
| `MatchSummary` | linha do histórico: mapa, fila, temporada, agente, resultado, placar, stats, `roundsPlayed` |
| `MatchDetail` | detalhe completo: `teams`, `scoreboard`, `rounds`, `kills` |
| `MatchRound` | round independente de jogador (`winningTeamId`, `plantSite`, `plantTeamId`, `defused`) |
| `RoundOutcome` | round relativo a um jogador (`won`, `playerTeamId`) |
| `KillEvent` | abate com tempos, killer/victim, assistants, `weapon` + opcionais `victimLocation`, `killerLocation`, `playerLocations` |
| `MapPoint` / `PlayerPosition` | coordenada de mundo `{x, y}` / posição de um jogador com `viewRadians` |
| `MapZone` | zona jogável de um mapa (`label`, `side`, `polygon: MapPoint[]`) |
| `SpikeEvent` | plant/defuse: `playerPuuid`, `location`, `timeInRoundMs`, `site` (em `MatchRound.plant`/`defuse`) |
| `RoundEconomy` | economia de um jogador num round: `loadoutValue`, `weapon`, `armor`, `spent`, `remaining` (em `MatchDetail.economy`, com `MatchDetail.mapId`) |
| `GroupedStat` (= `AgentStat`/`MapStat`) | agregação por agente/mapa (`matches, wins, losses, winrate, avgKills, avgDeaths, avgAssists, kda, avgAcs, avgHsPercentage`) |
| `StreakSummary` / `TrendSummary` | sequências e tendência de ACS |
| `RrHistoryPoint` | ponto de RR (`rr`, `delta`, `tier`, `tierId`, `result: win/loss/neutral`, `date`) |

Valores derivados: `acs` (inteiro), `hsPercentage`, `kda`, `result`, `kastPercentage`
(`null` sem timeline), `roundNumber` 1-based. Os campos de posição, spike e
economia são **opcionais/anuláveis**: só a fonte com formato Riot os preenche.

## `coach.ts` — saída para o chatbot

### Envelope de 3 camadas

```ts
interface CoachInsight<TMetrics extends object = RawMetrics> {
  raw_metrics: TMetrics;                                        // 1
  contextual_rating: Partial<Record<keyof TMetrics, ContextualRating>>; // 2
  coaching_hooks: readonly string[];                            // 3
}
```

- **`raw_metrics`** — números exatos calculados. O constraint é `object`
  (não `Record<string, number>`) justamente para **omitir** chaves não
  computáveis em vez de emitir `null`/`0` enganosos.
- **`contextual_rating`** — classificação semântica por métrica com
  `CONTEXTUAL_RATINGS`: `Crítico | Abaixo da Média | Na Média | Acima da Média | Excelente`.
- **`coaching_hooks`** — strings pré-calculadas que guiam a IA de baixo custo.

### Envelope de erro

```ts
interface ApiErrorBody {
  error: { code: string; message: string; hint?: string };
}
```

Todas as rotas de API respondem erro neste formato; as páginas exibem o mesmo
contrato via `ErrorState`. A stack nunca vaza no body.

### Instância concreta

`PlayerCombatInsight extends CoachInsight<CombatRawMetrics>` acrescenta
`player: { region, name, tag, platform: 'pc' }` e
`evaluation: { aimClass, impactClass }`. Ver
[serviços](./servicos.md) e [métricas](./metricas.md).

## Fluxo cru → normalizado

```
Riot (riot.ts)  ──normalize-riot.ts──►  tracker.ts (camelCase)
                                                │
                                                ├─ analytics/**  ──► métricas
                                                └─ coaching/**   ──► CoachInsight
```
