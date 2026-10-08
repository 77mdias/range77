/**
 * Contratos NORMALIZADOS do tracker (saída dos normalizadores HenrikDev v4).
 *
 * Diferente de `contracts/henrikdev.ts` (espelho do payload bruto), estas
 * formas são estáveis e independentes do fornecedor: as agregações puras
 * (`services/analytics/tracker-aggregations.ts`) e as páginas só conhecem
 * estes tipos.
 */

export type MatchResult = 'win' | 'loss';

/** Contagem normalizada de casts de habilidade (slots nulos viram 0). */
export interface AbilityCastCounts {
  readonly ability1: number;
  readonly ability2: number;
  readonly grenade: number;
  readonly ultimate: number;
}

/** Economia normalizada da partida. */
export interface EconomySummary {
  readonly spent: number;
  readonly loadoutValue: number;
}

/** Uma linha do scoreboard (qualquer jogador da partida). */
export interface MatchScoreboardRow {
  readonly puuid: string;
  readonly name: string;
  readonly tag: string;
  readonly teamId: string;
  readonly agent: string;
  readonly tier: string | null;
  readonly kills: number;
  readonly deaths: number;
  readonly assists: number;
  /** Combat score total da partida. */
  readonly score: number;
  /** Average Combat Score por round (inteiro). */
  readonly acs: number;
  /** Headshot % sobre tiros conectados; `null` se não houve tiro. */
  readonly hsPercentage: number | null;
  readonly damageDealt: number;
  readonly damageReceived: number;
  readonly economy: EconomySummary | null;
  readonly abilityCasts: AbilityCastCounts | null;
}

/** Resultado de um round em relação a um jogador analisado. */
export interface RoundOutcome {
  /** Número do round (1-based, para exibição). */
  readonly roundNumber: number;
  readonly won: boolean;
  readonly winningTeamId: string;
  readonly playerTeamId: string;
  readonly plantSite: string | null;
  readonly defused: boolean;
}

/** Resultado de um round independente de jogador (detalhe da partida). */
export interface MatchRound {
  readonly roundNumber: number;
  readonly winningTeamId: string;
  readonly plantSite: string | null;
  readonly defused: boolean;
}

/** Linha do histórico de partidas do jogador. */
export interface MatchSummary {
  readonly matchId: string;
  readonly region: string;
  readonly map: string;
  readonly queue: string;
  readonly season: string | null;
  readonly startedAt: string;
  readonly gameLengthMs: number;
  readonly result: MatchResult;
  readonly agent: string | null;
  readonly teamId: string;
  readonly score: { readonly us: number; readonly them: number };
  readonly kills: number;
  readonly deaths: number;
  readonly assists: number;
  readonly acs: number;
  readonly hsPercentage: number | null;
  readonly roundsPlayed: number;
}

/** Evento de abate normalizado (timeline do detalhe). */
export interface KillEvent {
  readonly roundNumber: number;
  readonly timeInMatchMs: number;
  readonly timeInRoundMs: number | null;
  readonly killerPuuid: string;
  readonly killerName: string;
  readonly victimPuuid: string;
  readonly victimName: string;
  readonly assistantNames: readonly string[];
  readonly weapon: string | null;
}

/** Time normalizado no detalhe da partida. */
export interface MatchTeamSummary {
  readonly teamId: string;
  readonly won: boolean;
  readonly roundsWon: number;
  readonly roundsLost: number;
}

/** Detalhe completo de uma partida (endpoint /api/matches). */
export interface MatchDetail {
  readonly matchId: string;
  readonly region: string;
  readonly map: string;
  readonly queue: string;
  readonly season: string | null;
  readonly startedAt: string;
  readonly gameLengthMs: number;
  readonly isCompleted: boolean;
  readonly teams: readonly MatchTeamSummary[];
  readonly scoreboard: readonly MatchScoreboardRow[];
  readonly rounds: readonly MatchRound[];
  readonly kills: readonly KillEvent[];
}

/** Agregação por agente ou por mapa (mesma forma). */
export interface GroupedStat {
  readonly key: string;
  readonly matches: number;
  readonly wins: number;
  readonly losses: number;
  /** Vitórias / partidas em % (0–100, 1 casa). */
  readonly winrate: number;
  readonly avgKills: number;
  readonly avgDeaths: number;
  readonly avgAssists: number;
  /** (kills+assists)/deaths — deaths=0 → kills+assists (nunca Infinity). */
  readonly kda: number;
  /** Média de ACS por partida (inteiro). */
  readonly avgAcs: number;
  /** Média das partidas com HS% computável; `null` se nenhuma. */
  readonly avgHsPercentage: number | null;
}

export type AgentStat = GroupedStat;

export type MapStat = GroupedStat;

/** Streaks de vitória/derrota calculados em ordem cronológica. */
export interface StreakSummary {
  readonly current: { readonly result: MatchResult | 'none'; readonly length: number };
  readonly longestWin: number;
  readonly longestLoss: number;
}

/** Tendência de uma métrica ao longo das partidas (ordem cronológica). */
export interface TrendSummary {
  readonly metric: 'acs';
  readonly direction: 'up' | 'down' | 'flat';
  readonly first: number;
  readonly last: number;
  readonly delta: number;
  readonly perMatch: readonly number[];
}
