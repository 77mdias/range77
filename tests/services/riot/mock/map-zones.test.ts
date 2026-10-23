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

  it('zonas de Sunset contêm as posições dos callouts oficiais correspondentes', () => {
    // Fonte: valorant-api.com/v1/maps (Sunset, callouts[].location), lido em 2026-10-22.
    // "B Site" (-600, -5850) fica de fora: projeta fora da área jogável do minimapa.
    const CALLOUTS: Record<string, { x: number; y: number }> = {
      'A Lobby': { x: -1800, y: 2000 },
      'A Main': { x: -400, y: 2200 },
      'A Site': { x: 1000, y: 3200 },
      'A Elbow': { x: 200, y: 4200 },
      'A Link': { x: 2200, y: 3000 },
      'A Alley': { x: 3400, y: 3600 },
      'Mid Tiles': { x: -1800, y: 400 },
      'Mid Courtyard': { x: -600, y: -1200 },
      'Mid Bottom': { x: -1800, y: -2025 },
      'Mid Top': { x: 2000, y: -2000 },
      'B Lobby': { x: -3400, y: -2600 },
      'B Main': { x: -2000, y: -5650 },
      'B Market': { x: -200, y: -3400 },
      'B Boba': { x: 2200, y: -4800 },
    };
    const sunset = MOCK_MAPS.find((m) => m.name === 'Sunset')!;
    for (const [label, c] of Object.entries(CALLOUTS)) {
      const zone = sunset.zones.find((z) => z.label === label);
      expect(zone, label).toBeDefined();
      const xs = zone!.polygon.map((p) => p.x);
      const ys = zone!.polygon.map((p) => p.y);
      expect(c.x, label).toBeGreaterThan(Math.min(...xs));
      expect(c.x, label).toBeLessThan(Math.max(...xs));
      expect(c.y, label).toBeGreaterThan(Math.min(...ys));
      expect(c.y, label).toBeLessThan(Math.max(...ys));
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
