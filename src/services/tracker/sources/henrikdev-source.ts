import { loadAppEnv, requireEnv } from '@/config/env';
import { COMPETITIVE_QUEUE_ID, type HenrikDevMatchV4 } from '@/contracts/henrikdev';
import type { RrHistoryPoint } from '@/contracts/tracker';
import type { MatchCacheStore } from '@/lib/db/match-cache-store';
import {
  type ActSampleOptions,
  resolveActMatchSample,
} from '@/services/analytics/act-window';
import { buildRrHistory } from '@/services/analytics/rr-trend';
import {
  createHenrikDevClient,
  type HenrikDevClient,
} from '@/services/henrikdev/client';
import { normalizeMatchesToCombat } from '@/services/henrikdev/normalize';
import {
  normalizeMatchesToSummaries,
  resolveAccountCard,
  resolveAccountLevel,
  resolveRankSummary,
  type PlayerRankSummary,
} from '@/services/henrikdev/normalize-tracker';
import { getMatchDetail } from '@/services/tracker/match-detail';
import { getPlayerCard } from '@/services/tracker/player-card';
import type {
  PlayerSample,
  PlayerSampleQuery,
  TrackerSource,
} from '@/services/tracker/source';

/**
 * Fonte HenrikDev do tracker — GUARDADA no repo, fora do caminho padrão
 * (`TRACKER_DATA_SOURCE=henrikdev`). Concentra o I/O que antes vivia em
 * `buildPlayerOverview`: amostra (fixa ou por ATO, paginando de 10 em 10) e
 * complementos best-effort (MMR history, conta, ranque) em PARALELO.
 */

/** Amostra padrão quando a consulta não informa `size`. */
const DEFAULT_SIZE = 5;

/** Tamanho de página da HenrikDev v4: o endpoint devolve no máx. 10 por chamada. */
export const MATCHES_PAGE_SIZE = 10;

export interface HenrikDevSourceOptions {
  /**
   * Cache durável (Neon) do detalhe de partida: `undefined` cria o padrão
   * (exige DATABASE_URL); `null` desliga; implementação própria nos testes.
   */
  readonly matchCacheStore?: MatchCacheStore | null;
}

/** Client lazy: sem injeção, só exige a chave no momento do uso. */
function clientResolver(client: HenrikDevClient | undefined): () => HenrikDevClient {
  let resolved = client;
  return () => {
    resolved ??= createHenrikDevClient({
      apiKey: requireEnv(loadAppEnv(), 'HENRIKDEV_API_KEY'),
    });
    return resolved;
  };
}

/**
 * Histórico de MMR (v2) — COMPLEMENTAR: se falhar (premium/indisponível),
 * omitimos a trajetória em vez de derrubar o perfil ou fabricar pontos.
 */
async function loadRrHistory(
  client: HenrikDevClient,
  region: string,
  name: string,
  tag: string,
): Promise<readonly RrHistoryPoint[]> {
  try {
    const history = await client.fetchMmrHistory({
      affinity: region.toLowerCase(),
      platform: 'pc',
      name,
      tag,
    });
    return buildRrHistory(history);
  } catch {
    return [];
  }
}

/** Cartão de jogador (ícone) — best-effort: falha → `null`. */
async function loadAccountCard(
  client: HenrikDevClient,
  name: string,
  tag: string,
): Promise<string | null> {
  try {
    return resolveAccountCard(await client.fetchAccount({ name, tag }));
  } catch {
    return null;
  }
}

/** Ranque atual (tier + imagem + RR no tier) — best-effort: falha → `null`. */
async function loadRank(
  client: HenrikDevClient,
  region: string,
  name: string,
  tag: string,
): Promise<PlayerRankSummary | null> {
  try {
    return resolveRankSummary(
      await client.fetchMmr({ affinity: region.toLowerCase(), platform: 'pc', name, tag }),
    );
  } catch {
    return null;
  }
}

/** Temporadas do MMR v3 (`seasonal`) — best-effort: falha → `null`. */
async function loadSeasonalMmr(
  client: HenrikDevClient,
  region: string,
  name: string,
  tag: string,
) {
  try {
    const mmr = await client.fetchMmrV3({
      affinity: region.toLowerCase(),
      platform: 'pc',
      name,
      tag,
    });
    return mmr.seasonal ?? null;
  } catch {
    return null;
  }
}

