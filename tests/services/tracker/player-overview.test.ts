import { describe, expect, it, vi } from 'vitest';
import type { HenrikDevMatchV4 } from '@/contracts/henrikdev';
import type { CombatSnapshotStore } from '@/lib/db/combat-snapshot-store';
import { PlayerNoMatchesError } from '@/services/coaching/player-combat';
import { buildPlayerOverview } from '@/services/tracker/player-overview';
import { createHenrikDevSource } from '@/services/tracker/sources/henrikdev-source';

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
  accountLevel?: number;
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
      ...(overrides.accountLevel !== undefined
        ? { account_level: overrides.accountLevel }
        : {}),
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

const win = makeMatch({ id: 'm-1', map: 'Ascent', agent: 'Jett', startedAt: '2026-10-02T00:00:00.000Z', result: 'win', score: 4000, accountLevel: 242 });
const loss = makeMatch({ id: 'm-2', map: 'Haven', agent: 'Reyna', startedAt: '2026-10-01T00:00:00.000Z', result: 'loss', score: 3000, accountLevel: 100 });

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
  account: unknown | Error = { card: { large: 'https://media/card-large.png' } },
  currentMmr: unknown | Error = {
    current_data: {
      currenttierpatched: 'Ascendant 3',
      images: { small: 'https://media/rank-small.png' },
      ranking_in_tier: 84,
    },
  },
  mmrV3: unknown | Error = { seasonal: [{ season: { id: 's1', short: 'V25A3' }, games: 8 }] },
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
  fetchAccount: vi.fn(async () => {
    if (account instanceof Error) {
      throw account;
    }
    return account;
  }),
  fetchMmr: vi.fn(async () => {
    if (currentMmr instanceof Error) {
      throw currentMmr;
    }
    return currentMmr;
  }),
  fetchMmrV3: vi.fn(async () => {
    if (mmrV3 instanceof Error) {
      throw mmrV3;
    }
    return mmrV3;
  }),
});

/**
 * Client paginado: respeita `start`/`size` como a HenrikDev v4 (páginas de
 * até 10). Usado para validar o modo "por ato".
 */
const makePagedClient = (all: readonly HenrikDevMatchV4[], mmrV3: unknown | Error) => ({
  fetchPlayerMatches: vi.fn(async (params: { readonly start?: number; readonly size?: number }) => {
    const start = params.start ?? 0;
    const size = params.size ?? 10;
    return all.slice(start, start + size);
  }),
  fetchMatchById: vi.fn(),
  fetchMmrHistory: vi.fn(async () => []),
  fetchAccount: vi.fn(async () => null),
  fetchMmr: vi.fn(async () => {
    throw new Error('fetchMmr não usado neste fluxo');
  }),
  fetchMmrV3: vi.fn(async () => {
    if (mmrV3 instanceof Error) {
      throw mmrV3;
    }
    return mmrV3;
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
      source: createHenrikDevSource(client as never),
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

    expect(overview.player).toEqual({
      region: 'br',
      name: 'Player',
      tag: 'BR1',
      platform: 'pc',
      // nível da partida MAIS RECENTE (m-1) quando há mais de um valor
      level: 242,
      // ícone do cartão (v1 account) resolvido em paralelo
      cardSrc: 'https://media/card-large.png',
    });
    // ranque atual (v2 mmr) normalizado
    expect(overview.rank).toEqual({
      tier: 'Ascendant 3',
      imageSrc: 'https://media/rank-small.png',
      rrInTier: 84,
    });
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

  it('dispara amostra e complementos em PARALELO (não soma as latências)', async () => {
    let releaseMatches: (() => void) | undefined;
    const matchesGate = new Promise<void>((resolve) => {
      releaseMatches = resolve;
    });
    const client = {
      fetchPlayerMatches: vi.fn(async () => {
        await matchesGate;
        return [win, loss];
      }),
      fetchMatchById: vi.fn(),
      fetchMmrHistory: vi.fn(async () => mmrHistory),
      fetchAccount: vi.fn(async () => ({ card: { large: 'https://media/card-large.png' } })),
      fetchMmr: vi.fn(async () => ({
        current_data: {
          currenttierpatched: 'Ascendant 3',
          images: { small: 'https://media/rank-small.png' },
          ranking_in_tier: 84,
        },
      })),
      fetchMmrV3: vi.fn(),
    };

    const pending = buildPlayerOverview({
      region: 'br',
      name: 'Player',
      tag: 'BR1',
      source: createHenrikDevSource(client as never),
      snapshotStore: null,
    });

    // Sem aguardar a amostra (gate ainda fechado), os complementos JÁ foram
    // disparados — prova de que rodam concorrentes, não em série.
    expect(client.fetchMmrHistory).toHaveBeenCalledTimes(1);
    expect(client.fetchAccount).toHaveBeenCalledTimes(1);
    expect(client.fetchMmr).toHaveBeenCalledTimes(1);

    releaseMatches?.();
    await pending;
  });

  it('MMR history indisponível → rrHistory vazia sem derrubar o perfil', async () => {
    const client = makeClient([win, loss], new Error('premium required'));

    const overview = await buildPlayerOverview({
      region: 'br',
      name: 'Player',
      tag: 'BR1',
      source: createHenrikDevSource(client as never),
      snapshotStore: null,
    });

    expect(overview.rrHistory).toEqual([]);
    expect(overview.matches).toHaveLength(2);
  });

  it('account/mmr indisponíveis → cardSrc null e rank null, perfil de pé', async () => {
    const client = makeClient(
      [win, loss],
      mmrHistory,
      new Error('account unavailable'),
      new Error('mmr unavailable'),
    );

    const overview = await buildPlayerOverview({
      region: 'br',
      name: 'Player',
      tag: 'BR1',
      source: createHenrikDevSource(client as never),
      snapshotStore: null,
    });

    expect(overview.player.cardSrc).toBeNull();
    expect(overview.rank).toBeNull();
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
        source: createHenrikDevSource(client as never),
        snapshotStore: null,
      }),
    ).rejects.toBeInstanceOf(PlayerNoMatchesError);
  });
});

