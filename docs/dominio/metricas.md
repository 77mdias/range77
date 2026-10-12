# Métricas derivadas

A HenrikDev/Riot não expõem todas as métricas exibidas. As que têm fonte
derivável são computadas em `src/services/analytics/**` (cobertura **100%**);
o resto vira `—` ou é omitido — **nunca** um número inventado.

> Convenções gerais: `roundTo(v, d)` arredonda para `d` casas; divisões por
> zero retornam `null`/valor finito (nunca `Infinity`); métricas não
> computáveis são omitidas do `raw_metrics`.

## KAST% — `kast.ts`

`KAST% = (rounds com K ∨ A ∨ S ∨ T / total de rounds) × 100`

- **K**ill — o jogador matou alguém no round.
- **A**ssist — assistiu um abate no round.
- **S**urvived — não morreu no round.
- **T**raded — morreu e um **companheiro** matou o assassino ainda no mesmo round.

Derivado de `rounds[]` + `kills[]`. Sem rounds, sem times ou sem kills → mapa
**vazio** (a view mostra `—`), nunca 100% falso. Resultado com 1 casa
(`round(count / total * 1000) / 10`).

Na agregação de combate, o KAST é **ponderado por `roundsPlayed`**; se nenhuma
partida fornece, `kast = null` e a chave é omitida.

## Rating ValCoach — `rating.ts`

Métrica **composta** (não oficial) normalizada para que o jogador médio em
todas as dimensões receba exatamente **1.00**:

| Dimensão | Cálculo | Referência | Peso |
| --- | --- | --- | --- |
| Kill | KPR / ref | 0.70 | 0.35 |
| Assist | APR / ref | 0.25 | 0.10 |
| Survival | (1 − DPR) / ref | 0.50 | 0.20 |
| KAST | (KAST%/100) / ref | 0.70 | 0.20 |
| Entry | FKPR / ref | 0.13 | 0.15 |

`KPR = kills/rounds`, `APR = assists/rounds`,
`DPR = deaths/rounds`, `survivalRate = max(0, 1 − DPR)`. As dimensões sem
dado são **excluídas** e os pesos renormalizados (`weightSum`) — nunca
preenchidas com zero. `rounds` inválido/≤0 → `null`. Arredondamento 2 casas.

## ADR (dano por round) — `adr.ts`

`ADR = Σ damageDealt / Σ roundsPlayed`, contando **apenas** partidas com
`damageDealt` definido (numerador e denominador). 1 casa.

Sem nenhuma partida com dano → `adr = null`, somas `0`, chaves omitidas no
envelope; o hook instrui a **não estimar**. Benchmarks: 160 / 145 / 130 / 115 / 0.
Amostra `< 5` gera hook de baixa confiabilidade.

> `computeAdr(damageDealt, roundsPlayed)` (em `match-breakdown.ts`) é o
> correspondente **por partida**: `roundsPlayed ≤ 0 → null`.

## Combate — `combat.ts`

- `kdr = deaths === 0 ? kills : kills/deaths` (nunca `Infinity`), 2 casas.
- `kpr = kills/rounds` (2 casas); `acs = round(score/rounds)` (inteiro).
- `hsPercentage = headshots / (headshots + bodyshots + legshots) * 100` (1 casa);
  sem tiros → `null`.
- First bloods/deaths: se **nenhuma** partida tem timeline, ambos `null`;
  senão somatórios (`?? 0`).
- Avaliações: `classifyAim` (`≥25 Excelente`, `≥18 Regular`, senão `Crítico`;
  `null → Indeterminado`) e `classifyImpact` (`≥230 Carregador`,
  `≥180 Equilibrado`, senão `Passivo`).
- Benchmarks por métrica (Excelente/Acima/Na Média/Abaixo/Crítico):
  `kdr` 1.4/1.15/0.95/0.75/0 · `kpr` 0.85/0.75/0.65/0.55/0 ·
  `acs` 250/215/175/140/0 · `hs%` 28/23/18/13/0 · `kast` 78/72/66/58/0.

## Entry (agressividade de entrada) — `entry.ts`

- `attempts = firstBloods + firstDeaths`
- `entryRatio = firstBloods / attempts` (0/0 → `null`), 2 casas
- `entryRatePerRound = firstBloods / rounds`
- `killDeathEntryRatio = firstDeaths === 0 ? firstBloods : firstBloods/firstDeaths`
- Classificação: `≥0.55 Agressivo`, `≥0.45 Equilibrado`, senão `Recuado`;
  `null → Indeterminado`.
