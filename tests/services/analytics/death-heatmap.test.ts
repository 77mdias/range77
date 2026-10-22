import { describe, expect, it } from 'vitest';
import { computeDeathHeatmap } from '@/services/analytics/death-heatmap';
import type { MatchDetail } from '@/contracts/tracker';

const t = { xMultiplier: 0.001, yMultiplier: 0.001, xScalarToAdd: 0, yScalarToAdd: 0 };
const death = (victimPuuid: string, loc: { x: number; y: number } | null) => ({
  victimPuuid,
  victimLocation: loc,
});
const detail = (mapId: string, kills: ReturnType<typeof death>[]) =>
  ({ mapId, kills }) as unknown as MatchDetail;

describe('computeDeathHeatmap', () => {
  it('conta mortes por célula, ignorando outros jogadores/mapas/sem posição', () => {
    const g = computeDeathHeatmap(
      [
        detail('A', [
          death('me', { x: 500, y: 250 }), // u=.25 v=.5 -> col 1,row 2 (grid 4)
          death('me', { x: 500, y: 250 }),
          death('me', { x: 5000, y: 5000 }), // clamp -> última célula
          death('me', null),
          death('other', { x: 500, y: 250 }),
        ]),
        detail('B', [death('me', { x: 500, y: 250 })]),
      ],
      'me',
      'A',
      t,
      4,
    );
    expect(g).toHaveLength(4);
    expect(g[2]?.[1]).toBe(2);
    expect(g[3]?.[3]).toBe(1);
  });

  it('usa grade 16x16 por padrão', () => {
    expect(computeDeathHeatmap([], 'me', 'A', t)).toHaveLength(16);
  });
});
