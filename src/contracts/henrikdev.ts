/**
 * PASSO 1 — CONTRATO DE INPUT: dados de combate da HenrikDev.
 * ======================================================================
 *
 * Este é o contrato CANÔNICO pós-normalização: o futuro client HenrikDev
 * (services/henrikdev) será responsável por mapear o payload bruto da API
 * externa para estas interfaces — as funções de analytics só conhecem esta
 * forma, o que mantém o cálculo puro, determinístico e testável.
 *
 * Nota estatística importante: a HenrikDev (v3) NÃO fornece KAST por
 * partida. O campo existe como opcional para fontes/futuras versões que o
 * forneçam — quando ausente, o backend reporta `null` em vez de inventar
 * um número (rigor estatístico é requisito do produto).
 */

/**
 * Estatísticas de combate de UMA partida (visão do jogador analisado),
 * subconjunto de `players[].stats` da HenrikDev v3 já normalizado.
 */
export interface MatchCombatStats {
  /** Abates na partida. */
  readonly kills: number;
  /** Mortes na partida. */
  readonly deaths: number;
  /** Assistências na partida. */
  readonly assists: number;
  /** Rounds jogados na partida (mínimo 1 — partida válida). */
  readonly roundsPlayed: number;
  /** Headshots conectados. */
  readonly headshots: number;
  /** Tiros no corpo conectados. */
  readonly bodyshots: number;
  /** Tiros na perna conectados. */
  readonly legshots: number;
  /** Combat score total da partida (soma dos rounds). */
  readonly score: number;
  /** KAST da partida em % (0–100). Opcional: HenrikDev não fornece. */
  readonly kast?: number | undefined;
  /** First bloods (primeira morte do round causada). Opcional. */
  readonly firstBloods?: number | undefined;
  /** First deaths (primeira morte do round sofrida). Opcional. */
  readonly firstDeaths?: number | undefined;
  /** Dano total causado na partida (v4: players[].stats.damage.dealt). Opcional. */
  readonly damageDealt?: number | undefined;
}

/* ============================================================================
 * RAW v4 — espelho do subconjunto que consumimos da HenrikDev
 * (fonte: docs.henrikdev.xyz, OpenAPI 4.6.0 — get-matches-by-name-v4).
 * Campos que não usamos são omitidos; extras no runtime são tolerados.
 * ==========================================================================*/

/** Afinidades/porções de rede aceitas pela HenrikDev v4. */
export const HENRIKDEV_AFFINITIES = ['eu', 'na', 'ap', 'kr', 'latam', 'br'] as const;
export type HenrikDevAffinity = (typeof HENRIKDEV_AFFINITIES)[number];

/** Plataformas aceitas (a rota v1 do ValCoach usa apenas `pc`). */
export const HENRIKDEV_PLATFORMS = ['pc', 'console'] as const;
export type HenrikDevPlatform = (typeof HENRIKDEV_PLATFORMS)[number];

/** Fila alvo da analytics de combate (Ranqueada). */
export const COMPETITIVE_QUEUE_ID = 'competitive';

export interface HenrikDevIdName {
  readonly id: string;
  readonly name: string;
}

/** Temporada (combo id + rótulo curto) — usado para agrupar por ato/época. */
export interface HenrikDevSeasonV4 {
  readonly id: string;
  readonly short: string;
}

export interface HenrikDevMatchMetadataV4 {
  readonly match_id: string;
  readonly map?: HenrikDevIdName;
  readonly queue?: {
    readonly id: string;
    readonly mode_type?: string | null;
    readonly name?: string | null;
  };
  readonly season?: HenrikDevSeasonV4;
  readonly started_at?: string;
  readonly is_completed?: boolean;
  readonly game_length_in_ms?: number;
  readonly platform?: string;
  readonly region?: string | null;
}

export interface HenrikDevPlayerStatsV4 {
  readonly score: number;
  readonly kills: number;
  readonly deaths: number;
  readonly assists: number;
  readonly headshots: number;
  readonly bodyshots: number;
  readonly legshots: number;
  readonly damage?: { readonly dealt: number; readonly received: number };
}

/** Agente combinado id+nome (v4). */
export interface HenrikDevAgentV4 {
  readonly id: string;
  readonly name: string;
}

/** Uso de habilidades por partida (cada slot pode vir nulo). */
export interface HenrikDevAbilityCastsV4 {
  readonly ability1?: number | null;
  readonly ability2?: number | null;
  readonly grenade?: number | null;
  readonly ultimate?: number | null;
}

/** Economia agregada da partida (gasto total + valor de loadout). */
export interface HenrikDevPlayerEconomyV4 {
  readonly spent?: { readonly overall: number; readonly average: number };
  readonly loadout_value?: { readonly overall: number; readonly average: number };
}

