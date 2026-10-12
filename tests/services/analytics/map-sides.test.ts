import { describe, expect, it } from 'vitest';
import { buildMapSideStats } from '@/services/analytics/map-sides';
import type { MatchHalves, MatchSummary } from '@/contracts/tracker';

/**
 * SUITE (100% obrigatório) — splits DEF/ATK agregados por mapa. Nada é
 * fabricado: só entram partidas com `halves` reais e lados sem rounds viram
 * `null`.
 */

function summary(map: string, halves?: MatchHalves | null): MatchSummary {
  return {
    matchId: `${map}-${map.length}-${halves === null ? 'n' : 'h'}`,
    region: 'br',
    map,
    queue: 'competitive',
    season: null,
    startedAt: '2026-10-01T12:00:00.000Z',
    gameLengthMs: 0,
    result: 'win',
    agent: null,
    teamId: 'Red',
    score: { us: 13, them: 5 },
    kills: 10,
    deaths: 5,
    assists: 2,
    acs: 200,
    hsPercentage: null,
    ...(halves !== undefined ? { halves } : {}),
    roundsPlayed: 18,
  };
}

function halves(
  defenseWon: number,
  defenseLost: number,
  attackWon: number,
  attackLost: number,
): MatchHalves {
  return {
    defense: { won: defenseWon, lost: defenseLost },
    attack: { won: attackWon, lost: attackLost },
  };
}

describe('buildMapSideStats', () => {
  it('sem partidas devolve um mapa vazio', () => {
    expect(buildMapSideStats([]).size).toBe(0);
  });

  it('soma os rounds por lado em cada mapa (peso por rounds, não por partida)', () => {
    const stats = buildMapSideStats([
      summary('Ascent', halves(6, 4, 3, 7)),
      summary('Ascent', halves(4, 6, 5, 5)),
      summary('Breeze', halves(2, 8, 8, 2)),
    ]);
    expect(stats.get('Ascent')).toEqual({ attackPercent: 40, defensePercent: 50 });
    expect(stats.get('Breeze')).toEqual({ attackPercent: 80, defensePercent: 20 });
  });

  it('ignora partidas sem split (ausente ou nulo) e mapas sem nenhum split', () => {
    const stats = buildMapSideStats([
      summary('Split'),
      summary('Split', null),
      summary('Icebox', halves(5, 5, 5, 5)),
    ]);
    expect(stats.has('Split')).toBe(false);
    expect(stats.get('Icebox')).toEqual({ attackPercent: 50, defensePercent: 50 });
    expect(stats.size).toBe(1);
  });

  it('lado sem rounds computáveis vira null (nunca divide por zero)', () => {
    const stats = buildMapSideStats([summary('Lotus', halves(0, 0, 0, 0))]);
    expect(stats.get('Lotus')).toEqual({ attackPercent: null, defensePercent: null });
  });
});
