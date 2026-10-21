import { describe, expect, it } from 'vitest';
import { MOCK_MAPS } from '@/services/riot/mock/map-zones';

/**
 * Multiplicadores de projeção mundo → minimapa (valorant-api.com/v1/maps,
 * lidos em 2026-10-21): u = y * xMultiplier + xScalarToAdd,
 * v = x * yMultiplier + yScalarToAdd. Literais aqui de propósito — o teste
 * garante que as zonas desenhadas caem dentro do minimapa (0..1).
 */
const TRANSFORMS: Record<string, { xm: number; ym: number; xs: number; ys: number }> = {
  '/Game/Maps/Ascent/Ascent': { xm: 0.00007, ym: -0.00007, xs: 0.813895, ys: 0.573242 },
  '/Game/Maps/Duality/Duality': { xm: 0.000059, ym: -0.000059, xs: 0.576941, ys: 0.967566 },
  '/Game/Maps/Triad/Triad': { xm: 0.000075, ym: -0.000075, xs: 1.09345, ys: 0.642728 },
  '/Game/Maps/Jam/Jam': { xm: 0.000072, ym: -0.000072, xs: 0.454789, ys: 0.917752 },
  '/Game/Maps/Juliett/Juliett': { xm: 0.000078, ym: -0.000078, xs: 0.5, ys: 0.515625 },
};

describe('mock map zones', () => {
  it('cobre Ascent, Bind, Haven, Lotus e Sunset', () => {
    const names = MOCK_MAPS.map((m) => m.name);
    for (const n of ['Ascent', 'Bind', 'Haven', 'Lotus', 'Sunset']) expect(names).toContain(n);
  });

  it('cada mapa tem zonas de ataque, defesa e sites nomeados', () => {
    for (const map of MOCK_MAPS) {
      expect(map.zones.some((z) => z.side === 'attack')).toBe(true);
      expect(map.zones.some((z) => z.side === 'defense')).toBe(true);
      expect(map.zones.filter((z) => z.label.endsWith(' Site')).length).toBeGreaterThanOrEqual(2);
      for (const z of map.zones) expect(z.polygon.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('toda zona projeta dentro do minimapa (0..1)', () => {
    for (const map of MOCK_MAPS) {
      const t = TRANSFORMS[map.mapId];
      expect(t).toBeDefined();
      if (!t) continue;
      for (const z of map.zones) {
        for (const p of z.polygon) {
          const u = p.y * t.xm + t.xs;
          const v = p.x * t.ym + t.ys;
          expect(u).toBeGreaterThan(0);
          expect(u).toBeLessThan(1);
          expect(v).toBeGreaterThan(0);
          expect(v).toBeLessThan(1);
        }
      }
    }
  });
});
