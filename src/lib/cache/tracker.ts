import { cacheLife, cacheTag } from 'next/cache';
import type { MatchDetail } from '@/contracts/tracker';
import { getMatchDetail } from '@/services/tracker/match-detail';
import { getPlayerCard } from '@/services/tracker/player-card';
import {
  buildPlayerOverview,
  type PlayerOverview,
} from '@/services/tracker/player-overview';

/**
 * Camada de cache Data (`'use cache'`) compartilhada entre Route Handlers e
 * páginas — a MESMA entrada de cache é reaproveitada, então abrir o perfil
 * esquenta a API e vice-versa. Protege nosso limite na HenrikDev.
 */

export async function getCachedPlayerOverview(
  region: string,
  name: string,
  tag: string,
  size: number,
): Promise<PlayerOverview> {
  'use cache';
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
  cacheTag(`player-overview:${region}:${name.toLowerCase()}:${tag.toLowerCase()}:${size}`);
  return buildPlayerOverview({ region, name, tag, size });
}

export async function getCachedMatchDetail(
  region: string,
  matchId: string,
): Promise<MatchDetail> {
  'use cache';
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 });
  cacheTag(`match:${region.toLowerCase()}:${matchId}`);
  // O cache durável (Neon) é consultado no miss do cache Data.
  return getMatchDetail({ region, matchId });
}

/**
 * Cartão de jogador (in-game player card) para o destaque de MVP, via v1
 * account. Cacheado por Riot ID — best-effort: `null` quando indisponível.
 */
export async function getCachedPlayerCard(name: string, tag: string): Promise<string | null> {
  'use cache';
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 });
  cacheTag(`player-card:${name.toLowerCase()}:${tag.toLowerCase()}`);
  return getPlayerCard({ name, tag });
}
