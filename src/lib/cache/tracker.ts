import { cacheLife, cacheTag } from 'next/cache';
import type { MatchDetail } from '@/contracts/tracker';
import { ACT_SAMPLE_CAP, ACT_SAMPLE_FALLBACK } from '@/services/analytics/act-window';
import { createCachedHenrikDevClient } from '@/services/henrikdev/cached-client';
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
 *
 * `revalidate: 1500` (25min): uma partida ranqueada dura ~30–50min, então a
 * janela não muda entre navegações. O client injetado é o `cached-client`, que
 * adiciona uma SEGUNDA camada POR RECURSO (`henrikdev:*`) para perfil e
 * Breakdown compartilharem conta/MMR/histórico em vez de repetir upstream.
 */

export async function getCachedPlayerOverview(
  region: string,
  name: string,
  tag: string,
  size: number,
): Promise<PlayerOverview> {
  'use cache';
  cacheLife({ stale: 300, revalidate: 1500, expire: 21600 });
  cacheTag(`player-overview:${region}:${name.toLowerCase()}:${tag.toLowerCase()}:${size}`);
  return buildPlayerOverview({
    region,
    name,
    tag,
    size,
    client: createCachedHenrikDevClient(),
  });
}

/**
 * Amostra da tela Partidas & Breakdown: dinâmica POR ATO (até
 * `ACT_SAMPLE_CAP`, fallback `ACT_SAMPLE_FALLBACK`). Entrada de cache própria
 * (a janela não é um `size` fixo como no perfil/API).
 */
export async function getCachedBreakdownOverview(
  region: string,
  name: string,
  tag: string,
): Promise<PlayerOverview> {
  'use cache';
  cacheLife({ stale: 300, revalidate: 1500, expire: 21600 });
  cacheTag(`player-breakdown:${region}:${name.toLowerCase()}:${tag.toLowerCase()}`);
  return buildPlayerOverview({
    region,
    name,
    tag,
    actSample: { cap: ACT_SAMPLE_CAP, fallback: ACT_SAMPLE_FALLBACK },
    client: createCachedHenrikDevClient(),
  });
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
