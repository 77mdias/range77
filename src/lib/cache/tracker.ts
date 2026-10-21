import { cacheLife, cacheTag } from 'next/cache';
import type { MatchDetail } from '@/contracts/tracker';
import { ACT_SAMPLE_CAP, ACT_SAMPLE_FALLBACK } from '@/services/analytics/act-window';
import type { MatchFocus } from '@/services/tracker/source';
import { getTrackerSource } from '@/services/tracker/sources';
import {
  buildPlayerOverview,
  type PlayerOverview,
} from '@/services/tracker/player-overview';

/**
 * Camada de cache Data (`'use cache'`) compartilhada entre Route Handlers e
 * páginas — a MESMA entrada de cache é reaproveitada, então abrir o perfil
 * esquenta a API e vice-versa.
 *
 * Os dados vêm da `TrackerSource` escolhida por `TRACKER_DATA_SOURCE` (padrão
 * `mock`); o `kind` entra na `cacheTag` para invalidar por fonte. Com a
 * HenrikDev, a fonte usa o `cached-client` (camada POR RECURSO `henrikdev:*`).
 *
 * `revalidate: 1500` (25min): uma partida ranqueada dura ~30–50min, então a
 * janela não muda entre navegações.
 */

export async function getCachedPlayerOverview(
  region: string,
  name: string,
  tag: string,
  size: number,
): Promise<PlayerOverview> {
  'use cache';
  cacheLife({ stale: 300, revalidate: 1500, expire: 21600 });
  const source = getTrackerSource();
  cacheTag(
    `player-overview:${source.kind}:${region}:${name.toLowerCase()}:${tag.toLowerCase()}:${size}`,
  );
  return buildPlayerOverview({ region, name, tag, size, source });
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
  const source = getTrackerSource();
  cacheTag(`player-breakdown:${source.kind}:${region}:${name.toLowerCase()}:${tag.toLowerCase()}`);
  return buildPlayerOverview({
    region,
    name,
    tag,
    actSample: { cap: ACT_SAMPLE_CAP, fallback: ACT_SAMPLE_FALLBACK },
    source,
  });
}

/**
 * Detalhe da partida. `focus` (Riot ID do `?player=`) é exigido pela fonte
 * simulada — o `matchId` deriva do foco — e entra na `cacheTag`. Na HenrikDev
 * o cache durável (Neon) é consultado no miss do cache Data.
 */
export async function getCachedMatchDetail(
  region: string,
  matchId: string,
  focus?: MatchFocus,
): Promise<MatchDetail> {
  'use cache';
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 });
  const source = getTrackerSource();
  const focusKey =
    focus === undefined ? '' : `:${focus.name.toLowerCase()}#${focus.tag.toLowerCase()}`;
  cacheTag(`match:${source.kind}:${region.toLowerCase()}:${matchId}${focusKey}`);
  return source.getMatchDetail(
    region,
    matchId,
    focus === undefined ? undefined : { name: focus.name, tag: focus.tag },
  );
}

/**
 * Cartão de jogador (in-game player card) para o destaque de MVP (o mock
 * devolve `null`). Cacheado por Riot ID — best-effort: `null` quando indisponível.
 */
export async function getCachedPlayerCard(name: string, tag: string): Promise<string | null> {
  'use cache';
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 });
  const source = getTrackerSource();
  cacheTag(`player-card:${source.kind}:${name.toLowerCase()}:${tag.toLowerCase()}`);
  return source.getPlayerCard(name, tag);
}
