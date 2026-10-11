import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HenrikDevMatchV4 } from '@/contracts/henrikdev';
import {
  createHenrikDevClient,
  henrikDevErrorStatus,
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

describe('fetchMatchById', () => {
  const detail: HenrikDevMatchV4 = {
    metadata: { match_id: 'abc-123' },
    players: [],
    teams: [],
    rounds: [],
    kills: [],
  };

  it('busca a partida com URL (sem platform) e header Authorization', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: 200, data: detail }));

    const result = await makeClient().fetchMatchById({ affinity: 'br', matchId: 'abc-123' });

    expect(result).toEqual(detail);
    const [url, init] = fetchMock.mock.calls[0] as [URL | Request, RequestInit];
    expect(String(url)).toBe('https://api.henrikdev.xyz/valorant/v4/match/br/abc-123');
    expect(new Headers(init.headers).get('authorization')).toBe('HDEV-test-key');
  });

  it('codifica o match_id e aceita o objeto na raiz (sem envelope data)', async () => {
    const rooted: HenrikDevMatchV4 = { metadata: { match_id: 'a b' }, players: [], teams: [] };
    fetchMock.mockResolvedValueOnce(jsonResponse(rooted));

    const result = await makeClient().fetchMatchById({ affinity: 'eu', matchId: 'a b' });

    expect(result).toEqual(rooted);
    const [url] = fetchMock.mock.calls[0] as [URL | Request];
    expect(String(url)).toBe('https://api.henrikdev.xyz/valorant/v4/match/eu/a%20b');
  });

  it('rejeita resposta sem data/metadata como malformada', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: 200 }));

    await expect(
      makeClient().fetchMatchById({ affinity: 'na', matchId: 'x' }),
    ).rejects.toMatchObject({ status: 502, code: 'MALFORMED_RESPONSE' });
  });

  it('mapeia 404 de partida como HenrikDevApiError', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ errors: [{ code: 10_004, message: 'Match not found', status: 404 }] }, 404),
    );

    await expect(
      makeClient().fetchMatchById({ affinity: 'na', matchId: 'x' }),
    ).rejects.toMatchObject({ status: 404, code: 10_004 });
  });

  it('falha de rede vira NETWORK_ERROR', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));

    await expect(
      makeClient().fetchMatchById({ affinity: 'na', matchId: 'x' }),
    ).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });
});

describe('fetchMmrHistory', () => {
  it('busca o histórico de MMR com URL codificada e header Authorization', async () => {
    const history = [
      { rr: 78, last_change: 18, match_id: 'm-1', date: '2026-10-01T00:00:00Z' },
    ];
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ status: 200, data: { account: {}, history } }),
    );

    const result = await makeClient().fetchMmrHistory({
      affinity: 'br',
      platform: 'pc',
      name: 'Player One',
      tag: 'BR1',
    });

    expect(result).toEqual(history);
    const [url, init] = fetchMock.mock.calls[0] as [URL | Request, RequestInit];
    expect(String(url)).toBe(
      'https://api.henrikdev.xyz/valorant/v2/mmr-history/br/pc/Player%20One/BR1',
    );
    expect(new Headers(init.headers).get('authorization')).toBe('HDEV-test-key');
  });

  it('resposta sem data.history é rejeitada como malformada', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: 200, data: {} }));

    await expect(
      makeClient().fetchMmrHistory({ affinity: 'br', platform: 'pc', name: 'P', tag: '1' }),
    ).rejects.toMatchObject({ status: 502, code: 'MALFORMED_RESPONSE', message: /malformada/ });
  });

  it('mapeia 403 premium como HenrikDevApiError', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ errors: [{ code: 10_021, message: 'Premium required', status: 403 }] }, 403),
    );

    await expect(
      makeClient().fetchMmrHistory({ affinity: 'na', platform: 'pc', name: 'P', tag: '1' }),
    ).rejects.toMatchObject({ status: 403, code: 10_021 });
  });
});

describe('henrikDevErrorStatus', () => {
  it('lê o status de uma instância viva do erro', () => {
    expect(henrikDevErrorStatus(new HenrikDevApiError(404, 'x', 23))).toBe(404);
    expect(henrikDevErrorStatus(new HenrikDevApiError(0, 'rede'))).toBe(0);
  });

  it('recupera o status de um erro SERIALIZADO pela fronteira `use cache`', () => {
    // O Next reconstrói o erro como `Error` comum preservando só name/message —
    // por isso o status é codificado no `name` (ver HenrikDevApiError).
    const serialized = Object.assign(new Error('Region not found'), {
      name: 'HenrikDevApiError:404',
    });

    expect(henrikDevErrorStatus(serialized)).toBe(404);
  });

  it('retorna null para erros alheios ou nomes sem status numérico', () => {
    expect(henrikDevErrorStatus(new Error('boom'))).toBeNull();
    expect(henrikDevErrorStatus('string')).toBeNull();
    expect(henrikDevErrorStatus(Object.assign(new Error('x'), { name: 'HenrikDevApiError:x' }))).toBeNull();
  });
});

describe('fetchAccount / fetchMmr', () => {
  it('busca a conta (v1) com nome/tag codificados e header Authorization', async () => {
    const account = { name: 'Player One', tag: 'BR1', account_level: 242, card: { large: 'https://media/large.png' } };
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: 200, data: account }));

    const result = await makeClient().fetchAccount({ name: 'Player One', tag: 'BR1' });

    expect(result).toEqual(account);
    const [url, init] = fetchMock.mock.calls[0] as [URL | Request, RequestInit];
    expect(String(url)).toBe('https://api.henrikdev.xyz/valorant/v1/account/Player%20One/BR1');
    expect((init.headers as Record<string, string>).Authorization).toBe('HDEV-test-key');
  });

  it('busca o MMR atual (v2) com affinity/platform e valida "data"', async () => {
    const mmr = {
      currenttier: 21,
      currenttierpatched: 'Immortal 1',
      images: { small: 'https://media/rank-small.png' },
      ranking_in_tier: 84,
    };
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: 200, data: mmr }));

    const result = await makeClient().fetchMmr({ affinity: 'br', platform: 'pc', name: 'Player One', tag: 'BR1' });

    expect(result).toEqual(mmr);
    const [url] = fetchMock.mock.calls[0] as [URL | Request, RequestInit];
    expect(String(url)).toBe('https://api.henrikdev.xyz/valorant/v2/mmr/br/pc/Player%20One/BR1');
  });

  it('payload sem "data" vira erro 502 MALFORMED_RESPONSE', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: 200 }));
    await expect(makeClient().fetchAccount({ name: 'A', tag: 'B' })).rejects.toMatchObject({
      name: 'HenrikDevApiError:502',
      code: 'MALFORMED_RESPONSE',
    });

    fetchMock.mockResolvedValueOnce(jsonResponse({}));
    await expect(
      makeClient().fetchMmr({ affinity: 'br', platform: 'pc', name: 'A', tag: 'B' }),
    ).rejects.toMatchObject({ name: 'HenrikDevApiError:502' });
  });

  it('erro HTTP preserva o corpo {errors:[...]}', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ errors: [{ code: 4, message: '404 Not Found' }] }, 404),
    );
    await expect(makeClient().fetchAccount({ name: 'A', tag: 'B' })).rejects.toMatchObject({
      name: 'HenrikDevApiError:404',
      message: '404 Not Found',
    });
  });
});
