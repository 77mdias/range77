import type { MatchDetail } from '@/contracts/tracker';
import { projectToMinimap, type MinimapTransform } from './map-projection';

/** Mortes do jogador no mapa, contadas por célula [linha v][coluna u] da grade. */
export function computeDeathHeatmap(
  details: readonly MatchDetail[],
  puuid: string,
  mapId: string,
  transform: MinimapTransform,
  gridSize = 16,
): number[][] {
  const grid = Array.from({ length: gridSize }, () =>
    new Array<number>(gridSize).fill(0),
  );
  for (const d of details) {
    if (d.mapId !== mapId) continue;
    for (const k of d.kills) {
      if (k.victimPuuid !== puuid || !k.victimLocation) continue;
      const { u, v } = projectToMinimap(k.victimLocation, transform);
      const col = Math.min(gridSize - 1, Math.floor(u * gridSize));
      const row = Math.min(gridSize - 1, Math.floor(v * gridSize));
      grid[row]![col]!++;
    }
  }
  return grid;
}
