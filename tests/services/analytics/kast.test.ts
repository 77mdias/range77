import { describe, expect, it } from 'vitest';
import {
  computeKastByPlayer,
  computePlayerKast,
  type KastKill,
} from '@/services/analytics/kast';

/**
 * SUITE TDD — KAST: fração de rounds com K/A/S/T por jogador (K = kill,
 * A = assist, S = survived, T = traded no mesmo round). Derivado dos eventos
 * de abate — a HenrikDev não fornece o número.
 */

const TEAMS = new Map([
  ['r1', 'Red'],
  ['r2', 'Red'],
  ['b1', 'Blue'],
  ['b2', 'Blue'],
]);

function kill(
  roundNumber: number,
  killerPuuid: string,
  victimPuuid: string,
  assistantPuuids: readonly string[] = [],
): KastKill {
  return { roundNumber, killerPuuid, victimPuuid, assistantPuuids };
}

describe('computeKastByPlayer', () => {
  it('credita K, A, S e T e ignora quem apenas morreu sem trade', () => {
    const result = computeKastByPlayer({
      roundNumbers: [1, 2, 3, 4],
      teamByPuuid: TEAMS,
      kills: [
        // Round 1: b1 mata r1 (assist b2) e r2 vinga r1 matando b1.
        kill(1, 'b1', 'r1', ['b2']),
        kill(1, 'r2', 'b1'),
        // Round 2: b1 mata r1; r2 mata b2 (Blue matou r1, logo b2 não é vingado).
        kill(2, 'b1', 'r1'),
        kill(2, 'r2', 'b2'),
        // Round 3: r2 mata b2 (Blue não matou ninguém → b2 sem trade).
        kill(3, 'r2', 'b2'),
        // Round 4: sem abates → todos sobrevivem (S).
      ],
    });

    expect(result.get('r1')).toBe(75); // T + S + S
    expect(result.get('r2')).toBe(100); // K + K + K + S
    expect(result.get('b1')).toBe(100); // K + K + S + S
    expect(result.get('b2')).toBe(50); // A + S
  });

  it('round sem abates registrados vira sobrevivência para todos', () => {
    const result = computeKastByPlayer({
      roundNumbers: [1, 2],
      teamByPuuid: TEAMS,
      kills: [kill(1, 'r1', 'b1')],
    });
    expect(result.get('r2')).toBe(100);
    expect(result.get('b2')).toBe(100);
  });

  it('ignora abates com killer fora do mapa e vítima vazia', () => {
    const result = computeKastByPlayer({
      roundNumbers: [1],
      teamByPuuid: new Map([
        ['r1', 'Red'],
        ['r2', 'Red'],
      ]),
      kills: [
        kill(1, 'ghost', 'x'), // killer desconhecido → ignorado
        kill(1, 'r2', ''), // vítima vazia → ignorada
      ],
    });
    expect(result.get('r1')).toBe(100);
    expect(result.get('r2')).toBe(100);
  });

  it('acumula várias vítimas do mesmo time no mesmo round', () => {
    const result = computeKastByPlayer({
      roundNumbers: [1],
      teamByPuuid: new Map([['a', 'Red'], ['b', 'Blue']]),
      kills: [kill(1, 'a', 'x'), kill(1, 'a', 'y')],
    });
    expect(result.get('a')).toBe(100);
  });

  it('nunca inclui PUUID vazio no resultado', () => {
    const result = computeKastByPlayer({
      roundNumbers: [1],
      teamByPuuid: new Map([
        ['', 'Red'],
        ['r1', 'Red'],
      ]),
      kills: [kill(1, 'r1', 'x')],
    });
    expect(result.has('')).toBe(false);
    expect(result.get('r1')).toBe(100);
  });

  it('devolve mapa vazio sem rounds, sem jogadores ou sem abates', () => {
    expect(
      computeKastByPlayer({ roundNumbers: [], teamByPuuid: TEAMS, kills: [kill(1, 'r1', 'b1')] }).size,
    ).toBe(0);
    expect(
      computeKastByPlayer({ roundNumbers: [1], teamByPuuid: new Map(), kills: [kill(1, 'r1', 'b1')] })
        .size,
    ).toBe(0);
    expect(computeKastByPlayer({ roundNumbers: [1], teamByPuuid: TEAMS, kills: [] }).size).toBe(0);
  });
});

describe('computePlayerKast', () => {
  it('devolve o valor do jogador conhecido', () => {
    expect(
      computePlayerKast(
        { roundNumbers: [1], teamByPuuid: TEAMS, kills: [kill(1, 'r1', 'b1')] },
        'r1',
      ),
    ).toBe(100);
  });

  it('devolve null quando o jogador não está na base', () => {
    expect(computePlayerKast({ roundNumbers: [], teamByPuuid: TEAMS, kills: [] }, 'r1')).toBeNull();
  });
});
