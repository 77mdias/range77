import { describe, expect, it } from 'vitest';
import type { RiotRoundResultDto } from '@/contracts/riot';
import {
  aggregateRiotPlayerTotals,
  computeAcs,
  computeHeadshotPercentage,
} from '@/services/analytics/riot-match-stats';

function round(
  playerStats: RiotRoundResultDto['playerStats'],
): RiotRoundResultDto {
  return {
    roundNum: 0,
    roundResult: 'Eliminated',
    roundCeremony: 'CeremonyDefault',
    winningTeam: 'Blue',
    winningTeamRole: 'Defender',
    playerStats,
    roundResultCode: 'Elimination',
  };
}

describe('computeHeadshotPercentage', () => {
  it('HS% sobre tiros conectados, 1 casa', () => {
    expect(computeHeadshotPercentage(1, 2, 0)).toBe(33.3);
    expect(computeHeadshotPercentage(5, 5, 0)).toBe(50);
  });

  it('sem tiros conectados → null (nunca NaN)', () => {
    expect(computeHeadshotPercentage(0, 0, 0)).toBeNull();
  });
});

describe('computeAcs', () => {
  it('score / rounds, inteiro', () => {
    expect(computeAcs(4100, 18)).toBe(228);
  });

  it('rounds <= 0 → 0 (nunca Infinity)', () => {
    expect(computeAcs(300, 0)).toBe(0);
  });
});

describe('aggregateRiotPlayerTotals', () => {
  const rounds: readonly RiotRoundResultDto[] = [
    round([
      {
        puuid: 'a',
        kills: [],
        damage: [
          { receiver: 'b', damage: 150, legshots: 0, bodyshots: 1, headshots: 1 },
          { receiver: 'c', damage: 40, legshots: 1, bodyshots: 0, headshots: 0 },
        ],
        score: 200,
        economy: { loadoutValue: 3900, weapon: 'w', armor: 'x', remaining: 100, spent: 3900 },
        ability: null,
      },
      {
        puuid: 'b',
        kills: [],
        damage: [{ receiver: 'a', damage: 30, legshots: 0, bodyshots: 1, headshots: 0 }],
        score: 50,
        economy: null,
        ability: null,
      },
    ]),
    round([
      {
        puuid: 'a',
        kills: [],
        damage: [{ receiver: 'b', damage: 100, legshots: 0, bodyshots: 0, headshots: 1 }],
        score: 100,
        economy: { loadoutValue: 800, weapon: 'w', armor: '', remaining: 0, spent: 800 },
        ability: null,
      },
    ]),
  ];

  const totals = aggregateRiotPlayerTotals(rounds);

  it('soma tiros e dano causado por jogador', () => {
    expect(totals.get('a')).toMatchObject({
      headshots: 2,
      bodyshots: 1,
      legshots: 1,
      damageDealt: 290,
      damageReceived: 30,
    });
  });

  it('dano recebido vem do `receiver` de qualquer atacante', () => {
    expect(totals.get('b')?.damageReceived).toBe(250);
    // `c` só aparece como receiver: entra com totais zerados de tiro.
    expect(totals.get('c')).toMatchObject({ damageDealt: 0, damageReceived: 40, headshots: 0 });
  });

  it('economia soma os rounds com registro; sem nenhum → null', () => {
    expect(totals.get('a')?.economy).toEqual({ spent: 4700, loadoutValue: 4700 });
    expect(totals.get('b')?.economy).toBeNull();
    expect(totals.get('c')?.economy).toBeNull();
  });

  it('sem rounds → mapa vazio', () => {
    expect(aggregateRiotPlayerTotals([]).size).toBe(0);
  });
});
