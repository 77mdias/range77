import { describe, expect, it, vi } from 'vitest';
import type { HenrikDevMatchV4 } from '@/contracts/henrikdev';
import type { MatchCacheRow, MatchCacheStore } from '@/lib/db/match-cache-store';
import { HenrikDevApiError } from '@/services/henrikdev/client';
import { getMatchDetail, MATCH_CACHE_TTL_MS } from '@/services/tracker/match-detail';

/**
 * SUITE TDD — detalhe de partida com cache durável (DIP: client + store).
 */

const rawMatch: HenrikDevMatchV4 = {
  metadata: {
    match_id: 'm-1',
    map: { id: 'ascent', name: 'Ascent' },
    queue: { id: 'competitive' },
    started_at: '2026-10-01T12:00:00.000Z',
    is_completed: true,
  },
  players: [
    {
      puuid: 'p1',
      name: 'Player',
      tag: 'BR1',
      team_id: 'Red',
      stats: { score: 4000, kills: 20, deaths: 10, assists: 5, headshots: 10, bodyshots: 20, legshots: 10 },
    },
  ],
  teams: [
    { team_id: 'Red', rounds: { won: 13, lost: 7 }, won: true },
    { team_id: 'Blue', rounds: { won: 7, lost: 13 }, won: false },
  ],
  rounds: [{ id: 0, winning_team: 'Red' }],
  kills: [],
};

const NOW = 1_000_000;

const makeClient = (result: HenrikDevMatchV4 | Error) => ({
  fetchPlayerMatches: vi.fn(),
  fetchMatchById: vi.fn(async () => {
    if (result instanceof Error) {
      throw result;
    }
    return result;
  }),
});

const cacheRow = (expiresAt: Date): MatchCacheRow => ({
  matchId: 'm-1',
  region: 'br',
  payload: rawMatch,
  fetchedAt: new Date(0),
  expiresAt,
});

const makeStore = (row: MatchCacheRow | null) => ({
  get: vi.fn(async () => row),
  put: vi.fn(async () => {}),
});

describe('getMatchDetail', () => {
  it('HIT válido: responde do cache SEM chamar a HenrikDev', async () => {
    const store = makeStore(cacheRow(new Date(NOW + 1000)));
    const client = makeClient(new Error('não deveria ser chamado'));

    const detail = await getMatchDetail({
      region: 'BR',
      matchId: 'm-1',
      client: client as never,
      cacheStore: store as MatchCacheStore,
      now: () => NOW,
    });

    expect(detail.matchId).toBe('m-1');
    expect(detail.region).toBe('br');
    expect(client.fetchMatchById).not.toHaveBeenCalled();
    expect(store.put).not.toHaveBeenCalled();
  });

  it('MISS: busca na HenrikDev, persiste com TTL e responde', async () => {
    const store = makeStore(null);
    const client = makeClient(rawMatch);

    const detail = await getMatchDetail({
      region: 'br',
      matchId: 'm-1',
      client: client as never,
      cacheStore: store as MatchCacheStore,
      now: () => NOW,
    });

    expect(client.fetchMatchById).toHaveBeenCalledWith({ affinity: 'br', matchId: 'm-1' });
    expect(store.put).toHaveBeenCalledWith({
      matchId: 'm-1',
      region: 'br',
      payload: rawMatch,
      expiresAt: new Date(NOW + MATCH_CACHE_TTL_MS),
    });
    expect(detail.scoreboard).toHaveLength(1);
  });

  it('expiração: linha vencida força novo fetch e regravação', async () => {
    const store = makeStore(cacheRow(new Date(NOW - 1)));
    const client = makeClient(rawMatch);

    await getMatchDetail({
      region: 'br',
      matchId: 'm-1',
      client: client as never,
      cacheStore: store as MatchCacheStore,
      now: () => NOW,
    });

    expect(client.fetchMatchById).toHaveBeenCalledTimes(1);
    expect(store.put).toHaveBeenCalledTimes(1);
  });

  it('cacheStore null desliga o cache (sem leitura/escrita)', async () => {
    const client = makeClient(rawMatch);

    const detail = await getMatchDetail({
      region: 'br',
      matchId: 'm-1',
      client: client as never,
      cacheStore: null,
    });

    expect(client.fetchMatchById).toHaveBeenCalledTimes(1);
    expect(detail.matchId).toBe('m-1');
  });

  it('falha de escrita do cache é best-effort (resposta continua)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const store = {
      get: vi.fn(async () => null),
      put: vi.fn(async () => {
        throw new Error('db down');
      }),
    };
    const client = makeClient(rawMatch);

    try {
      const detail = await getMatchDetail({
        region: 'br',
        matchId: 'm-1',
        client: client as never,
        cacheStore: store as MatchCacheStore,
        now: () => NOW,
      });

      expect(detail.matchId).toBe('m-1');
      expect(warnSpy).toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('propaga erro upstream do client', async () => {
    const store = makeStore(null);

    await expect(
      getMatchDetail({
        region: 'br',
        matchId: 'm-1',
        client: makeClient(new HenrikDevApiError(404, 'Match not found', 10_004)) as never,
        cacheStore: store as MatchCacheStore,
        now: () => NOW,
      }),
    ).rejects.toMatchObject({ status: 404 });
  });
});
