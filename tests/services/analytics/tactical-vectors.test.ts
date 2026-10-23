import { describe, expect, it } from 'vitest';
import { buildTacticalVectors } from '@/services/analytics/tactical-vectors';
import type { MapZone, MatchDetail } from '@/contracts/tracker';

const sq = (label: string, x0: number, x1: number): MapZone => ({
  label,
  side: 'any',
  polygon: [
    { x: x0, y: 0 },
    { x: x1, y: 0 },
    { x: x1, y: 10 },
    { x: x0, y: 10 },
  ],
});
const zones = { M: [sq('A Site', 0, 10), sq('Mid', 20, 30)] };
const k = (victimPuuid: string, x: number | null) => ({
  victimPuuid,
  victimLocation: x === null ? null : { x, y: 5 },
});
const detail = (mapId: string | null, kills: ReturnType<typeof k>[]) =>
  ({ mapId, kills, rounds: [], economy: null }) as unknown as MatchDetail;

describe('buildTacticalVectors', () => {
  it('agrupa mortes por zona, ordena e usa Outras áreas fora de todas', () => {
    const v = buildTacticalVectors(
      [
        detail('M', [k('me', 5), k('me', 25), k('me', 26), k('me', 99), k('me', null), k('x', 5)]),
        detail('M', [k('me', 7), k('me', 8), k('me', 6)]),
        detail('Z', [k('me', 5)]),
        detail(null, [k('me', 5)]),
      ],
      'me',
      zones,
    );
    // A Site 4, Mid 2, Outras 3 (99, mapa Z, sem mapId) -> top 3 ordenado
    expect(v.topDeathZones).toEqual([
      { label: 'A Site', deaths: 4 },
      { label: 'Outras áreas', deaths: 3 },
      { label: 'Mid', deaths: 2 },
    ]);
    expect(v.discipline.rounds).toBe(0);
  });

  it('desempata por rótulo e limita a 3', () => {
    const v = buildTacticalVectors(
      [detail('M', [k('me', 25), k('me', 5), k('me', 99), k('me', 99), k('me', 99)])],
      'me',
      { M: [sq('B', 0, 10), sq('A', 20, 30), sq('C', 40, 50), sq('D', 60, 70)] },
    );
    expect(v.topDeathZones.map((z) => z.label)).toEqual(['Outras áreas', 'A', 'B']);
  });
});