describe('buildPlayerOverview — amostra por ATO (Breakdown)', () => {
  const ACT_OPTS = { cap: 30, fallback: 15 };

  /** N partidas competitivas válidas (ids/timestamps únicos, todas no ato s1). */
  const makeRun = (count: number): HenrikDevMatchV4[] =>
    Array.from({ length: count }, (_, index) =>
      makeMatch({
        id: `m-${String(index).padStart(2, '0')}`,
        map: 'Ascent',
        agent: 'Jett',
        startedAt: new Date(1_800_000_000_000 - index * 60_000).toISOString(),
        result: index % 2 === 0 ? 'win' : 'loss',
        score: 4000,
      }),
    );

  const seasonal = (games: number, id = 's1') => ({
    seasonal: [{ season: { id, short: 'V25A3' }, games }],
  });

  it('pagina em blocos de 10 até a contagem de partidas do ato (mmr v3)', async () => {
    const client = makePagedClient(makeRun(25), seasonal(25));

    const overview = await buildPlayerOverview({
      region: 'BR',
      name: 'Player',
      tag: 'BR1',
      actSample: ACT_OPTS,
      source: createHenrikDevSource(client as never),
      snapshotStore: null,
    });

    expect(overview.matches).toHaveLength(25);
    expect(client.fetchPlayerMatches).toHaveBeenCalledTimes(3);
    expect(client.fetchPlayerMatches).toHaveBeenNthCalledWith(1, {
      affinity: 'br',
      platform: 'pc',
      name: 'Player',
      tag: 'BR1',
      mode: 'competitive',
      size: 10,
      start: 0,
    });
    expect(client.fetchPlayerMatches).toHaveBeenNthCalledWith(2, {
      affinity: 'br',
      platform: 'pc',
      name: 'Player',
      tag: 'BR1',
      mode: 'competitive',
      size: 10,
      start: 10,
    });
    expect(client.fetchPlayerMatches).toHaveBeenNthCalledWith(3, {
      affinity: 'br',
      platform: 'pc',
      name: 'Player',
      tag: 'BR1',
      mode: 'competitive',
      size: 5,
      start: 20,
    });
    expect(client.fetchMmrV3).toHaveBeenCalledWith({
      affinity: 'br',
      platform: 'pc',
      name: 'Player',
      tag: 'BR1',
    });
  });

  it('busca as páginas restantes em PARALELO e o mmr v3 junto da 1ª página', async () => {
    const all = makeRun(30);
    const startsCalled: number[] = [];
    const gates = new Map<number, () => void>();
    const client = {
      fetchPlayerMatches: vi.fn(
        async (params: { readonly start?: number; readonly size?: number }) => {
          const start = params.start ?? 0;
          startsCalled.push(start);
          if (start > 0) {
            await new Promise<void>((resolve) => gates.set(start, resolve));
          }
          return all.slice(start, start + (params.size ?? 10));
        },
      ),
      fetchMatchById: vi.fn(),
      fetchMmrHistory: vi.fn(async () => []),
      fetchAccount: vi.fn(async () => null),
      fetchMmr: vi.fn(async () => {
        throw new Error('fetchMmr não usado neste fluxo');
      }),
      fetchMmrV3: vi.fn(async () => seasonal(25)),
    };

    const pending = buildPlayerOverview({
      region: 'br',
      name: 'Player',
      tag: 'BR1',
      actSample: ACT_OPTS,
      source: createHenrikDevSource(client as never),
      snapshotStore: null,
    });

    // Deixa a 1ª página resolver; as páginas 2 e 3 já devem ter sido disparadas
    // em conjunto (estão bloqueadas nos gates até liberarmos).
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(client.fetchMmrV3).toHaveBeenCalledTimes(1);
    expect(startsCalled).toEqual([0, 10, 20]);

    gates.get(10)?.();
    gates.get(20)?.();
    const overview = await pending;
    expect(overview.matches.map((m) => m.matchId)).toHaveLength(25);
  });

  it('aplica o teto de 30 mesmo com mais partidas no ato', async () => {
    const client = makePagedClient(makeRun(40), seasonal(40));

    const overview = await buildPlayerOverview({
      region: 'br',
      name: 'Player',
      tag: 'BR1',
      actSample: ACT_OPTS,
      source: createHenrikDevSource(client as never),
      snapshotStore: null,
    });

    expect(overview.matches).toHaveLength(30);
    expect(client.fetchPlayerMatches).toHaveBeenCalledTimes(3);
    expect(client.fetchPlayerMatches).toHaveBeenNthCalledWith(3, {
      affinity: 'br',
      platform: 'pc',
      name: 'Player',
      tag: 'BR1',
      mode: 'competitive',
      size: 10,
      start: 20,
    });
  });

  it('ato com poucas partidas: só a 1ª página, cortada para a contagem', async () => {
    const client = makePagedClient(makeRun(20), seasonal(6));

    const overview = await buildPlayerOverview({
      region: 'br',
      name: 'Player',
      tag: 'BR1',
      actSample: ACT_OPTS,
      source: createHenrikDevSource(client as never),
      snapshotStore: null,
    });

    expect(overview.matches).toHaveLength(6);
    expect(client.fetchPlayerMatches).toHaveBeenCalledTimes(1);
    expect(client.fetchPlayerMatches).toHaveBeenCalledWith({
      affinity: 'br',
      platform: 'pc',
      name: 'Player',
      tag: 'BR1',
      mode: 'competitive',
      size: 10,
      start: 0,
    });
  });

  it('mmr v3 indisponível → fallback de 15 partidas recentes', async () => {
    const client = makePagedClient(makeRun(20), new Error('mmr v3 off'));

    const overview = await buildPlayerOverview({
      region: 'br',
      name: 'Player',
      tag: 'BR1',
      actSample: ACT_OPTS,
      source: createHenrikDevSource(client as never),
      snapshotStore: null,
    });

    expect(overview.matches).toHaveLength(15);
    expect(client.fetchPlayerMatches).toHaveBeenCalledTimes(2);
    expect(client.fetchPlayerMatches).toHaveBeenNthCalledWith(2, {
      affinity: 'br',
      platform: 'pc',
      name: 'Player',
      tag: 'BR1',
      mode: 'competitive',
      size: 5,
      start: 10,
    });
  });

  it('ato mais recente sem jogos → fallback de 15', async () => {
    const client = makePagedClient(makeRun(20), seasonal(0));

    const overview = await buildPlayerOverview({
      region: 'br',
      name: 'Player',
      tag: 'BR1',
      actSample: ACT_OPTS,
      source: createHenrikDevSource(client as never),
      snapshotStore: null,
    });

    expect(overview.matches).toHaveLength(15);
  });

  it('mmr v3 sem "seasonal" e ato sem entrada casada → fallback de 15', async () => {
    const noSeasonal = makePagedClient(makeRun(20), {});
    const otherAct = makePagedClient(makeRun(20), seasonal(40, 'sX'));

    for (const client of [noSeasonal, otherAct]) {
      const overview = await buildPlayerOverview({
        region: 'br',
        name: 'Player',
        tag: 'BR1',
        actSample: ACT_OPTS,
        source: createHenrikDevSource(client as never),
        snapshotStore: null,
      });
      expect(overview.matches).toHaveLength(15);
    }
  });

  it('sem partidas no ato → PlayerNoMatchesError (mmr v3 pode ir em paralelo)', async () => {
    const client = makePagedClient([], seasonal(25));

    await expect(
      buildPlayerOverview({
        region: 'br',
        name: 'Player',
        tag: 'BR1',
        actSample: ACT_OPTS,
        source: createHenrikDevSource(client as never),
        snapshotStore: null,
      }),
    ).rejects.toBeInstanceOf(PlayerNoMatchesError);
    // O MMR v3 dispara em PARALELO com a 1ª página (latência), então pode ser
    // consultado mesmo no caso vazio — troca deliberada de 1 chamada upstream
    // rara (jogador sem partidas competitivas) por latência no caminho quente.
    expect(client.fetchMmrV3).toHaveBeenCalledTimes(1);
  });

  it('mantém o snapshot de combate na janela padrão (5) mesmo com amostra maior', async () => {
    const client = makePagedClient(makeRun(25), seasonal(25));
    const store = makeStore();

    const overview = await buildPlayerOverview({
      region: 'br',
      name: 'Player',
      tag: 'BR1',
      actSample: ACT_OPTS,
      source: createHenrikDevSource(client as never),
      snapshotStore: store as CombatSnapshotStore,
    });

    expect(overview.matches).toHaveLength(25);
    expect(store.insertSnapshot).toHaveBeenCalledTimes(1);
    expect(store.insertSnapshot).toHaveBeenCalledWith(expect.objectContaining({ sampleSize: 5 }));
  });
});

