import type { HenrikDevMmrV3SeasonEntry, MatchCombatStats } from '@/contracts/henrikdev';
import type { RiotAccountDto, RiotMatchDto } from '@/contracts/riot';
import type { MatchSummary } from '@/contracts/tracker';
import { resolveActMatchSample, type ActSampleOptions } from '@/services/analytics/act-window';
import {
  MOCK_SEASON_ID,
  generateAccount,
  generateMatch,
  generateMatchlist,
  generateRankSnapshot,
  generateRrHistory,
  mockMatchId,
  mockMatchIndex,
} from '@/services/riot/mock';
import { createRng, seedOf } from '@/services/riot/mock/rng';
import {
  normalizeRiotMatchToCombat,
  normalizeRiotMatchToDetail,
  normalizeRiotMatchToSummary,
  normalizeRiotRank,
  normalizeRiotRrHistory,
} from '@/services/riot/normalize-riot';
import {
  TrackerNotFoundError,
  type MatchFocus,
  type PlayerSample,
  type PlayerSampleQuery,
  type TrackerSource,
} from '@/services/tracker/source';

/**
 * Fonte SIMULADA (padrão) — partidas no formato Riot VAL-MATCH-V1 geradas de
 * forma determinística a partir do Riot ID (caixa ignorada) e normalizadas
 * pelo MESMO normalizador que servirá a API oficial. Sem rede, sem estado,
 * sem banco: o `matchId` (UUID) é derivado do foco + índice, então o detalhe
 * é regenerado a partir do foco — por isso `getMatchDetail` o exige.
 */

/** Amostra padrão quando a consulta não informa `size`. */
const DEFAULT_SIZE = 5;

/** Pontos mínimos da trajetória de RR (como um MMR history de verdade). */
const MOCK_RR_HISTORY_MIN = 20;

/** Faixa de partidas jogadas no ato atual (simulada por conta). */
const ACT_GAMES_MIN = 10;
const ACT_GAMES_MAX = 45;

/**
 * Tamanho da amostra por ATO: a contagem de partidas do ato é SIMULADA
 * (determinística por conta) e dimensionada pela MESMA regra da analytics
 * (`resolveActMatchSample`: teto + fallback) que serve a HenrikDev.
 */
function actSampleSize(account: RiotAccountDto, options: ActSampleOptions): number {
  const games = createRng(seedOf('act-games', account.puuid)).int(ACT_GAMES_MIN, ACT_GAMES_MAX);
  const seasonal: readonly HenrikDevMmrV3SeasonEntry[] = [
    { season: { id: MOCK_SEASON_ID, short: MOCK_SEASON_ID }, games },
  ];
  return resolveActMatchSample(MOCK_SEASON_ID, seasonal, options);
}

const isPresent = <T>(value: T | null): value is T => value !== null;

/** Nível de conta do foco, lido da partida mais recente. */
function focusLevel(matches: readonly RiotMatchDto[], puuid: string): number | null {
  const player = matches[0]?.players.find((candidate) => candidate.puuid === puuid);
  return player?.accountLevel ?? null;
}

export function createMockSource(): TrackerSource {
  return {
    kind: 'mock',

    async getPlayerSample(query: PlayerSampleQuery): Promise<PlayerSample> {
      const { region, name, tag, size = DEFAULT_SIZE } = query;
      const account = generateAccount(name, tag);
      const count =
        query.actSample !== undefined ? actSampleSize(account, query.actSample) : size;

      const raw = generateMatchlist(account, count).history.map((entry) =>
        generateMatch(entry.matchId, account),
      );

      const matches: MatchSummary[] = raw
        .map((match) => normalizeRiotMatchToSummary(match, account.puuid, region))
        .filter(isPresent);
      const combat: MatchCombatStats[] = raw
        .map((match) => normalizeRiotMatchToCombat(match, account.puuid))
        .filter(isPresent);

      return {
        matches,
        combat,
        details: [],
        level: focusLevel(raw, account.puuid),
        cardSrc: null,
        rank: normalizeRiotRank(generateRankSnapshot(account)),
        rrHistory: normalizeRiotRrHistory(
          generateRrHistory(account, Math.max(count, MOCK_RR_HISTORY_MIN)),
        ),
      };
    },

    async getMatchDetail(region: string, matchId: string, focus?: MatchFocus) {
      if (focus === undefined) {
        throw new TrackerNotFoundError(
          `Partida simulada ${matchId} exige o jogador em foco (?player=Nome#Tag).`,
        );
      }
      const account = generateAccount(focus.name, focus.tag);
      const index = mockMatchIndex(matchId, account);
      if (index === null) {
        throw new TrackerNotFoundError(
          `Partida simulada ${matchId} não pertence ao histórico de ${focus.name}#${focus.tag}.`,
        );
      }
      // Id canônico (minúsculo) → mesma partida byte a byte do histórico.
      return normalizeRiotMatchToDetail(
        generateMatch(mockMatchId(account, index), account),
        region,
      );
    },

    async getPlayerCard() {
      // O mock não tem arte de cartão: a UI cai no fallback.
      return null;
    },
  };
}