/**
 * Amostra "por ato" do Breakdown. Busca a 1ª página, deriva o ATO da partida
 * mais recente e quantas partidas o jogador tem nele (MMR v3 `seasonal`) e
 * pagina o restante EM PARALELO. Sem contagem confiável, cai no fallback.
 */
async function loadActSampleMatches(
  client: HenrikDevClient,
  region: string,
  name: string,
  tag: string,
  options: ActSampleOptions,
): Promise<readonly HenrikDevMatchV4[]> {
  const base = {
    affinity: region.toLowerCase(),
    platform: 'pc',
    name,
    tag,
    mode: COMPETITIVE_QUEUE_ID,
  };

  // O MMR v3 (só dimensiona a amostra) é independente da 1ª página.
  const seasonalPromise = loadSeasonalMmr(client, region, name, tag);

  const firstPage = await client.fetchPlayerMatches({
    ...base,
    size: MATCHES_PAGE_SIZE,
    start: 0,
  });
  if (firstPage.length === 0) {
    return firstPage;
  }

  const seasonal = await seasonalPromise;
  const seasonId = firstPage[0]?.metadata?.season?.id ?? null;
  const target = resolveActMatchSample(seasonId, seasonal, options);

  const collected: HenrikDevMatchV4[] = [...firstPage];
  const remainingStarts: number[] = [];
  for (let start = MATCHES_PAGE_SIZE; start < target; start += MATCHES_PAGE_SIZE) {
    remainingStarts.push(start);
  }
  const remainingPages = await Promise.all(
    remainingStarts.map((start) =>
      client.fetchPlayerMatches({
        ...base,
        size: Math.min(MATCHES_PAGE_SIZE, target - start),
        start,
      }),
    ),
  );
  for (const page of remainingPages) {
    collected.push(...page);
  }

  return collected.slice(0, target);
}

export function createHenrikDevSource(
  client?: HenrikDevClient,
  options: HenrikDevSourceOptions = {},
): TrackerSource {
  const getClient = clientResolver(client);

  return {
    kind: 'henrikdev',

    async getPlayerSample(query: PlayerSampleQuery): Promise<PlayerSample> {
      const { region, name, tag, size = DEFAULT_SIZE } = query;
      const henrik = getClient();

      // Amostra e complementos são INDEPENDENTES: disparam em paralelo. Os
      // complementos nunca rejeitam (best-effort).
      const matchesPromise: Promise<readonly HenrikDevMatchV4[]> =
        query.actSample !== undefined
          ? loadActSampleMatches(henrik, region, name, tag, query.actSample)
          : henrik.fetchPlayerMatches({
              affinity: region.toLowerCase(),
              platform: 'pc',
              name,
              tag,
              mode: COMPETITIVE_QUEUE_ID,
              size,
            });

      const auxPromise = Promise.all([
        loadRrHistory(henrik, region, name, tag),
        loadAccountCard(henrik, name, tag),
        loadRank(henrik, region, name, tag),
      ]);

      const rawMatches = await matchesPromise;
      const [rrHistory, cardSrc, rank] = await auxPromise;

      return {
        matches: normalizeMatchesToSummaries(rawMatches, { name, tag }, region),
        combat: normalizeMatchesToCombat(rawMatches, { name, tag }),
        details: [],
        level: resolveAccountLevel(rawMatches, { name, tag }),
        cardSrc,
        rank,
        rrHistory,
      };
    },

    getMatchDetail(region, matchId) {
      return getMatchDetail({
        region,
        matchId,
        // Sem client injetado, o detalhe só exige a chave no MISS do cache.
        ...(client !== undefined ? { client } : {}),
        ...(options.matchCacheStore !== undefined ? { cacheStore: options.matchCacheStore } : {}),
      });
    },

    getPlayerCard(name, tag) {
      return getPlayerCard({ name, tag, ...(client !== undefined ? { client } : {}) });
    },
  };
}
