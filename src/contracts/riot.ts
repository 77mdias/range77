/**
 * CONTRATO CRU — Riot Games API (VALORANT): ACCOUNT-V1, VAL-MATCH-V1.
 * ======================================================================
 *
 * Congelado campo a campo contra a referência OFICIAL do portal
 * `https://developer.riotgames.com/apis` (seções `account-v1`,
 * `val-match-v1` e `val-ranked-v1`), lida em 2026-10-21. A tabela
 * campo → tipo → fonte vive em `docs/referencia/riot-val-match-v1.md`.
 *
 * Regras deste arquivo:
 * - Só TIPOS. Nenhum cálculo/normalização aqui — o normalizador
 *   Riot → `tracker.ts` mapeia esta forma crua para o contrato interno.
 * - Nomes e aninhamento seguem a grafia oficial; apenas o prefixo `Riot`
 *   foi adicionado para evitar colisão com os DTOs da HenrikDev.
 * - O portal não marca opcionalidade. Campos que só fazem sentido quando o
 *   evento aconteceu (plant/defuse) são opcionais aqui; `stats`, `economy`
 *   e `ability` aceitam `null` (jogador observador / round sem registro).
 * - `int`/`long`/`float` oficiais viram `number`.
 *
 * Endpoints de referência:
 * - `GET /riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}` → AccountDto
 * - `GET /riot/account/v1/accounts/me` (RSO) → AccountDto
 * - `GET /val/match/v1/matchlists/by-puuid/{puuid}` → MatchlistDto
 * - `GET /val/match/v1/matches/{matchId}` → MatchDto
 */

// ---------------------------------------------------------------- ACCOUNT-V1

/** AccountDto oficial. `puuid` criptografado (78 caracteres). */
export interface RiotAccountDto {
  readonly puuid: string;
  /** Oficial: pode ser omitido se a conta não tiver gameName. */
  readonly gameName?: string;
  /** Oficial: pode ser omitido se a conta não tiver tagLine. */
  readonly tagLine?: string;
}

// ------------------------------------------------------- VAL-MATCH-V1 (lista)

/** MatchlistEntryDto oficial. */
export interface RiotMatchlistEntryDto {
  readonly matchId: string;
  readonly gameStartTimeMillis: number;
  readonly queueId: string;
}

/** MatchlistDto oficial. */
export interface RiotMatchlistDto {
  readonly puuid: string;
  readonly history: readonly RiotMatchlistEntryDto[];
}

// ----------------------------------------------------- VAL-MATCH-V1 (partida)

/** LocationDto oficial — coordenadas de mundo (`int`). */
export interface RiotLocationDto {
  readonly x: number;
  readonly y: number;
}

/** PlayerLocationsDto oficial — posição + direção da mira (radianos). */
export interface RiotPlayerLocationsDto {
  readonly puuid: string;
  readonly viewRadians: number;
  readonly location: RiotLocationDto;
}

/** FinishingDamageDto oficial. */
export interface RiotFinishingDamageDto {
  readonly damageType: string;
  readonly damageItem: string;
  readonly isSecondaryFireMode: boolean;
}

/** KillDto oficial. `killer`/`victim`/`assistants` são PUUIDs. */
export interface RiotKillDto {
  readonly timeSinceGameStartMillis: number;
  readonly timeSinceRoundStartMillis: number;
  readonly killer: string;
  readonly victim: string;
  readonly victimLocation: RiotLocationDto;
  readonly assistants: readonly string[];
  /** Posição + `viewRadians` dos jogadores vivos no instante do abate. */
  readonly playerLocations: readonly RiotPlayerLocationsDto[];
  readonly finishingDamage: RiotFinishingDamageDto;
}

/** DamageDto oficial. `receiver` é PUUID. */
export interface RiotDamageDto {
  readonly receiver: string;
  readonly damage: number;
  readonly legshots: number;
  readonly bodyshots: number;
  readonly headshots: number;
}

/** EconomyDto oficial (por jogador, por round). `weapon`/`armor` são ids. */
export interface RiotEconomyDto {
  readonly loadoutValue: number;
  readonly weapon: string;
  readonly armor: string;
  readonly remaining: number;
  readonly spent: number;
}

/**
 * AbilityDto oficial (por jogador, por round). Os quatro campos são
 * `string` de semântica NÃO documentada no portal — não há contagem nem
 * linha do tempo por round. Contagem de usos só existe no agregado da
 * partida (`RiotAbilityCastsDto`). Nunca simular timeline a partir disto.
 */
export interface RiotAbilityDto {
  readonly grenadeEffects: string | null;
  readonly ability1Effects: string | null;
  readonly ability2Effects: string | null;
  readonly ultimateEffects: string | null;
}

