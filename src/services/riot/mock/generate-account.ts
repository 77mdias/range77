import type {
  MockRankSnapshot,
  MockRrPoint,
  RiotAccountDto,
  RiotMatchlistDto,
  RiotMatchlistEntryDto,
} from '@/contracts/riot';
import { planMatch } from './match-plan';
import { createRng, mockUuid, seedFromRiotId, seedOf } from './rng';

/**
 * Contas, matchlist, rank atual e histórico de RR SIMULADOS — tudo
 * derivado da semente do Riot ID (determinístico, sem relógio).
 */

/** Conta fictícia fixa do perfil de demonstração. */
export const DEMO_ACCOUNT = { gameName: 'ValCoachDemo', tagLine: 'DEMO', region: 'br' } as const;

/** Teto do matchlist simulado (também limita a busca reversa de ids). */
export const MOCK_MATCHLIST_MAX = 500;

/** Âncora temporal fixa: a partida mais recente termina antes disto. */
export const MOCK_ANCHOR_MILLIS = Date.UTC(2026, 9, 20, 23, 0, 0);

export const MOCK_SEASON_ID = '4c4b8cff-43eb-13d3-8f14-96b783c90cd2';
export const MOCK_QUEUE_ID = 'competitive';

/** Faixa de tiers do mock (Ferro 1 .. Imortal 1). */
const TIER_MIN = 3;
const TIER_MAX = 24;

const HOUR = 3_600_000;

function accountSeed(account: RiotAccountDto): number {
  return account.gameName !== undefined && account.tagLine !== undefined
    ? seedFromRiotId(account.gameName, account.tagLine)
    : seedOf('puuid', account.puuid);
}

export function generateAccount(name: string, tag: string): RiotAccountDto {
  const puuid = mockUuid(createRng(seedOf('puuid', seedFromRiotId(name, tag))));
  return { puuid, gameName: name, tagLine: tag };
}

/** `matchId` (UUID) da i-ésima partida mais recente da conta. */
export function mockMatchId(account: RiotAccountDto, index: number): string {
  return mockUuid(createRng(seedOf('match', accountSeed(account), index)));
}

/** Índice do `matchId` no matchlist da conta, ou `null` se não for dela. */
export function mockMatchIndex(matchId: string, account: RiotAccountDto): number | null {
  const id = matchId.toLowerCase();
  for (let i = 0; i < MOCK_MATCHLIST_MAX; i += 1) {
    if (mockMatchId(account, i) === id) return i;
  }
  return null;
}

/** Início das partidas 0..count-1 (mais recente primeiro, sempre decrescente). */
function matchStarts(account: RiotAccountDto, count: number): number[] {
  const seed = accountSeed(account);
  const starts: number[] = [];
  let cursor = MOCK_ANCHOR_MILLIS;
  for (let i = 0; i < count; i += 1) {
    const rng = createRng(seedOf('gap', seed, i));
    // Entre partidas: às vezes em sequência (~50min), às vezes dias depois.
    const gap = rng.next() < 0.55 ? rng.int(45, 70) * 60_000 : rng.int(4 * HOUR, 52 * HOUR);
    cursor -= gap;
    starts.push(cursor);
  }
  return starts;
}

/** Início da i-ésima partida da conta (mesmo valor do matchlist). */
export function mockMatchStart(account: RiotAccountDto, index: number): number {
  return matchStarts(account, index + 1)[index] as number;
}

const clampCount = (count: number): number => Math.max(0, Math.min(MOCK_MATCHLIST_MAX, Math.floor(count)));

export function generateMatchlist(account: RiotAccountDto, count: number): RiotMatchlistDto {
  const n = clampCount(count);
  const starts = matchStarts(account, n);
  const history: RiotMatchlistEntryDto[] = starts.map((start, i) => ({
    matchId: mockMatchId(account, i),
    gameStartTimeMillis: start,
    queueId: MOCK_QUEUE_ID,
  }));
  return { puuid: account.puuid, history };
}

export function generateRankSnapshot(account: RiotAccountDto): MockRankSnapshot {
  const rng = createRng(seedOf('rank', accountSeed(account)));
  return {
    puuid: account.puuid,
    competitiveTier: rng.int(9, 20),
    rankedRating: rng.int(0, 99),
    seasonId: MOCK_SEASON_ID,
  };
}

/**
 * Histórico de RR, MAIS RECENTE PRIMEIRO (alinhado ao matchlist). Parte do
 * snapshot atual e caminha para trás desfazendo cada variação; o sinal da
 * variação segue o resultado do foco na partida (`planMatch`).
 */
export function generateRrHistory(account: RiotAccountDto, count: number): MockRrPoint[] {
  const n = clampCount(count);
  const snapshot = generateRankSnapshot(account);
  const starts = matchStarts(account, n);
  const points: MockRrPoint[] = [];
  let tier = snapshot.competitiveTier;
  let rr = snapshot.rankedRating;

  for (let i = 0; i < n; i += 1) {
    const matchId = mockMatchId(account, i);
    const plan = planMatch(matchId);
    const rng = createRng(seedOf('rr', matchId, account.puuid));
    const earned = plan.winner === plan.focusTeam ? rng.int(14, 28) : -rng.int(10, 24);

    let beforeTier = tier;
    let beforeRr = rr - earned;
    if (beforeRr < 0) {
      if (beforeTier > TIER_MIN) {
        beforeTier -= 1;
        beforeRr += 100;
      } else beforeRr = 0;
    } else if (beforeRr > 99) {
      if (beforeTier < TIER_MAX) {
        beforeTier += 1;
        beforeRr -= 100;
      } else beforeRr = 99;
    }

    points.push({
      matchId,
      matchStartMillis: starts[i] as number,
      tierBeforeUpdate: beforeTier,
      tierAfterUpdate: tier,
      rankedRatingAfterUpdate: rr,
      rankedRatingEarned: earned,
    });
    tier = beforeTier;
    rr = beforeRr;
  }
  return points;
}

/** Tier do jogador NA partida `index` (antes do resultado dela). */
export function mockTierAtMatch(account: RiotAccountDto, index: number): number {
  return (generateRrHistory(account, index + 1)[index] as MockRrPoint).tierBeforeUpdate;
}
