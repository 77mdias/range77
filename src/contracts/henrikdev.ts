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
