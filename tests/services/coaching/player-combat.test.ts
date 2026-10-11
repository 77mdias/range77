import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HenrikDevMatchV4 } from '@/contracts/henrikdev';
import { EnvironmentValidationError } from '@/config/env';
import type { CombatSnapshotRecord, CombatSnapshotStore } from '@/lib/db/combat-snapshot-store';
import { HenrikDevApiError } from '@/services/henrikdev/client';
import {
  buildPlayerCombatInsight,
  PlayerNoMatchesError,
} from '@/services/coaching/player-combat';

/**
 * SUITE TDD — orquestração de coaching (HenrikDev → normalização → analytics
 * → envelope de 3 camadas). O client é injetado (DIP): sem rede nos testes.
 */

const rawMatch: HenrikDevMatchV4 = {
  metadata: { match_id: 'm-1', queue: { id: 'competitive' }, is_completed: true },
  players: [
    {
      puuid: 'puuid-player',
      name: 'Player',
      tag: 'BR1',
      stats: {
        score: 4000,
        kills: 20,
        deaths: 10,
        assists: 5,
        headshots: 10,
        bodyshots: 20,
        legshots: 10,
      },
    },
  ],
  teams: [{ team_id: 'Red', rounds: { won: 13, lost: 9 }, won: true }],
  kills: [],
};

