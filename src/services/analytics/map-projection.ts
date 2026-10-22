import type { MapPoint } from '@/contracts/tracker';

/** Transform oficial por mapa (valorant-api.com): mundo → minimapa. */
export interface MinimapTransform {
  readonly xMultiplier: number;
  readonly yMultiplier: number;
  readonly xScalarToAdd: number;
  readonly yScalarToAdd: number;
}

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

/** Projeta coordenadas de mundo em u/v (0..1) do minimapa; x/y do jogo são trocados. */
export function projectToMinimap(
  point: MapPoint,
  t: MinimapTransform,
): { u: number; v: number } {
  return {
    u: clamp01(point.y * t.xMultiplier + t.xScalarToAdd),
    v: clamp01(point.x * t.yMultiplier + t.yScalarToAdd),
  };
}
