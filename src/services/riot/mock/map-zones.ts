import type { MapPoint, MapZone } from '@/contracts/tracker';

/**
 * Zonas jogáveis por mapa, desenhadas à mão em COORDENADAS DE MUNDO.
 *
 * Os centros vêm dos callouts publicados em valorant-api.com/v1/maps
 * (lidos em 2026-10-21); cada zona é um retângulo ao redor do callout.
 * Precisão "parece real", não "é real". O label começa pela região
 * (`A`/`B`/`C`/`Mid`) — o gerador usa isso para agrupar zonas por site.
 * Todas projetam dentro do minimapa com os multiplicadores oficiais
 * (ver `tests/services/riot/mock/map-zones.test.ts`).
 */

type Side = MapZone['side'];
type ZoneSpec = readonly [label: string, side: Side, x: number, y: number, half?: number];

const ZONE_HALF = 450;
const SITE_HALF = 700;

function rect(x: number, y: number, half: number): readonly MapPoint[] {
  return [
    { x: x - half, y: y - half },
    { x: x + half, y: y - half },
    { x: x + half, y: y + half },
    { x: x - half, y: y + half },
  ];
}

function zones(specs: readonly ZoneSpec[]): readonly MapZone[] {
  return specs.map(([label, side, x, y, half]) => ({
    label,
    side,
    polygon: rect(x, y, half ?? (label.endsWith(' Site') ? SITE_HALF : ZONE_HALF)),
  }));
}

export interface MockMap {
  /** `matchInfo.mapId` oficial (asset path do mapa). */
  readonly mapId: string;
  readonly name: string;
  readonly zones: readonly MapZone[];
}

