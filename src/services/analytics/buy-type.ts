import type { RoundEconomy } from '@/contracts/tracker';

export type BuyType = 'pistol' | 'eco' | 'force' | 'full';

const PISTOL_ROUNDS = [1, 13];
const ECO_BELOW = 2000;
const FORCE_BELOW = 3900;

export function classifyBuy(loadoutValue: number, roundNumber: number): BuyType {
  if (PISTOL_ROUNDS.includes(roundNumber)) return 'pistol';
  if (loadoutValue < ECO_BELOW) return 'eco';
  return loadoutValue < FORCE_BELOW ? 'force' : 'full';
}

/** Compra do time no round: classifica a média de loadout dos jogadores do time. */
export function classifyTeamBuy(
  economy: readonly RoundEconomy[],
  teamId: string,
  roundNumber: number,
): BuyType {
  const rows = economy.filter(
    (e) => e.teamId === teamId && e.roundNumber === roundNumber,
  );
  const avg = rows.length
    ? rows.reduce((s, e) => s + e.loadoutValue, 0) / rows.length
    : 0;
  return classifyBuy(avg, roundNumber);
}
