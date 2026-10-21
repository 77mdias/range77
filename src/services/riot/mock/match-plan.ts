import { MOCK_MAPS } from './map-zones';
import { createRng, seedOf, shuffle } from './rng';

/**
 * ROTEIRO de uma partida simulada, derivado só do `matchId`: mapa, time do
 * foco, vencedor e a sequência de vencedores de round. É barato de calcular,
 * então o histórico de RR consulta o resultado sem gerar a partida inteira —
 * e `generateMatch` segue exatamente o mesmo roteiro.
 */

export type TeamId = 'Red' | 'Blue';

export interface MatchPlan {
  readonly mapIndex: number;
  readonly focusTeam: TeamId;
  readonly winner: TeamId;
  /** Vencedor de cada round, na ordem (`roundNum` 0-based). */
  readonly roundWinners: readonly TeamId[];
}

export const otherTeam = (team: TeamId): TeamId => (team === 'Red' ? 'Blue' : 'Red');

/** Placar do perdedor em tempo regulamentar (pesos favorecem jogos disputados). */
const LOSER_ROUNDS = [1, 2, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11] as const;

export function planMatch(matchId: string): MatchPlan {
  const rng = createRng(seedOf('plan', matchId.toLowerCase()));
  const mapIndex = rng.int(0, MOCK_MAPS.length - 1);
  const focusTeam: TeamId = rng.next() < 0.5 ? 'Red' : 'Blue';
  const focusWins = rng.next() < 0.52;
  const winner = focusWins ? focusTeam : otherTeam(focusTeam);
  const loser = otherTeam(winner);

  let roundWinners: TeamId[];
  if (rng.next() < 0.14) {
    // Overtime: 12–12, depois pares divididos e o par decisivo do vencedor.
    roundWinners = shuffle(rng, [...Array<TeamId>(12).fill(winner), ...Array<TeamId>(12).fill(loser)]);
    const splitPairs = rng.next() < 0.6 ? 0 : rng.int(1, 3);
    for (let i = 0; i < splitPairs; i += 1) {
      roundWinners.push(...(rng.next() < 0.5 ? [winner, loser] : [loser, winner]));
    }
    roundWinners.push(winner, winner);
  } else {
    const loserRounds = rng.pick(LOSER_ROUNDS);
    roundWinners = shuffle(rng, [...Array<TeamId>(12).fill(winner), ...Array<TeamId>(loserRounds).fill(loser)]);
    roundWinners.push(winner);
  }

  return { mapIndex, focusTeam, winner, roundWinners };
}
