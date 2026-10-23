import { describe, expect, it } from 'vitest';
import { computeEconomyDiscipline } from '@/services/analytics/economy-discipline';
import type { MatchDetail, RoundEconomy } from '@/contracts/tracker';

const row = (puuid: string, roundNumber: number, loadoutValue: number): RoundEconomy =>
  ({ puuid, teamId: 'R', roundNumber, loadoutValue }) as RoundEconomy;

const detail = (rounds: [number, string][], economy: RoundEconomy[] | null): MatchDetail =>
  ({
    rounds: rounds.map(([roundNumber, winningTeamId]) => ({ roundNumber, winningTeamId })),
    economy,
  }) as unknown as MatchDetail;

describe('computeEconomyDiscipline', () => {
  it('sem economia: rounds 0 e winRate todo null', () => {
    const r = computeEconomyDiscipline([detail([[1, 'R']], null)], 'me');
    expect(r).toEqual({
      forcedWhileTeamSaved: 0,
      savedWhileTeamBought: 0,
      rounds: 0,
      winRateByBuy: { pistol: null, eco: null, force: null, full: null },
    });
  });

  it('conta force sozinho, eco sozinho, pistol, round sem registro e overtime', () => {
    const d = detail(
      [[1, 'R'], [2, 'B'], [3, 'R'], [4, 'R'], [25, 'R'], [6, 'R'], [7, 'R']],
      [
        row('me', 1, 800),
        row('me', 2, 3000), // eu force, time (com mate) eco
        row('mate', 2, 100),
        row('me', 3, 100), // eu eco, time force
        row('mate', 3, 5000),
        row('me', 4, 4500), // full com time full: nenhum
        row('me', 5, 100), // round sem registro em rounds: ignorado
        row('me', 25, 4500), // overtime
        row('mate', 99, 1),
        row('me', 6, 3900), // full com time eco
        row('mate', 6, 0),
        row('me', 7, 100), // eco com time full
        row('mate', 7, 9000),
      ],
    );
    const r = computeEconomyDiscipline([d], 'me');
    expect(r.rounds).toBe(7);
    expect(r.forcedWhileTeamSaved).toBe(2);
    expect(r.savedWhileTeamBought).toBe(2);
    expect(r.winRateByBuy).toEqual({ pistol: 1, eco: 0.5, force: 1, full: 1 });
  });
});
