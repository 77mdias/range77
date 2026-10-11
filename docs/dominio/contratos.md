# Contratos

Três arquivos definem os formatos de dados que atravessam o sistema.
Localização: `src/contracts/`.

## `henrikdev.ts` — espelho do payload externo

Reflete o formato da API HenrikDev (v4/v2/v1) em `snake_case`, tolerando
campos extras em runtime. **Não é usado diretamente pelas páginas.**

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
| `KillEvent` | abate com tempos, killer/victim, assistants, `weapon` |
| `GroupedStat` (= `AgentStat`/`MapStat`) | agregação por agente/mapa (`matches, wins, losses, winrate, avgKills, avgDeaths, avgAssists, kda, avgAcs, avgHsPercentage`) |
| `StreakSummary` / `TrendSummary` | sequências e tendência de ACS |
| `RrHistoryPoint` | ponto de RR (`rr`, `delta`, `tier`, `tierId`, `result: win/loss/neutral`, `date`) |

Valores derivados: `acs` (inteiro), `hsPercentage`, `kda`, `result`, `kastPercentage`
(`null` sem timeline), `roundNumber` 1-based.

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
HenrikDev (snake_case)  ──normalize*.ts──►  tracker.ts (camelCase)
                                                │
                                                ├─ analytics/**  ──► métricas
                                                └─ coaching/**   ──► CoachInsight
```
