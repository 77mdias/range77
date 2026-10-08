import { loadAppEnv, requireEnv } from '@/config/env';
import type { HenrikDevMatchV4 } from '@/contracts/henrikdev';
import type { MatchDetail } from '@/contracts/tracker';
import {
  createMatchCacheStore,
  type MatchCacheStore,
} from '@/lib/db/match-cache-store';
import {
  createHenrikDevClient,
  type HenrikDevClient,
} from '@/services/henrikdev/client';
import { normalizeMatchToDetail } from '@/services/henrikdev/normalize-tracker';

/**
 * PASSO 3 — IMPLEMENTAÇÃO: detalhe de partida com cache durável.
 *
 * Fluxo: consulta o cache (Neon) → hit válido responde SEM tocar na HenrikDev;
 * miss → busca o payload bruto (v4 match_id) → persiste (best-effort) →
 * normaliza e responde. O TTL de 24h protege nosso limite de requisições.
 */

/** TTL do cache de partidas: 24h (partidas concluídas são imutáveis). */
export const MATCH_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export interface GetMatchDetailParams {
  readonly region: string;
  readonly matchId: string;
  /** Client injetado (testes). Sem ele, cria um com HENRIKDEV_API_KEY do env. */
  readonly client?: HenrikDevClient;
  /**
   * Store do cache: `undefined` cria o padrão (exige DATABASE_URL — fail
   * fast); `null` desliga o cache explicitamente; implementação própria é
   * injetada nos testes.
   */
  readonly cacheStore?: MatchCacheStore | null;
  /** Relógio injetável (testes de expiração). Padrão: `Date.now`. */
  readonly now?: () => number;
}

export async function getMatchDetail(params: GetMatchDetailParams): Promise<MatchDetail> {
  const { region, matchId } = params;
  const nowMs = (params.now ?? Date.now)();

  // Fail fast de CONFIGURAÇÃO: um problema de env falha em ms, não depois
  // de um fetch caro. `null` desliga o cache deliberadamente.
  const cacheStore =
    params.cacheStore === null ? null : (params.cacheStore ?? createMatchCacheStore());

  if (cacheStore !== null) {
    const cached = await cacheStore.get(matchId);
    if (cached !== null && cached.expiresAt.getTime() > nowMs) {
      // HIT: nenhuma chamada à HenrikDev (critério de aceite da fase 2).
      return normalizeMatchToDetail(cached.payload as HenrikDevMatchV4, region);
    }
  }

  // Só exige a chave da API no caminho de MISS (cache hit não precisa dela).
  const client =
    params.client ??
    createHenrikDevClient({ apiKey: requireEnv(loadAppEnv(), 'HENRIKDEV_API_KEY') });

  const raw = await client.fetchMatchById({ affinity: region.toLowerCase(), matchId });

  if (cacheStore !== null) {
    try {
      await cacheStore.put({
        matchId,
        region: region.toLowerCase(),
        payload: raw,
        expiresAt: new Date(nowMs + MATCH_CACHE_TTL_MS),
      });
    } catch (error) {
      // Escrita best-effort: nunca derruba a resposta já calculada.
      console.warn('[match-detail] cache não persistido (best-effort):', error);
    }
  }

  return normalizeMatchToDetail(raw, region);
}
