# Referência — Riot VAL-MATCH-V1 / ACCOUNT-V1 / VAL-RANKED-V1

Contrato cru congelado em `src/contracts/riot.ts`. Fixture de referência:
`tests/fixtures/riot/match-v1.ts` (partida fictícia completa, Ascent 13–5).

## Fonte e data

- **Fonte oficial** lida em **2026-10-21**: portal
  `https://developer.riotgames.com/apis` (seções `val-match-v1`,
  `account-v1`, `val-ranked-v1`). Lida com Playwright: a página carrega
  cada seção via `GET /api-details/<api>`; as tabelas de DTO foram
  extraídas desse HTML.
- Legenda da coluna **Fonte**: `oficial` = tabela DTO do portal;
  `comunitária` = não consta no portal (valores observados em dados reais
  descritos pela comunidade) — revalidar quando a chave chegar.
- O portal **não** marca opcionalidade nem lista valores de enum. As
  decisões de `?`/`null` no contrato são nossas e estão na coluna Notas.
- Tipos oficiais `int`/`long`/`float` viram `number`; `List[X]` vira
  `readonly X[]`. Interfaces recebem o prefixo `Riot` (o oficial é sem
  prefixo, ex.: `MatchDto` → `RiotMatchDto`).

## Endpoints (oficial)

| Endpoint | Retorno |
| --- | --- |
| `GET /riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}` | `AccountDto` |
| `GET /riot/account/v1/accounts/by-puuid/{puuid}` | `AccountDto` |
| `GET /riot/account/v1/accounts/me` (token RSO) | `AccountDto` |
| `GET /val/match/v1/matchlists/by-puuid/{puuid}` | `MatchlistDto` |
| `GET /val/match/v1/matches/{matchId}` | `MatchDto` |
| `GET /val/match/v1/recent-matches/by-queue/{queue}` | `RecentMatchesDto` (fora do escopo) |
| `GET /val/ranked/v1/leaderboards/by-act/{actId}` | `LeaderboardDto` (fora do escopo) |

## Itens [a confirmar] do spec §4 — veredito

| Item do spec | Veredito | Fonte |
| --- | --- | --- |
| `roundResults[].playerStats[]` com `kills[]`, `damage[]`, `economy`, `ability` | **existe**, grafia idêntica | oficial |
| `victimLocation` no abate | **existe** (`LocationDto`) | oficial |
| `playerLocations[]` no abate com `viewRadians` | **existe** (`List[PlayerLocationsDto]`: `puuid`, `viewRadians: float`, `location`) | oficial |
| `plantLocation`/`defuseLocation` + `plantPlayerLocations`/`defusePlayerLocations` | **existe** | oficial |
| `economy`: `loadoutValue`, `weapon`, `armor`, `remaining`, `spent` | **existe**, todos (`int`/`string`) | oficial |
| Habilidades por round | **só `AbilityDto`** com 4 campos `string` de semântica não documentada (`grenadeEffects`, `ability1Effects`, `ability2Effects`, `ultimateEffects`). **Não há contagem nem timeline por round.** Contagem existe só no **agregado da partida** (`PlayerStatsDto.abilityCasts`: `grenadeCasts`, `ability1Casts`, `ability2Casts`, `ultimateCasts`). | oficial |
| Endpoint oficial com tier + RR atual do jogador | **não existe**. VAL-RANKED-V1 só tem leaderboard por ato (topo do ranking, `rankedRating`). VAL-MATCH-V1 traz `competitiveTier` por partida, sem RR. → tipo próprio `MockRankSnapshot` ("sem equivalente oficial — some quando a chave chegar"). `RiotRankedDto`/`RiotMmrHistoryPointDto` **não** foram criados. | oficial |

Consequência para o escopo: habilidade por round entra, no máximo, como
"houve/não houve efeito" opaco; **nunca** simular linha do tempo nem
contagem por round. Contagem só no total da partida.

## ACCOUNT-V1 — `AccountDto`

| Campo | Tipo | Existe? | Fonte | Notas |
| --- | --- | --- | --- | --- |
| `puuid` | string | sim | oficial | criptografado, 78 caracteres |
| `gameName` | string | sim | oficial | pode vir ausente → `?` |
| `tagLine` | string | sim | oficial | pode vir ausente → `?` |

## VAL-MATCH-V1 — `MatchlistDto` / `MatchlistEntryDto`

