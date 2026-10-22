import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { minimapFor } from '@/lib/valorant-maps';
import { MOCK_MAPS } from '@/services/riot/mock/map-zones';

describe('minimapFor', () => {
  it.each(MOCK_MAPS)('$name: nome e mapId resolvem igual, arquivo existe, zonas dentro de [0,1]', (map) => {
    const byName = minimapFor(map.name);
    expect(byName).not.toBeNull();
    expect(minimapFor(map.mapId)).toEqual(byName);
    expect(minimapFor(map.name.toUpperCase())).toEqual(byName);
    expect(existsSync(join(process.cwd(), 'public', byName!.src))).toBe(true);
    for (const zone of map.zones) {
      for (const p of zone.polygon) {
        // projectToMinimap clampa; recalcula sem clamp para detectar vértice fora
        const t = byName!.transform;
        const u = p.y * t.xMultiplier + t.xScalarToAdd;
        const v = p.x * t.yMultiplier + t.yScalarToAdd;
        expect(u).toBeGreaterThanOrEqual(0);
        expect(u).toBeLessThanOrEqual(1);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it('desconhecido → null', () => {
    expect(minimapFor('Atlantis')).toBeNull();
    expect(minimapFor('')).toBeNull();
  });
});