const makeFakeClient = (result: readonly HenrikDevMatchV4[] | Error) => ({
  fetchPlayerMatches: vi.fn(async () => {
    if (result instanceof Error) {
      throw result;
    }
    return result;
  }),
  fetchMatchById: vi.fn(async () => {
    throw new Error('fetchMatchById não usado neste fluxo');
  }),
  fetchMmrHistory: vi.fn(async () => []),
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('buildPlayerCombatInsight', () => {
  it('monta o envelope completo com identidade e avaliação do jogador', async () => {
    const client = makeFakeClient([rawMatch]);

    const insight = await buildPlayerCombatInsight({
      region: 'br',
      name: 'Player',
      tag: 'BR1',
      client,
      snapshotStore: null,
    });

    expect(client.fetchPlayerMatches).toHaveBeenCalledWith({
      affinity: 'br',
      platform: 'pc',
      name: 'Player',
      tag: 'BR1',
      mode: 'competitive',
      size: 5,
    });

    expect(insight.player).toEqual({ region: 'br', name: 'Player', tag: 'BR1', platform: 'pc' });
    expect(insight.evaluation).toEqual({ aimClass: 'Excelente', impactClass: 'Equilibrado' });
    expect(insight.raw_metrics).toMatchObject({ kdr: 2, acs: 182, matches: 1, rounds: 22 });
    expect(insight.contextual_rating).toMatchObject({ kdr: 'Excelente' });
    expect(insight.coaching_hooks.length).toBeGreaterThan(0);
  });

  it('lança PlayerNoMatchesError quando nenhuma partida sobrevive à normalização', async () => {
    const unrated: HenrikDevMatchV4 = {
      ...rawMatch,
      metadata: { ...rawMatch.metadata, queue: { id: 'unrated' } },
    };

    const attempt = buildPlayerCombatInsight({
      region: 'br',
      name: 'Player',
      tag: 'BR1',
      client: makeFakeClient([unrated]),
      snapshotStore: null,
    });

    await expect(attempt).rejects.toBeInstanceOf(PlayerNoMatchesError);
    await expect(attempt).rejects.toThrowError(/Nenhuma partida competitiva/);
  });

  it('propaga HenrikDevApiError sem transformar (a rota faz o mapping HTTP)', async () => {
    const upstream = new HenrikDevApiError(429, 'Rate limit exceeded', 10_003);

    await expect(
      buildPlayerCombatInsight({
        region: 'br',
        name: 'Player',
        tag: 'BR1',
        client: makeFakeClient(upstream),
        snapshotStore: null,
      }),
    ).rejects.toBe(upstream);
  });

  it('sem client injetado e sem HENRIKDEV_API_KEY → falha de configuração explicativa', async () => {
    vi.stubEnv('HENRIKDEV_API_KEY', ''); // vazio conta como ausente

    await expect(
      buildPlayerCombatInsight({ region: 'br', name: 'Player', tag: 'BR1' }),
    ).rejects.toBeInstanceOf(EnvironmentValidationError);
  });

  it('sem client injetado com key válida: cria client real e completa o fluxo', async () => {
    vi.stubEnv('HENRIKDEV_API_KEY', 'HDEV-flow');
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ status: 200, data: [rawMatch] }), {
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const insight = await buildPlayerCombatInsight({
      region: 'br',
      name: 'Player',
      tag: 'BR1',
      snapshotStore: null,
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(insight.player.region).toBe('br');
    expect(insight.raw_metrics.kdr).toBe(2);
  });
});

describe('buildPlayerCombatInsight — persistência de snapshots', () => {
  const makeCapturingStore = (): { store: CombatSnapshotStore; inserted: CombatSnapshotRecord[] } => {
    const inserted: CombatSnapshotRecord[] = [];
    return {
      inserted,
      store: {
        insertSnapshot: async (record) => {
          inserted.push(record);
        },
        getRecentSnapshots: async () => [],
      },
    };
  };

  it('persiste snapshot write-through com chaves normalizadas para lookup', async () => {
    const { store, inserted } = makeCapturingStore();

    const insight = await buildPlayerCombatInsight({
      region: 'BR',
      name: 'Player',
      tag: 'BR1',
      client: makeFakeClient([rawMatch]),
      snapshotStore: store,
    });

    expect(insight.player.region).toBe('br');
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      region: 'br',
      name: 'Player',
      tag: 'BR1',
      nameKey: 'player',
      tagKey: 'br1',
      sampleSize: 5,
      kdr: 2,
      acs: 182,
      matches: 1,
      rounds: 22,
      aimClass: 'Excelente',
      impactClass: 'Equilibrado',
    });
    expect(Array.isArray(inserted[0]?.coachingHooks)).toBe(true);
    expect(typeof inserted[0]?.contextualRating).toBe('object');
  });

  it('falha de persistência é best-effort: o envelope continua íntegro', async () => {
    const failingStore: CombatSnapshotStore = {
      insertSnapshot: async () => {
        throw new Error('neon fora do ar');
      },
      getRecentSnapshots: async () => [],
    };

    const insight = await buildPlayerCombatInsight({
      region: 'br',
      name: 'Player',
      tag: 'BR1',
      client: makeFakeClient([rawMatch]),
      snapshotStore: failingStore,
    });

    expect(insight.raw_metrics.kdr).toBe(2);
    expect(insight.coaching_hooks.length).toBeGreaterThan(0);
  });

  it('snapshotStore: null desliga a persistência explicitamente (sem DB no contexto)', async () => {
    const insight = await buildPlayerCombatInsight({
      region: 'br',
      name: 'Player',
      tag: 'BR1',
      client: makeFakeClient([rawMatch]),
      snapshotStore: null,
    });

    expect(insight.raw_metrics.kdr).toBe(2);
  });

  it('sem store injetado e sem DATABASE_URL → erro de configuração propagado (fail fast)', async () => {
    vi.stubEnv('DATABASE_URL', '');

    await expect(
      buildPlayerCombatInsight({
        region: 'br',
        name: 'Player',
        tag: 'BR1',
        client: makeFakeClient([rawMatch]),
      }),
    ).rejects.toBeInstanceOf(EnvironmentValidationError);
  });

  it('exige DATABASE_URL ANTES de gastar tempo com a HenrikDev (fail fast de config)', async () => {
    vi.stubEnv('DATABASE_URL', '');
    const client = makeFakeClient([rawMatch]);

    await expect(
      buildPlayerCombatInsight({ region: 'br', name: 'Player', tag: 'BR1', client }),
    ).rejects.toBeInstanceOf(EnvironmentValidationError);

    expect(client.fetchPlayerMatches).not.toHaveBeenCalled();
  });
});