/** Tier/elo do jogador naquela partida (id numérico + nome). */
export interface HenrikDevTierV4 {
  readonly id: number;
  readonly name: string;
}

export interface HenrikDevPlayerV4 {
  readonly puuid: string;
  readonly name?: string;
  readonly tag?: string;
  readonly team_id?: string;
  readonly agent?: HenrikDevAgentV4;
  readonly stats: HenrikDevPlayerStatsV4;
  readonly ability_casts?: HenrikDevAbilityCastsV4;
  readonly economy?: HenrikDevPlayerEconomyV4;
  readonly tier?: HenrikDevTierV4;
  readonly account_level?: number;
}

export interface HenrikDevTeamV4 {
  readonly team_id: string;
  readonly rounds: { readonly won: number; readonly lost: number };
  readonly won: boolean;
}

export interface HenrikDevRoundPlayerRef {
  readonly puuid: string;
  /** Time do jogador ("Red"/"Blue") — presente nos eventos de round/kill. */
  readonly team?: string;
  readonly name?: string;
  readonly tag?: string;
}

/** Arma de um abate (id/nome/tipo podem vir nulos para abates ambientais). */
export interface HenrikDevWeaponV4 {
  readonly id?: string | null;
  readonly name?: string | null;
  readonly type?: string | null;
}

export interface HenrikDevKillV4 {
  readonly round: number;
  readonly time_in_match_in_ms: number;
  /** Tempo dentro do round — usado para ordenar/desempatar timeline. */
  readonly time_in_round_in_ms?: number;
  readonly killer: HenrikDevRoundPlayerRef;
  readonly victim: HenrikDevRoundPlayerRef;
  readonly assistants?: readonly HenrikDevRoundPlayerRef[];
  readonly weapon?: HenrikDevWeaponV4;
}

/** Plant da spike em um round. */
export interface HenrikDevRoundPlantV4 {
  readonly round_time_in_ms: number;
  readonly site: string;
  readonly player: HenrikDevRoundPlayerRef;
}

/** Defuse da spike em um round. */
export interface HenrikDevRoundDefuseV4 {
  readonly round_time_in_ms: number;
  readonly player: HenrikDevRoundPlayerRef;
}

export interface HenrikDevRoundV4 {
  /** Índice do round (0-based na HenrikDev). */
  readonly id: number;
  /** Rótulo bruto (ex.: "Team1"/"Surrendered") — o vencedor confiável é `winning_team`. */
  readonly result?: string;
  readonly winning_team: string;
  readonly plant?: HenrikDevRoundPlantV4 | null;
  readonly defuse?: HenrikDevRoundDefuseV4 | null;
}

export interface HenrikDevMatchV4 {
  readonly metadata: HenrikDevMatchMetadataV4;
  readonly players: readonly HenrikDevPlayerV4[];
  readonly teams: readonly HenrikDevTeamV4[];
  readonly rounds?: readonly HenrikDevRoundV4[];
  readonly kills?: readonly HenrikDevKillV4[];
}

/** Corpo de sucesso documentado de UMA partida (v4 match_id). */
export interface HenrikDevMatchResponseV4 {
  readonly status: number;
  readonly data: HenrikDevMatchV4;
}

/** Corpo de sucesso documentado (toleramos também `data` vindo como raiz). */
export interface HenrikDevMatchesResponseV4 {
  readonly status: number;
  readonly data: readonly HenrikDevMatchV4[];
}

/* ============================================================================
 * RAW MMR HISTORY v2 — espelho de `/valorant/v2/mmr-history/*`
 * (fonte: docs.henrikdev.xyz, OpenAPI 4.6.0 — get-mmr-history-v2-by-name).
 * Cada entrada é uma partida competitiva recente com o movimento de RR.
 * ==========================================================================*/

export interface HenrikDevMmrHistoryEntryV2 {
  readonly tier?: HenrikDevTierV4;
  readonly match_id?: string;
  readonly map?: HenrikDevIdName;
  readonly season?: HenrikDevSeasonV4;
  /** RR dentro do tier atual (0–100) APÓS a partida. */
  readonly rr?: number;
  /** Variação de RR aplicada por esta partida (pode ser negativa ou zero). */
  readonly last_change?: number;
  /** MMR absoluto (elo) quando disponível. */
  readonly elo?: number;
  readonly refunded_rr?: number;
  readonly was_derank_protected?: boolean;
  readonly date?: string;
}

export interface HenrikDevMmrHistoryResponseV2 {
  readonly status: number;
  readonly data?: {
    readonly account?: {
      readonly name?: string;
      readonly tag?: string;
      readonly puuid?: string;
    };
    readonly history?: readonly HenrikDevMmrHistoryEntryV2[];
  };
}
