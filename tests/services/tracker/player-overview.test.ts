import { describe, expect, it, vi } from 'vitest';
import type { HenrikDevMatchV4 } from '@/contracts/henrikdev';
import type { CombatSnapshotStore } from '@/lib/db/combat-snapshot-store';
import { PlayerNoMatchesError } from '@/services/coaching/player-combat';
import { buildPlayerOverview } from '@/services/tracker/player-overview';

/**
 * SUITE TDD — visão geral do jogador (um único fetch → envelope + agregações).
 */

const makeMatch = (overrides: {
  id: string;
  map: string;
  agent: string;
  startedAt: string;
  result: 'win' | 'loss';
  score: number;
}): HenrikDevMatchV4 => ({
  metadata: {
    match_id: overrides.id,
    map: { id: overrides.map.toLowerCase(), name: overrides.map },
    queue: { id: 'competitive' },
    season: { id: 's1', short: 'V25A3' },
    started_at: overrides.startedAt,
    is_completed: true,
  },
  players: [
    {
      puuid: 'p1',
      name: 'Player',
      tag: 'BR1',
      team_id: 'Red',
      agent: { id: overrides.agent.toLowerCase(), name: overrides.agent },
      stats: {
        score: overrides.score,
        kills: 20,
        deaths: 12,
        assists: 5,
        headshots: 10,
        bodyshots: 20,
        legshots: 10,
      },
    },
  ],
  teams: [
    { team_id: 'Red', rounds: { won: overrides.result === 'win' ? 13 : 8, lost: overrides.result === 'win' ? 8 : 13 }, won: overrides.result === 'win' },
    { team_id: 'Blue', rounds: { won: overrides.result === 'win' ? 8 : 13, lost: overrides.result === 'win' ? 13 : 8 }, won: overrides.result === 'loss' },
  ],
  rounds: [{ id: 0, winning_team: 'Red' }],
  kills: [],
});

const win = makeMatch({ id: 'm-1', map: 'Ascent', agent: 'Jett', startedAt: '2026-10-02T00:00:00.000Z', result: 'win', score: 4000 });
const loss = makeMatch({ id: 'm-2', map: 'Haven', agent: 'Reyna', startedAt: '2026-10-01T00:00:00.000Z', result: 'loss', score: 3000 });

const mmrHistory = [
  {
    match_id: 'm-2',
    rr: 60,
    last_change: -20,
    tier: { id: 18, name: 'Diamond 1' },
    date: '2026-10-01T00:00:00.000Z',
  },
  {
    match_id: 'm-1',
    rr: 78,
    last_change: 18,
    tier: { id: 18, name: 'Diamond 1' },
    date: '2026-10-02T00:00:00.000Z',
  },
];

const makeClient = (
  result: readonly HenrikDevMatchV4[] | Error,
  mmr: readonly unknown[] | Error = mmrHistory,
) => ({
  fetchPlayerMatches: vi.fn(async () => {
    if (result instanceof Error) {
      throw result;
    }
    return result;
  }),
  fetchMatchById: vi.fn(),
  fetchMmrHistory: vi.fn(async () => {
    if (mmr instanceof Error) {
      throw mmr;
    }
    return mmr;
  }),
});

const makeStore = () => ({
  insertSnapshot: vi.fn(async () => {}),
  getRecentSnapshots: vi.fn(async () => []),
});

describe('buildPlayerOverview', () => {
  it('faz UM fetch e deriva combate + histórico + agregações', async () => {
    const client = makeClient([win, loss]);
    const store = makeStore();

    const overview = await buildPlayerOverview({
      region: 'BR',
      name: 'Player',
      tag: 'BR1',
      size: 5,
      client: client as never,
      snapshotStore: store as CombatSnapshotStore,
    });

    expect(client.fetchPlayerMatches).toHaveBeenCalledTimes(1);
    expect(client.fetchPlayerMatches).toHaveBeenCalledWith({
      affinity: 'br',
      platform: 'pc',
      name: 'Player',
      tag: 'BR1',
      mode: 'competitive',
      size: 5,
    });

    expect(overview.player).toEqual({ region: 'br', name: 'Player', tag: 'BR1', platform: 'pc' });
    expect(overview.matches.map((match) => match.matchId)).toEqual(['m-1', 'm-2']);
    expect(overview.agents.map((agent) => agent.key).sort()).toEqual(['Jett', 'Reyna']);
    expect(overview.maps.map((map) => map.key).sort()).toEqual(['Ascent', 'Haven']);
    // vitória mais recente → streak atual de 1 vitória
    expect(overview.streaks.current).toEqual({ result: 'win', length: 1 });
    // cronológico: derrota 3000/21≈143 → vitória 4000/21≈190
    expect(overview.trend.perMatch).toEqual([143, 190]);
    expect(overview.combat.player.name).toBe('Player');
    // snapshot persistido (write-through best-effort)
    expect(store.insertSnapshot).toHaveBeenCalledTimes(1);
    // MMR history normalizado e ordenado cronologicamente
    expect(client.fetchMmrHistory).toHaveBeenCalledWith({
      affinity: 'br',
      platform: 'pc',
      name: 'Player',
      tag: 'BR1',
    });
    expect(overview.rrHistory.map((point) => point.matchId)).toEqual(['m-2', 'm-1']);
    expect(overview.rrHistory.map((point) => point.result)).toEqual(['loss', 'win']);
  });

  it('MMR history indisponível → rrHistory vazia sem derrubar o perfil', async () => {
    const client = makeClient([win, loss], new Error('premium required'));

    const overview = await buildPlayerOverview({
      region: 'br',
      name: 'Player',
      tag: 'BR1',
      client: client as never,
      snapshotStore: null,
    });

    expect(overview.rrHistory).toEqual([]);
    expect(overview.matches).toHaveLength(2);
  });

  it('propaga PlayerNoMatchesError quando não há partidas válidas', async () => {
    const invalid: HenrikDevMatchV4 = {
      ...win,
      metadata: { ...win.metadata, queue: { id: 'unrated' } },
    };
    const client = makeClient([invalid]);

    await expect(
      buildPlayerOverview({
        region: 'br',
        name: 'Player',
        tag: 'BR1',
        client: client as never,
        snapshotStore: null,
      }),
    ).rejects.toBeInstanceOf(PlayerNoMatchesError);
  });
});
