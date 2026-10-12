import { cacheLife, cacheTag } from 'next/cache';
import { loadAppEnv, requireEnv } from '@/config/env';
import type {
  HenrikDevAccountV1,
  HenrikDevMatchV4,
  HenrikDevMmrHistoryEntryV2,
  HenrikDevMmrV2,
  HenrikDevMmrV3,
} from '@/contracts/henrikdev';
import {
  createHenrikDevClient,
  type FetchAccountParams,
  type FetchMatchByIdParams,
  type FetchMmrHistoryParams,
  type FetchMmrParams,
  type FetchPlayerMatchesParams,
  type HenrikDevClient,
} from '@/services/henrikdev/client';

/**
 * Client da HenrikDev com cache Data POR RECURSO (`'use cache'`).
 * ======================================================================
 *
 * Cada endpoint tem a PRÓPRIA entrada de cache. Isso protege a cota da
 * HenrikDev contra o custo de UMA tela: o perfil e o Breakdown pedem os mesmos
 * recursos complementares (conta, MMR v2/v3, histórico), então o segundo
 * aquece a partir do cache do primeiro em vez de repetir a chamada upstream.
 *
 * TTL: uma partida ranqueada dura ~30–50min, então 25min (`revalidate: 1500`)
 * é seguro para o que muda a cada partida; nível/cartão mudam raramente (1h).
 *
 * Módulo SERVER-ONLY: chamado dentro de `getCached*` (`src/lib/cache/tracker.ts`)
 * e da rota de combate. Os serviços recebem o client por injeção (DIP), então
 * os testes continuam usando um client falso sem tocar `next/cache`.
 */

/** Cria o client REAL — fail-fast da chave só no cache MISS (hit não usa env). */
function createClient(): HenrikDevClient {
  return createHenrikDevClient({ apiKey: requireEnv(loadAppEnv(), 'HENRIKDEV_API_KEY') });
}

function lower(value: string): string {
  return value.toLowerCase();
}

/** Página de partidas competitivas (v4): no máx. 10 por chamada, daí `start`. */
export async function fetchCachedPlayerMatches(
  params: FetchPlayerMatchesParams,
): Promise<readonly HenrikDevMatchV4[]> {
  'use cache';
  cacheLife({ stale: 300, revalidate: 1500, expire: 21600 });
  cacheTag(
    `henrikdev:matches:${params.affinity}:${params.platform}:${lower(params.name)}:` +
      `${lower(params.tag)}:${params.mode ?? 'all'}:${params.size ?? 'default'}:${params.start ?? 0}`,
  );
  return createClient().fetchPlayerMatches(params);
}

/** Detalhe de UMA partida (v4) — payload imutável, cache longo. */
export async function fetchCachedMatchById(
  params: FetchMatchByIdParams,
): Promise<HenrikDevMatchV4> {
  'use cache';
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 });
  cacheTag(`henrikdev:match:${params.affinity}:${params.matchId}`);
  return createClient().fetchMatchById(params);
}

/** Trajetória de RR (v2 mmr-history) — muda a cada partida. */
export async function fetchCachedMmrHistory(
  params: FetchMmrHistoryParams,
): Promise<readonly HenrikDevMmrHistoryEntryV2[]> {
  'use cache';
  cacheLife({ stale: 300, revalidate: 1500, expire: 21600 });
  cacheTag(
    `henrikdev:mmr-history:${params.affinity}:${params.platform}:` +
      `${lower(params.name)}:${lower(params.tag)}`,
  );
  return createClient().fetchMmrHistory(params);
}

/** Identidade da conta (v1 account): nível + cartão — muda raramente. */
export async function fetchCachedAccount(params: FetchAccountParams): Promise<HenrikDevAccountV1> {
  'use cache';
  cacheLife({ stale: 300, revalidate: 3600, expire: 21600 });
  cacheTag(`henrikdev:account:${lower(params.name)}:${lower(params.tag)}`);
  return createClient().fetchAccount(params);
}

/** Ranque atual (v2 mmr) — tier/RR mudam a cada partida. */
export async function fetchCachedMmr(params: FetchMmrParams): Promise<HenrikDevMmrV2> {
  'use cache';
  cacheLife({ stale: 300, revalidate: 1500, expire: 21600 });
  cacheTag(
    `henrikdev:mmr:${params.affinity}:${params.platform}:${lower(params.name)}:${lower(params.tag)}`,
  );
  return createClient().fetchMmr(params);
}

/** Temporadas do MMR v3 (`seasonal[]`) — base da amostra por ato do Breakdown. */
export async function fetchCachedMmrV3(params: FetchMmrParams): Promise<HenrikDevMmrV3> {
  'use cache';
  cacheLife({ stale: 300, revalidate: 1500, expire: 21600 });
  cacheTag(
    `henrikdev:mmr-v3:${params.affinity}:${params.platform}:${lower(params.name)}:${lower(params.tag)}`,
  );
  return createClient().fetchMmrV3(params);
}

/**
 * Adapta os wrappers cacheados à interface `HenrikDevClient` para ser injetado
 * como `client` nos serviços. Barato e sem I/O: a chave só é exigida no MISS.
 */
export function createCachedHenrikDevClient(): HenrikDevClient {
  return {
    fetchPlayerMatches: fetchCachedPlayerMatches,
    fetchMatchById: fetchCachedMatchById,
    fetchMmrHistory: fetchCachedMmrHistory,
    fetchAccount: fetchCachedAccount,
    fetchMmr: fetchCachedMmr,
    fetchMmrV3: fetchCachedMmrV3,
  };
}
