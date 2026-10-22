import type { MapPoint, MapZone, MatchDetail } from '@/contracts/tracker';
import {
  computeEconomyDiscipline,
  type EconomyDiscipline,
} from './economy-discipline';

export interface TacticalVectors {
  topDeathZones: { label: string; deaths: number }[];
  discipline: EconomyDiscipline;
}

const OTHER = 'Outras áreas';
const TOP_N = 3;

// Ray casting.
function inside(p: MapPoint, poly: readonly MapPoint[]): boolean {
  let isIn = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      isIn = !isIn;
    }
  }
  return isIn;
}

export function buildTacticalVectors(
  details: readonly MatchDetail[],
  puuid: string,
  zonesByMap: Readonly<Record<string, readonly MapZone[]>>,
): TacticalVectors {
  const counts = new Map<string, number>();
  for (const d of details) {
    const zones = (d.mapId && zonesByMap[d.mapId]) || [];
    for (const k of d.kills) {
      if (k.victimPuuid !== puuid || !k.victimLocation) continue;
      const loc = k.victimLocation;
      const label = zones.find((z) => inside(loc, z.polygon))?.label ?? OTHER;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }
  const topDeathZones = [...counts]
    .map(([label, deaths]) => ({ label, deaths }))
    .sort((a, b) => b.deaths - a.deaths || a.label.localeCompare(b.label))
    .slice(0, TOP_N);
  return { topDeathZones, discipline: computeEconomyDiscipline(details, puuid) };
}
