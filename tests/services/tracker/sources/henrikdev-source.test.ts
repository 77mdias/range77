import { describe, expect, it, vi } from 'vitest';
import type { HenrikDevMatchV4 } from '@/contracts/henrikdev';
import { createHenrikDevSource } from '@/services/tracker/sources/henrikdev-source';

/**
 * SUITE TDD — fonte HenrikDev (guardada; fora do caminho padrão). Os fluxos
 * finos (paginação por ato, best-effort dos complementos) são cobertos via
 * `player-overview.test.ts`, que injeta esta fonte.
 */

const rawMatch: HenrikDevMatchV4 = {
  metadata: {
    match_id: 'm-1',
    map: { id: 'ascent', name: 'Ascent' },
    queue: { id: 'competitive' },
    season: { id: 's1', short: 'V25A3' },
    started_at: '2026-10-01T12:00:00.000Z',
    is_completed: true,
  },
  players: [
    {
      puuid: 'p1',
      name: 'Player',
      tag: 'BR1',
      team_id: 'Red',
      account_level: 77,
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

const makeClient = () => ({
  fetchPlayerMatches: vi.fn(async () => [rawMatch]),
  fetchMatchById: vi.fn(async () => rawMatch),
  fetchMmrHistory: vi.fn(async () => []),
  fetchAccount: vi.fn(async () => ({ card: { small: 'card.png' } })),
  fetchMmr: vi.fn(async () => {
    throw new Error('mmr off');
  }),
  fetchMmrV3: vi.fn(async () => null),
});

describe('createHenrikDevSource', () => {
  it('getPlayerSample normaliza a amostra (details vazio nesta fase)', async () => {
    const client = makeClient();
    const source = createHenrikDevSource(client as never);

    const sample = await source.getPlayerSample({ region: 'BR', name: 'Player', tag: 'BR1', size: 3 });

    expect(source.kind).toBe('henrikdev');
    expect(client.fetchPlayerMatches).toHaveBeenCalledWith(
      expect.objectContaining({ affinity: 'br', size: 3, mode: 'competitive' }),
    );
    expect(sample.matches).toHaveLength(1);
    expect(sample.combat).toHaveLength(1);
    expect(sample.details).toEqual([]);
    expect(sample.level).toBe(77);
    expect(sample.cardSrc).toBe('card.png');
    expect(sample.rank).toBeNull();
    expect(sample.rrHistory).toEqual([]);
  });

  it('getMatchDetail delega ao detalhe com cache durável (foco ignorado)', async () => {
    const client = makeClient();
    const source = createHenrikDevSource(client as never, { matchCacheStore: null });

    const detail = await source.getMatchDetail('BR', 'm-1', { name: 'X', tag: 'Y' });

    expect(client.fetchMatchById).toHaveBeenCalledWith({ affinity: 'br', matchId: 'm-1' });
    expect(detail.matchId).toBe('m-1');
  });

  it('getPlayerCard é best-effort', async () => {
    const client = makeClient();
    expect(await createHenrikDevSource(client as never).getPlayerCard('a', 'b')).toBe('card.png');
    client.fetchAccount.mockRejectedValueOnce(new Error('off'));
    expect(await createHenrikDevSource(client as never).getPlayerCard('a', 'b')).toBeNull();
  });
});
