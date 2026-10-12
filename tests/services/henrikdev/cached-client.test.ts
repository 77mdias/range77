import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * SUITE — client da HenrikDev com cache POR RECURSO (`'use cache'`).
 *
 * `next/cache` é neutralizado (preocupação de runtime do Next, não da lógica)
 * e o client real é trocado por um espião: validamos só a DELEGAÇÃO (mesmos
 * params), as TTLs e as chaves de `cacheTag` (com nome/tag em minúsculas).
 */

const mocks = vi.hoisted(() => ({
  client: {
    fetchPlayerMatches: vi.fn(),
    fetchMatchById: vi.fn(),
    fetchMmrHistory: vi.fn(),
    fetchAccount: vi.fn(),
    fetchMmr: vi.fn(),
    fetchMmrV3: vi.fn(),
  },
}));

vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));

vi.mock('@/services/henrikdev/client', () => ({
  createHenrikDevClient: vi.fn(() => mocks.client),
}));

import { cacheLife, cacheTag } from 'next/cache';
import {
  createCachedHenrikDevClient,
  fetchCachedAccount,
  fetchCachedMatchById,
  fetchCachedMmr,
  fetchCachedMmrHistory,
  fetchCachedMmrV3,
  fetchCachedPlayerMatches,
} from '@/services/henrikdev/cached-client';

const TTL_MATCH = { stale: 300, revalidate: 1500, expire: 21600 };
const TTL_ACCOUNT = { stale: 300, revalidate: 3600, expire: 21600 };

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('HENRIKDEV_API_KEY', 'HDEV-test');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('cached-client — delegação e chaves de cache', () => {
  it('createCachedHenrikDevClient expõe todos os métodos da interface', () => {
    const client = createCachedHenrikDevClient();
    expect(Object.keys(client).sort()).toEqual([
      'fetchAccount',
      'fetchMatchById',
      'fetchMmr',
      'fetchMmrHistory',
      'fetchMmrV3',
      'fetchPlayerMatches',
    ]);
  });

  it('fetchCachedPlayerMatches delega e usa a chave com página/modo (nome normalizado)', async () => {
    mocks.client.fetchPlayerMatches.mockResolvedValueOnce(['match']);
    const params = {
      affinity: 'br',
      platform: 'pc',
      name: 'Next To Nothing',
      tag: 'NOWAY',
      mode: 'competitive',
      size: 10,
      start: 20,
    };

    await expect(fetchCachedPlayerMatches(params)).resolves.toEqual(['match']);

    expect(mocks.client.fetchPlayerMatches).toHaveBeenCalledWith(params);
    expect(cacheLife).toHaveBeenCalledWith(TTL_MATCH);
    expect(cacheTag).toHaveBeenCalledWith(
      'henrikdev:matches:br:pc:next to nothing:noway:competitive:10:20',
    );
  });

  it('fetchCachedMatchById usa TTL longo (payload imutável)', async () => {
    mocks.client.fetchMatchById.mockResolvedValueOnce({ metadata: {} });

    await fetchCachedMatchById({ affinity: 'br', matchId: 'm-1' });

    expect(cacheLife).toHaveBeenCalledWith({ stale: 300, revalidate: 3600, expire: 86400 });
    expect(cacheTag).toHaveBeenCalledWith('henrikdev:match:br:m-1');
  });

  it('fetchCachedMmrHistory delega com chave por jogador', async () => {
    mocks.client.fetchMmrHistory.mockResolvedValueOnce([]);
    const params = { affinity: 'br', platform: 'pc', name: 'Player', tag: 'BR1' };

    await fetchCachedMmrHistory(params);

    expect(mocks.client.fetchMmrHistory).toHaveBeenCalledWith(params);
    expect(cacheTag).toHaveBeenCalledWith('henrikdev:mmr-history:br:pc:player:br1');
    expect(cacheLife).toHaveBeenCalledWith(TTL_MATCH);
  });

  it('fetchCachedAccount usa TTL de conta (muda raramente)', async () => {
    mocks.client.fetchAccount.mockResolvedValueOnce({ account_level: 10 });

    await fetchCachedAccount({ name: 'Player', tag: 'BR1' });

    expect(cacheTag).toHaveBeenCalledWith('henrikdev:account:player:br1');
    expect(cacheLife).toHaveBeenCalledWith(TTL_ACCOUNT);
  });

  it('fetchCachedMmr delega (tier/RR mudam a cada partida)', async () => {
    mocks.client.fetchMmr.mockResolvedValueOnce({ tier: 'Gold' });
    const params = { affinity: 'br', platform: 'pc', name: 'Player', tag: 'BR1' };

    await fetchCachedMmr(params);

    expect(mocks.client.fetchMmr).toHaveBeenCalledWith(params);
    expect(cacheTag).toHaveBeenCalledWith('henrikdev:mmr:br:pc:player:br1');
  });

  it('fetchCachedMmrV3 delega (base da amostra por ato)', async () => {
    mocks.client.fetchMmrV3.mockResolvedValueOnce({ seasonal: [] });
    const params = { affinity: 'br', platform: 'pc', name: 'Player', tag: 'BR1' };

    await fetchCachedMmrV3(params);

    expect(mocks.client.fetchMmrV3).toHaveBeenCalledWith(params);
    expect(cacheTag).toHaveBeenCalledWith('henrikdev:mmr-v3:br:pc:player:br1');
    expect(cacheLife).toHaveBeenCalledWith(TTL_MATCH);
  });
});
