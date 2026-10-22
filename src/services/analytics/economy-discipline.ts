import type { MatchDetail } from '@/contracts/tracker';
import { classifyBuy, classifyTeamBuy, type BuyType } from './buy-type';

export interface EconomyDiscipline {
  forcedWhileTeamSaved: number;
  savedWhileTeamBought: number;
  rounds: number;
  winRateByBuy: Record<BuyType, number | null>;
}

const BUYS: readonly BuyType[] = ['pistol', 'eco', 'force', 'full'];

// forcedWhileTeamSaved: própria compra force/full com time eco; savedWhileTeamBought:
// própria eco com time force/full. Pistol não conta. winRateByBuy = vitórias do time por compra do time.
export function computeEconomyDiscipline(
  details: readonly MatchDetail[],
  puuid: string,
): EconomyDiscipline {
  let forced = 0;
  let saved = 0;
  let rounds = 0;
  const played: Record<BuyType, number> = { pistol: 0, eco: 0, force: 0, full: 0 };
  const won: Record<BuyType, number> = { pistol: 0, eco: 0, force: 0, full: 0 };

  for (const d of details) {
    const economy = d.economy ?? [];
    for (const row of economy.filter((e) => e.puuid === puuid)) {
      const round = d.rounds.find((r) => r.roundNumber === row.roundNumber);
      if (!round) continue;
      rounds++;
      const own = classifyBuy(row.loadoutValue, row.roundNumber);
      const team = classifyTeamBuy(economy, row.teamId, row.roundNumber);
      played[team]++;
      if (round.winningTeamId === row.teamId) won[team]++;
      if (own === 'pistol') continue;
      if (team === 'eco' && (own === 'force' || own === 'full')) forced++;
      if (own === 'eco' && (team === 'force' || team === 'full')) saved++;
    }
  }

  const winRateByBuy = Object.fromEntries(
    BUYS.map((b) => [b, played[b] ? won[b] / played[b] : null]),
  ) as Record<BuyType, number | null>;
  return {
    forcedWhileTeamSaved: forced,
    savedWhileTeamBought: saved,
    rounds,
    winRateByBuy,
  };
}