export const MOCK_MAPS: readonly MockMap[] = [
  {
    mapId: '/Game/Maps/Ascent/Ascent',
    name: 'Ascent',
    zones: zones([
      ['A Site', 'any', 6154, -6626],
      ['A Main', 'attack', 5322, -4710],
      ['A Lobby', 'attack', 4489, -3014],
      ['A Wine', 'attack', 7359, -4689],
      ['A Tree', 'defense', 3981, -5939],
      ['A Garden', 'defense', 3774, -7551],
      ['A Rafters', 'defense', 6130, -8210],
      ['A Window', 'defense', 4023, -8181],
      ['Mid Top', 'attack', 2754, -2130],
      ['Mid Catwalk', 'any', 2316, -4127],
      ['Mid Courtyard', 'any', 1223, -4587],
      ['Mid Bottom', 'any', 1122, -5952],
      ['Mid Market', 'defense', 1089, -7363],
      ['Mid Pizza', 'defense', 1802, -7262],
      ['Mid Link', 'any', -632, -4280],
      ['B Lobby', 'attack', -1491, -1390],
      ['B Main', 'attack', -1984, -5841],
      ['B Site', 'any', -2344, -7549],
      ['B Boat House', 'defense', -4485, -7763],
    ]),
  },
  {
    mapId: '/Game/Maps/Duality/Duality',
    name: 'Bind',
    zones: zones([
      ['A Lobby', 'attack', 6113, 3159],
      ['A Short', 'attack', 7983, 804],
      ['A Bath', 'attack', 9107, 4450],
      ['A Teleporter', 'any', 9432, 490],
      ['A Cubby', 'any', 8605, 175],
      ['A Site', 'any', 10748, 2664],
      ['A Tower', 'defense', 12873, 2557],
      ['A Lamps', 'defense', 10649, 80],
      ['A Link', 'defense', 6366, -1007],
      ['B Long', 'attack', 7667, -6513],
      ['B Fountain', 'attack', 5737, -5390],
      ['B Short', 'attack', 7424, -3056],
      ['B Window', 'any', 8827, -4309],
      ['B Garden', 'any', 9144, -5598],
      ['B Site', 'any', 11108, -4831],
      ['B Hall', 'defense', 12982, -4942],
      ['B Elbow', 'defense', 11213, -7095],
      ['B Link', 'defense', 6362, -2621],
    ]),
  },
  {
    mapId: '/Game/Maps/Triad/Triad',
    name: 'Haven',
    zones: zones([
      ['A Garden', 'attack', 3100, -4684],
      ['A Lobby', 'attack', 3439, -6260],
      ['A Long', 'attack', 6210, -6901],
      ['A Sewer', 'any', 3453, -7916],
      ['A Site', 'any', 6309, -9226],
      ['A Tower', 'defense', 6721, -10473],
      ['A Link', 'defense', 4244, -10716],
      ['Mid Doors', 'any', 151, -6263],
      ['Mid Courtyard', 'any', 1822, -6713],
      ['Mid Window', 'any', 1950, -5568],
      ['B Site', 'any', 1885, -9231],
      ['B Back', 'defense', 1966, -10665],
      ['C Lobby', 'attack', -1642, -5720],
      ['C Long', 'attack', -3357, -5991],
      ['C Cubby', 'any', -2120, -6562],
      ['C Garage', 'any', 180, -8000],
      ['C Window', 'defense', -10, -8993],
      ['C Site', 'any', -2378, -9011],
      ['C Link', 'defense', -88, -10004],
    ]),
  },
  {
    mapId: '/Game/Maps/Jam/Jam',
    name: 'Lotus',
    zones: zones([
      ['A Lobby', 'attack', 2686, 2927],
      ['A Root', 'attack', 4401, 3294],
      ['A Rubble', 'attack', 4401, 4918],
      ['A Main', 'attack', 5288, 4160],
      ['A Door', 'any', 5609, 5204],
      ['A Tree', 'any', 6150, 5557],
      ['A Site', 'any', 7736, 5557],
      ['A Top', 'defense', 9260, 5046],
      ['A Drop', 'defense', 9516, 6093],
      ['A Stairs', 'defense', 8258, 3861],
      ['A Link', 'any', 6011, 2088],
      ['B Pillars', 'attack', 3565, 668],
      ['B Main', 'attack', 4877, -48],
      ['B Site', 'any', 6368, 668],
      ['B Upper', 'defense', 7683, 1517],
      ['C Lobby', 'attack', 1404, -1577],
      ['C Mound', 'attack', 3864, -1577],
      ['C Main', 'attack', 5311, -3148],
      ['C Door', 'any', 4819, -1753],
      ['C Bend', 'any', 5658, -5281],
      ['C Site', 'any', 6677, -4266],
      ['C Hall', 'defense', 7902, -4266],
      ['C Waterfall', 'any', 6720, -1994],
      ['C Link', 'defense', 7504, -1378],
      ['C Gravel', 'defense', 8937, -1752],
    ]),
  },
  {
    mapId: '/Game/Maps/Juliett/Juliett',
    name: 'Sunset',
    // Os callouts de Sunset ficam em paredes/quinas do minimapa: cada
    // retângulo ainda contém o seu callout, mas o centro foi deslocado para
    // o piso jogável (alfa do PNG oficial). Exceção: o callout "B Site"
    // (-600, -5850) cai fora do minimapa; a zona fica sobre o site real.
    zones: zones([
      ['A Lobby', 'attack', -1400, 2400],
      ['A Main', 'attack', -825, 2400],
      ['A Site', 'any', 1650, 3850],
      ['A Elbow', 'any', -200, 3800],
      ['A Link', 'defense', 1775, 2600],
      ['A Alley', 'defense', 3000, 4000],
      ['Mid Tiles', 'attack', -1400, 0],
      ['Mid Courtyard', 'any', -200, -800],
      ['Mid Bottom', 'any', -2225, -1600],
      ['Mid Top', 'defense', 2425, -1600],
      ['B Lobby', 'attack', -2975, -2175],
      ['B Main', 'attack', -1600, -5250],
      ['B Market', 'any', 75, -3550, 300],
      ['B Site', 'any', 1550, -5350, 500],
      ['B Boba', 'defense', 1800, -5200],
    ]),
  },
];