| Campo | Tipo | Existe? | Fonte |
| --- | --- | --- | --- |
| `puuid` | string | sim | oficial |
| `history` | `MatchlistEntryDto[]` | sim | oficial |
| `history[].matchId` | string | sim | oficial |
| `history[].gameStartTimeMillis` | long | sim | oficial |
| `history[].queueId` | string | sim | oficial |

## VAL-MATCH-V1 — `MatchDto`

| Campo | Tipo | Existe? | Fonte |
| --- | --- | --- | --- |
| `matchInfo` | `MatchInfoDto` | sim | oficial |
| `players` | `PlayerDto[]` | sim | oficial |
| `coaches` | `CoachDto[]` (`puuid`, `teamId`) | sim | oficial |
| `teams` | `TeamDto[]` | sim | oficial |
| `roundResults` | `RoundResultDto[]` | sim | oficial |

### `MatchInfoDto`

| Campo | Tipo | Existe? | Fonte | Notas |
| --- | --- | --- | --- | --- |
| `matchId` | string | sim | oficial | |
| `mapId` | string | sim | oficial | caminho de asset, ex. `/Game/Maps/Ascent/Ascent` (formato: comunitária) |
| `gameVersion` | string | sim | oficial | |
| `gameLengthMillis` | int | sim | oficial | |
| `region` | string | sim | oficial | |
| `gameStartMillis` | long | sim | oficial | |
| `provisioningFlowId` | string | sim | oficial | |
| `isCompleted` | boolean | sim | oficial | |
| `customGameName` | string | sim | oficial | |
| `queueId` | string | sim | oficial | ex. `competitive` |
| `gameMode` | string | sim | oficial | |
| `isRanked` | boolean | sim | oficial | |
| `seasonId` | string | sim | oficial | |
| `premierMatchInfo` | `List[PremierMatchDto]` | sim | oficial | DTO sem tabela no portal → `unknown`, opcional, fora do escopo |

### `PlayerDto`

| Campo | Tipo | Existe? | Fonte | Notas |
| --- | --- | --- | --- | --- |
| `puuid` | string | sim | oficial | |
| `gameName` | string | sim | oficial | |
| `tagLine` | string | sim | oficial | |
| `teamId` | string | sim | oficial | `Red`/`Blue` em modos com bomba |
| `partyId` | string | sim | oficial | |
| `characterId` | string | sim | oficial | UUID do agente |
| `stats` | `PlayerStatsDto` | sim | oficial | `| null` no contrato (observador) |
| `competitiveTier` | int | sim | oficial | tier na partida; sem RR |
| `isObserver` | boolean | sim | oficial | |
| `playerCard` | string | sim | oficial | |
| `playerTitle` | string | sim | oficial | |
| `accountLevel` | int | sim | oficial | |

### `PlayerStatsDto` (agregado da partida)

| Campo | Tipo | Existe? | Fonte |
| --- | --- | --- | --- |
| `score` | int | sim | oficial |
| `roundsPlayed` | int | sim | oficial |
| `kills` / `deaths` / `assists` | int | sim | oficial |
| `playtimeMillis` | int | sim | oficial |
| `abilityCasts` | `AbilityCastsDto` (`grenadeCasts`, `ability1Casts`, `ability2Casts`, `ultimateCasts`: int) | sim | oficial (`| null` no contrato) |

### `TeamDto`

| Campo | Tipo | Existe? | Fonte |
| --- | --- | --- | --- |
| `teamId` | string | sim | oficial |
| `won` | boolean | sim | oficial |
| `roundsPlayed` / `roundsWon` | int | sim | oficial |
| `numPoints` | int | sim | oficial |

### `RoundResultDto`

