import { describe, expect, it } from 'vitest';
import type { RiotMatchDto } from '@/contracts/riot';
import { riotMatchFixture } from '../fixtures/riot/match-v1';

/**
 * SUITE — fixture oficial VAL-MATCH-V1: garante que a partida de referência
 * (nomes fictícios) respeita a forma congelada em `src/contracts/riot.ts` e
 * as invariantes que o gerador mock e o normalizador vão assumir.
 */

describe('fixture VAL-MATCH-V1', () => {
  const match: RiotMatchDto = riotMatchFixture;

  it('fixture oficial tem 10 jogadores, rounds coerentes e localizações em todo abate', () => {
    expect(match.players).toHaveLength(10);
    expect(match.roundResults.length).toBeGreaterThan(0);

    match.roundResults.forEach((round, i) => {
      expect(round.roundNum).toBe(i);
      for (const stats of round.playerStats) {
        for (const kill of stats.kills) {
          expect(kill.victimLocation).toBeDefined();
          expect(typeof kill.victimLocation.x).toBe('number');
          expect(typeof kill.victimLocation.y).toBe('number');
          expect(kill.playerLocations.length).toBeGreaterThanOrEqual(1);
        }
        if (stats.economy) {
          expect(stats.economy.spent).toBeLessThanOrEqual(9000);
        }
      }
    });
  });
});
