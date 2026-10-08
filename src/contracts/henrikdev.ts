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

export interface HenrikDevMatchMetadataV4 {
  readonly match_id: string;
  readonly map?: HenrikDevIdName;
  readonly queue?: {
    readonly id: string;
    readonly mode_type?: string | null;
    readonly name?: string | null;
  };
  readonly started_at?: string;
  readonly is_completed?: boolean;
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

export interface HenrikDevPlayerV4 {
  readonly puuid: string;
  readonly name?: string;
  readonly tag?: string;
  readonly team_id?: string;
  readonly stats: HenrikDevPlayerStatsV4;
}

export interface HenrikDevTeamV4 {
  readonly team_id: string;
  readonly rounds: { readonly won: number; readonly lost: number };
  readonly won: boolean;
}

export interface HenrikDevRoundPlayerRef {
  readonly puuid: string;
  readonly name?: string;
  readonly tag?: string;
}

export interface HenrikDevKillV4 {
  readonly round: number;
  readonly time_in_match_in_ms: number;
  readonly killer: HenrikDevRoundPlayerRef;
  readonly victim: HenrikDevRoundPlayerRef;
  readonly assistants?: readonly HenrikDevRoundPlayerRef[];
}

export interface HenrikDevMatchV4 {
  readonly metadata: HenrikDevMatchMetadataV4;
  readonly players: readonly HenrikDevPlayerV4[];
  readonly teams: readonly HenrikDevTeamV4[];
  readonly kills?: readonly HenrikDevKillV4[];
}

/** Corpo de sucesso documentado (toleramos também `data` vindo como raiz). */
export interface HenrikDevMatchesResponseV4 {
  readonly status: number;
  readonly data: readonly HenrikDevMatchV4[];
}
