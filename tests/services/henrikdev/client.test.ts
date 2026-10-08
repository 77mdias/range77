import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HenrikDevMatchV4 } from '@/contracts/henrikdev';
import {
  createHenrikDevClient,
  HenrikDevApiError,
} from '@/services/henrikdev/client';

/**
 * SUITE TDD — client HTTP da HenrikDev v4.
 *
 * Mock global de `fetch`. Cobre: montagem de URL (encoding + query params),
 * header de autenticação, mapeamento de erros HTTP com corpo `{errors:[...]}`
 * (formato documentado), falha de rede e resposta malformada.
 */

const match: HenrikDevMatchV4 = {
  metadata: { match_id: 'm-1' },
  players: [],
  teams: [],
};

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const makeClient = () =>
  createHenrikDevClient({ apiKey: 'HDEV-test-key', fetchFn: fetchMock });

describe('createHenrikDevClient', () => {
  it('busca matches com URL codificada, query params e header Authorization', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: 200, data: [match] }));

    const result = await makeClient().fetchPlayerMatches({
      affinity: 'br',
      platform: 'pc',
      name: 'Player One',
      tag: 'BR1',
      mode: 'competitive',
      size: 5,
    });

    expect(result).toEqual([match]);

    const [url, init] = fetchMock.mock.calls[0] as [URL | Request, RequestInit];
    expect(String(url)).toBe(
      'https://api.henrikdev.xyz/valorant/v4/matches/br/pc/Player%20One/BR1?mode=competitive&size=5',
    );
    const headers = new Headers(init.headers);
    expect(headers.get('authorization')).toBe('HDEV-test-key');
  });

  it('tolera payload com array na raiz (defesa contra variação de envelope)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([match]));

    const result = await makeClient().fetchPlayerMatches({
      affinity: 'eu',
      platform: 'pc',
      name: 'Player',
      tag: 'EU1',
    });

    expect(result).toEqual([match]);
  });

  it('mapeia erro HTTP com corpo documentado {errors:[{code,message}]}', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { errors: [{ code: 10_001, message: 'Riot ID not found', status: 404 }] },
        404,
      ),
    );

    const attempt = makeClient().fetchPlayerMatches({
      affinity: 'na',
      platform: 'pc',
      name: 'Ghost',
      tag: 'NA1',
    });

    await expect(attempt).rejects.toBeInstanceOf(HenrikDevApiError);
    await expect(attempt).rejects.toMatchObject({
      status: 404,
      code: 10_001,
      message: 'Riot ID not found',
    });
  });

  it('erro HTTP sem corpo JSON usa fallback com status citado', async () => {
    fetchMock.mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }));

    await expect(
      makeClient().fetchPlayerMatches({
        affinity: 'kr',
        platform: 'pc',
        name: 'Player',
        tag: 'KR1',
      }),
    ).rejects.toMatchObject({ status: 401, message: /HenrikDev respondeu 401/ });
  });

  it('propaga 429 (rate limit upstream) como HenrikDevApiError', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ errors: [{ code: 10_003, message: 'Rate limit exceeded', status: 429 }] }, 429),
    );

    await expect(
      makeClient().fetchPlayerMatches({ affinity: 'br', platform: 'pc', name: 'P', tag: '1' }),
    ).rejects.toMatchObject({ status: 429 });
  });

  it('falha de rede vira HenrikDevApiError com status 0', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));

    await expect(
      makeClient().fetchPlayerMatches({ affinity: 'br', platform: 'pc', name: 'P', tag: '1' }),
    ).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });

  it('resposta 200 sem campo data é rejeitada como malformada', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: 200 }));

    await expect(
      makeClient().fetchPlayerMatches({ affinity: 'br', platform: 'pc', name: 'P', tag: '1' }),
    ).rejects.toMatchObject({ code: 'MALFORMED_RESPONSE', message: /malformada/ });
  });

  it('timeout durante o download do corpo vira NETWORK_ERROR (nunca um 500 interno)', async () => {
    // O corpo v4 é pesado (MBs); o abort pode disparar DEPOIS dos headers,
    // durante o stream do body — o parse precisa estar sob a mesma proteção.
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
      },
    } as unknown as Response);

    await expect(
      makeClient().fetchPlayerMatches({ affinity: 'br', platform: 'pc', name: 'P', tag: '1' }),
    ).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });
});