- Sem timeline em nenhuma partida → **todas** as métricas `null`,
  `Indeterminado`, chaves omitidas.

## Consistência de ACS — `consistency.ts`

Sobre ACS **por partida** (`score/roundsPlayed`, sem peso de rounds):

- `average = Σ acs / n`
- `variance = Σ (acs − average)² / n` (**populacional**)
- `stdDeviation = sqrt(variance)`
- `coefficientVariation = average === 0 ? null : stdDeviation/average` (2 casas)

Classificação por CV: `<0.1 Muito estável`, `<0.25 Estável`, senão `Volátil`;
`n < 2` ou CV `null` → `Indeterminado`. Benchmarks avaliados sobre `1 − CV`.

## Evolução entre snapshots — `evolution.ts`

Regra das **metades**: `newerCount = ceil(n/2)`; baseline = metade mais antiga,
current = metade mais recente (com 2 snapshots degenera em comparação direta).

- `delta = current − baseline`; tendência por threshold absoluto:
  `kdr 0.08 · kpr 0.05 · acs 10 · hs% 1.5 · kast 3 · fbRatio 0.15`.
- Métrica com qualquer metade sem dados é **omitida**.
- `contextual_rating` usa o benchmark **absoluto** do valor `current`
  (exceto `fbRatio`).
- `window` = ISO do primeiro ao último `createdAt`; `<3` snapshots → hook de
  histórico curto.

## Agregações do tracker — `tracker-aggregations.ts`

- `winrate = wins/total*100` (1 casa; `total ≤ 0 → 0`).
- `kda = deaths === 0 ? (kills+assists) : (kills+assists)/deaths` (2 casas).
- `avgAcs = round(média)`; `avgHsPercentage` = média das partidas com HS%
  (1 casa) ou `null`; `avgKills/avgDeaths/avgAssists` com 2 casas.
- `firstBloodRate = firstBloods/rounds` (`rounds ≤ 0 → 0`).
- Agrupamento por agente/mapa (agente nulo → `"Desconhecido"`), ordenado por
  `matches` desc; streaks (atual/maior vitória/maior derrota) e tendência de
  ACS (direção `up/down/flat`).

## Status do map pool e splits por lado

- `buildMapCardProfiles` classifica cada mapa por faixa de WR real
  (`MAP_WINRATE_BANDS`): melhor ≥60 · positivo ≥55 · estável ≥50 · neutro ≥45 ·
  desfavorável ≥30 · pior <30. A amostra segue visível no card ("Partidas").
- `buildMapSideStats` agrega os `halves` (DEF/ATK) de cada partida por mapa,
  ponderando por **rounds**; lado sem rounds computáveis → `null`. Os splits
  nascem do `MatchSummary.halves` (ver
  [partida e rounds](./partida-e-rounds.md)).

## Breakout da partida — `match-breakdown.ts`

- **First bloods/deaths** (`computeFirstBloods`) — primeiro abate de cada round
  (menor `timeInMatchMs`, desempate por `timeInRoundMs`, `null` = `+∞`).
- **Armas** (`aggregateWeaponKills(kills, killerPuuid?)`) — `sharePercent`,
  `firstKills` e `rounds` com abate; armas `null`/vazias excluídas do
  denominador. Dano/HS por arma **não** existem no payload.
- **MVP** (`selectMatchMvp`) — maior ACS; desempate por kills; depois nome.
- **Rank range** (`computeRankRange`) — menor–maior tier reconhecido do
  scoreboard, via `formatRankChip` (`"DIA 3 — IMM 2"`); tier único → chip único;
  nenhum reconhecido → `null`.
- **Totais de time** (`computeTeamTotals`) — dano/kills/deaths/assists por time.

## Gráficos — `chart-transforms.ts`

- `valueDomain`: vazio `[0,1]`; plano `±1`; senão padding
  `max(span*0.05, 0.5)` (2 casas).
- Barra de winrate ordenada por winrate → matches → key.
- Célula de heatmap: cor por `winningTeamId === teamId`; intensidade = abates do round.
- Radar do agente: tetos Winrate 100 / KDA 5 / ACS 350 / HS% 50;
  `value = clamp01(min(v, cap)/cap)`; `baseline` = média normalizada do elenco;
  agente ausente → `null`.
- `radarPolygonPoints`: primeiro eixo no topo (−90°), sentido horário.

Ver [partida e rounds](./partida-e-rounds.md) para o split DEF/ATK e a timeline.
