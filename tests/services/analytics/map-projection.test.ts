import { describe, expect, it } from 'vitest';
import { projectToMinimap } from '@/services/analytics/map-projection';

// Ascent (valorant-api.com).
const ascent = {
  xMultiplier: 0.00007,
  yMultiplier: -0.00007,
  xScalarToAdd: 0.813895,
  yScalarToAdd: 0.573242,
};

describe('projectToMinimap', () => {
  it('projeta A Site de Ascent dentro de [0,1]', () => {
    const { u, v } = projectToMinimap({ x: 6154, y: -6626 }, ascent);
    expect(u).toBeCloseTo(0.350075, 5);
    expect(v).toBeCloseTo(0.142464, 5);
  });

  it('faz clamp fora do mapa', () => {
    expect(projectToMinimap({ x: 1e6, y: -1e6 }, ascent)).toEqual({ u: 0, v: 0 });
    expect(projectToMinimap({ x: -1e6, y: 1e6 }, ascent)).toEqual({ u: 1, v: 1 });
  });
});