| Campo | Tipo | Existe? | Fonte | Notas |
| --- | --- | --- | --- | --- |
| `roundNum` | int | sim | oficial | começa em 0 (comunitária; a fixture assume) |
| `roundResult` | string | sim | oficial | valores `Eliminated`/`Bomb detonated`/`Bomb defused`: comunitária |
| `roundCeremony` | string | sim | oficial | |
| `winningTeam` | string | sim | oficial | |
| `winningTeamRole` | string | sim | oficial | `Attacker`/`Defender`: comunitária |
| `bombPlanter` | string (PUUID) | sim | oficial | `?` — só com plant |
| `bombDefuser` | string (PUUID) | sim | oficial | `?` — só com defuse |
| `plantRoundTime` | int | sim | oficial | `?` |
| `plantPlayerLocations` | `PlayerLocationsDto[]` | sim | oficial | `?` |
| `plantLocation` | `LocationDto` | sim | oficial | `?` |
| `plantSite` | string | sim | oficial | `?` |
| `defuseRoundTime` | int | sim | oficial | `?` |
| `defusePlayerLocations` | `PlayerLocationsDto[]` | sim | oficial | `?` |
| `defuseLocation` | `LocationDto` | sim | oficial | `?` |
| `playerStats` | `PlayerRoundStatsDto[]` | sim | oficial | |
| `roundResultCode` | string | sim | oficial | `Elimination`/`Detonate`/`Defuse`: comunitária |

### `PlayerRoundStatsDto`

| Campo | Tipo | Existe? | Fonte | Notas |
| --- | --- | --- | --- | --- |
| `puuid` | string | sim | oficial | |
| `kills` | `KillDto[]` | sim | oficial | |
| `damage` | `DamageDto[]` | sim | oficial | |
| `score` | int | sim | oficial | |
| `economy` | `EconomyDto` | sim | oficial | `| null` no contrato |
| `ability` | `AbilityDto` | sim | oficial | `| null` no contrato |

### `KillDto`

| Campo | Tipo | Existe? | Fonte |
| --- | --- | --- | --- |
| `timeSinceGameStartMillis` | int | sim | oficial |
| `timeSinceRoundStartMillis` | int | sim | oficial |
| `killer` | string (PUUID) | sim | oficial |
| `victim` | string (PUUID) | sim | oficial |
| `victimLocation` | `LocationDto` | sim | oficial |
| `assistants` | `string[]` (PUUIDs) | sim | oficial |
| `playerLocations` | `PlayerLocationsDto[]` | sim | oficial |
| `finishingDamage` | `FinishingDamageDto` (`damageType`, `damageItem`: string; `isSecondaryFireMode`: boolean) | sim | oficial |

Se `playerLocations` inclui ou não a vítima não é documentado; a fixture
lista os vivos **exceto** a vítima (comunitária — revalidar).

### `PlayerLocationsDto` / `LocationDto`

| Campo | Tipo | Existe? | Fonte |
| --- | --- | --- | --- |
| `puuid` | string | sim | oficial |
| `viewRadians` | float | sim | oficial |
| `location` | `LocationDto` | sim | oficial |
| `location.x` / `location.y` | int | sim | oficial |

Coordenadas são de **mundo** do jogo (não de minimapa); a projeção para o
mapa é responsabilidade do analytics (Task de projeção).

### `DamageDto`

| Campo | Tipo | Existe? | Fonte |
| --- | --- | --- | --- |
| `receiver` | string (PUUID) | sim | oficial |
| `damage` | int | sim | oficial |
| `legshots` / `bodyshots` / `headshots` | int | sim | oficial |

### `EconomyDto` (por jogador, por round)

| Campo | Tipo | Existe? | Fonte |
| --- | --- | --- | --- |
| `loadoutValue` | int | sim | oficial |
| `weapon` | string | sim | oficial |
| `armor` | string | sim | oficial |
| `remaining` | int | sim | oficial |
| `spent` | int | sim | oficial |

### `AbilityDto` (por jogador, por round)

| Campo | Tipo | Existe? | Fonte | Notas |
| --- | --- | --- | --- | --- |
| `grenadeEffects` | string | sim | oficial | semântica não documentada; `| null` no contrato |
| `ability1Effects` | string | sim | oficial | idem |
| `ability2Effects` | string | sim | oficial | idem |
| `ultimateEffects` | string | sim | oficial | idem |

## VAL-RANKED-V1 — por que não há `RiotRankedDto`

O único endpoint é `leaderboards/by-act/{actId}` → `LeaderboardDto`
(`shard`, `actId`, `totalPlayers`, `players[]` com `puuid`, `gameName`,
`tagLine`, `leaderboardRank`, `rankedRating`, `numberOfWins`). Cobre só
quem está no leaderboard do ato; não serve para "rank atual de qualquer
jogador". Por isso o mock usa `MockRankSnapshot` (`puuid`,
`competitiveTier`, `rankedRating`, `seasonId`), marcado no código como
**sem equivalente oficial — some quando a chave chegar**.
