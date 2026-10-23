import { describe, expect, it } from 'vitest';
import { classifyBuy, classifyTeamBuy } from '@/services/analytics/buy-type';
import type { RoundEconomy } from '@/contracts/tracker';

const eco = (puuid: string, teamId: string, roundNumber: number, loadoutValue: number) =>
  ({ puuid, teamId, roundNumber, loadoutValue }) as RoundEconomy;

describe('classifyBuy', () => {
  it('classifica nos limites', () => {
    expect(classifyBuy(800, 1)).toBe('pistol');
    expect(classifyBuy(5000, 13)).toBe('pistol');
    expect(classifyBuy(1999, 5)).toBe('eco');
    expect(classifyBuy(2000, 5)).toBe('force');
    expect(classifyBuy(3899, 5)).toBe('force');
    expect(classifyBuy(3900, 5)).toBe('full');
  });
});

describe('classifyTeamBuy', () => {
  it('usa a média do time no round', () => {
    const e = [eco('a', 'R', 5, 1000), eco('b', 'R', 5, 3000), eco('c', 'B', 5, 9000), eco('a', 'R', 6, 9000)];
    expect(classifyTeamBuy(e, 'R', 5)).toBe('force');
    expect(classifyTeamBuy(e, 'B', 5)).toBe('full');
  });

  it('sem linhas do time vira eco (ou pistol nos pistol rounds)', () => {
    expect(classifyTeamBuy([], 'R', 5)).toBe('eco');
    expect(classifyTeamBuy([], 'R', 13)).toBe('pistol');
  });
});
