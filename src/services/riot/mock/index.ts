/**
 * Mock determinístico da Riot API (VAL-MATCH-V1 + ACCOUNT-V1) — fachada.
 * Tudo aqui é SIMULADO e só usa nomes fictícios.
 */
export { createRng, fnv1a, mockUuid, seedFromRiotId, type Rng } from './rng';
export { MOCK_AGENTS, MOCK_ROSTER, type MockAgent, type MockRosterPlayer } from './roster';
export { MOCK_MAPS, type MockMap } from './map-zones';
export { buyLoadout, buyTypeForCredits, lossBonus, type BuyType } from './economy';
export { planMatch, type MatchPlan, type TeamId } from './match-plan';
export {
  DEMO_ACCOUNT,
  MOCK_ANCHOR_MILLIS,
  MOCK_MATCHLIST_MAX,
  MOCK_SEASON_ID,
  generateAccount,
  generateMatchlist,
  generateRankSnapshot,
  generateRrHistory,
  mockMatchId,
  mockMatchIndex,
} from './generate-account';
export { attackersOf, generateMatch } from './generate-match';
