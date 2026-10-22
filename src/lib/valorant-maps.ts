/**
 * Minimapas e transformações mundo → minimapa dos mapas simulados.
 *
 * Origem: https://valorant-api.com/v1/maps (`displayIcon` + multiplicadores),
 * baixado em 2026-10-22 e commitado em `public/assets/images/minimaps/`.
 * O app NUNCA chama valorant-api.com em runtime.
 *
 * Tabela explícita, case-insensitive; resolve o nome exibido ("Ascent") e o
 * `mapId` cru da Riot ("/Game/Maps/Ascent/Ascent"). Fora da tabela → `null`.
 */
import type { MinimapTransform } from '@/services/analytics/map-projection';

export interface MinimapInfo {
  src: string;
  transform: MinimapTransform;
}

const t = (
  xMultiplier: number,
  yMultiplier: number,
  xScalarToAdd: number,
  yScalarToAdd: number,
): MinimapTransform => ({ xMultiplier, yMultiplier, xScalarToAdd, yScalarToAdd });

const ASCENT: MinimapInfo = {
  src: '/assets/images/minimaps/ascent.png',
  transform: t(0.00007, -0.00007, 0.813895, 0.573242),
};
const BIND: MinimapInfo = {
  src: '/assets/images/minimaps/bind.png',
  transform: t(0.000059, -0.000059, 0.576941, 0.967566),
};
const HAVEN: MinimapInfo = {
  src: '/assets/images/minimaps/haven.png',
  transform: t(0.000075, -0.000075, 1.09345, 0.642728),
};
const LOTUS: MinimapInfo = {
  src: '/assets/images/minimaps/lotus.png',
  transform: t(0.000072, -0.000072, 0.454789, 0.917752),
};
const SUNSET: MinimapInfo = {
  src: '/assets/images/minimaps/sunset.png',
  transform: t(0.000078, -0.000078, 0.5, 0.515625),
};

const MINIMAPS: Readonly<Record<string, MinimapInfo>> = {
  ascent: ASCENT,
  '/game/maps/ascent/ascent': ASCENT,
  bind: BIND,
  '/game/maps/duality/duality': BIND,
  haven: HAVEN,
  '/game/maps/triad/triad': HAVEN,
  lotus: LOTUS,
  '/game/maps/jam/jam': LOTUS,
  sunset: SUNSET,
  '/game/maps/juliett/juliett': SUNSET,
};

export function minimapFor(mapIdOrName: string): MinimapInfo | null {
  return MINIMAPS[mapIdOrName.trim().toLowerCase()] ?? null;
}