/** PlayerRoundStatsDto oficial. */
export interface RiotPlayerRoundStatsDto {
  readonly puuid: string;
  readonly kills: readonly RiotKillDto[];
  readonly damage: readonly RiotDamageDto[];
  readonly score: number;
  readonly economy: RiotEconomyDto | null;
  readonly ability: RiotAbilityDto | null;
}

/** RoundResultDto oficial. `roundNum` começa em 0. */
export interface RiotRoundResultDto {
  readonly roundNum: number;
  readonly roundResult: string;
  readonly roundCeremony: string;
  readonly winningTeam: string;
  readonly winningTeamRole: string;
  /** PUUID de quem plantou (ausente se não houve plant). */
  readonly bombPlanter?: string;
  /** PUUID de quem desarmou (ausente se não houve defuse). */
  readonly bombDefuser?: string;
  readonly plantRoundTime?: number;
  readonly plantPlayerLocations?: readonly RiotPlayerLocationsDto[];
  readonly plantLocation?: RiotLocationDto;
  readonly plantSite?: string;
  readonly defuseRoundTime?: number;
  readonly defusePlayerLocations?: readonly RiotPlayerLocationsDto[];
  readonly defuseLocation?: RiotLocationDto;
  readonly playerStats: readonly RiotPlayerRoundStatsDto[];
  readonly roundResultCode: string;
}

/** AbilityCastsDto oficial — contagem de usos NA PARTIDA (agregado). */
export interface RiotAbilityCastsDto {
  readonly grenadeCasts: number;
  readonly ability1Casts: number;
  readonly ability2Casts: number;
  readonly ultimateCasts: number;
}

/** PlayerStatsDto oficial (agregado da partida). */
export interface RiotPlayerStatsDto {
  readonly score: number;
  readonly roundsPlayed: number;
  readonly kills: number;
  readonly deaths: number;
  readonly assists: number;
  readonly playtimeMillis: number;
  readonly abilityCasts: RiotAbilityCastsDto | null;
}

/** PlayerDto oficial (VAL-MATCH-V1). */
export interface RiotPlayerDto {
  readonly puuid: string;
  readonly gameName: string;
  readonly tagLine: string;
  readonly teamId: string;
  readonly partyId: string;
  readonly characterId: string;
  readonly stats: RiotPlayerStatsDto | null;
  /** Tier competitivo NA PARTIDA (0 = sem rank). Não traz RR. */
  readonly competitiveTier: number;
  readonly isObserver: boolean;
  readonly playerCard: string;
  readonly playerTitle: string;
  readonly accountLevel: number;
}

/** CoachDto oficial. */
export interface RiotCoachDto {
  readonly puuid: string;
  readonly teamId: string;
}

/** TeamDto oficial. `teamId` é `Red`/`Blue` em modos com bomba. */
export interface RiotTeamDto {
  readonly teamId: string;
  readonly won: boolean;
  readonly roundsPlayed: number;
  readonly roundsWon: number;
  readonly numPoints: number;
}

/**
 * MatchInfoDto oficial. `premierMatchInfo` é listado pelo portal sem
 * definição de campos — fica opaco (`unknown`) e fora do escopo.
 */
export interface RiotMatchInfoDto {
  readonly matchId: string;
  readonly mapId: string;
  readonly gameVersion: string;
  readonly gameLengthMillis: number;
  readonly region: string;
  readonly gameStartMillis: number;
  readonly provisioningFlowId: string;
  readonly isCompleted: boolean;
  readonly customGameName: string;
  readonly queueId: string;
  readonly gameMode: string;
  readonly isRanked: boolean;
  readonly seasonId: string;
  readonly premierMatchInfo?: unknown;
}

/** MatchDto oficial. */
export interface RiotMatchDto {
  readonly matchInfo: RiotMatchInfoDto;
  readonly players: readonly RiotPlayerDto[];
  readonly coaches: readonly RiotCoachDto[];
  readonly teams: readonly RiotTeamDto[];
  readonly roundResults: readonly RiotRoundResultDto[];
}

// ------------------------------------------- RANK ATUAL (sem equivalente)

/**
 * Snapshot de rank ATUAL (tier + RR) de um jogador — EXCLUSIVO DO MOCK.
 *
 * SEM EQUIVALENTE OFICIAL — SOME QUANDO A CHAVE CHEGAR. A API oficial não
 * expõe tier/RR atual de um jogador arbitrário: VAL-RANKED-V1 só oferece o
 * leaderboard por ato (`/val/ranked/v1/leaderboards/by-act/{actId}`, topo
 * do ranking, com `rankedRating`) e VAL-MATCH-V1 só traz o
 * `competitiveTier` do jogador em cada partida (sem RR).
 */
export interface MockRankSnapshot {
  readonly puuid: string;
  /** Mesmo domínio de `RiotPlayerDto.competitiveTier` (0–27). */
  readonly competitiveTier: number;
  /** Ranked Rating no tier atual (0–100; acima disso só em Radiante). */
  readonly rankedRating: number;
  readonly seasonId: string;
}