describe('buildPlayerOverview — vetores táticos (Riot/mock)', () => {
  it('mock: calcula tactical e um heatmap 16×16 por mapa com minimapa, sem expor details', async () => {
    const { createMockSource } = await import('@/services/tracker/sources/mock-source');
    const overview = await buildPlayerOverview({
      region: 'br',
      name: 'valcoachdemo',
      tag: 'demo',
      size: 10,
      source: createMockSource(),
      snapshotStore: null,
    });

    expect(overview).not.toHaveProperty('details');
    expect(overview.tactical).not.toBeNull();
    expect(overview.tactical!.discipline.rounds).toBeGreaterThan(0);
    expect(overview.tactical!.topDeathZones.length).toBeGreaterThan(0);
    expect(overview.deathHeatmaps.length).toBeGreaterThan(0);
    const ids = overview.deathHeatmaps.map((h) => h.mapId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const heatmap of overview.deathHeatmaps) {
      expect(heatmap.mapName).not.toBe('');
      expect(heatmap.grid).toHaveLength(16);
      expect(heatmap.grid.every((r) => r.length === 16)).toBe(true);
    }
    const deaths = overview.deathHeatmaps.flatMap((h) => h.grid.flat()).reduce((a, b) => a + b, 0);
    expect(deaths).toBeGreaterThan(0);
  });

  it('henrikdev (details vazio): tactical null e sem heatmaps', async () => {
    const client = makeClient([win, loss]);
    const overview = await buildPlayerOverview({
      region: 'br',
      name: 'Player',
      tag: 'BR1',
      source: createHenrikDevSource(client as never),
      snapshotStore: null,
    });
    expect(overview.tactical).toBeNull();
    expect(overview.deathHeatmaps).toEqual([]);
  });
});
