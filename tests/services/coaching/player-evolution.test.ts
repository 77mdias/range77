import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CombatSnapshotRow, CombatSnapshotStore } from '@/lib/db/combat-snapshot-store';
import { EnvironmentValidationError } from '@/config/env';
import {
  buildPlayerEvolutionInsight,
  PlayerNoHistoryError,
} from '@/services/coaching/player-evolution';

/**
 * SUITE TDD — orquestração de evolução (store de snapshots → analytics pura
 * → envelope). O store é injetado (DIP); sem rede e sem DB aqui.
 */

const row = (overrides: Partial<CombatSnapshotRow> = {}): CombatSnapshotRow =>
  ({
    id: '00000000-0000-0000-0000-000000000001',
    region: 'br',
    name: 'Player',
    tag: 'BR1',
    nameKey: 'player',
    tagKey: 'br1',
    sampleSize: 5,
    kdr: 1,
    kpr: 0.7,
    acs: 180,
    hsPercentage: 20,
    kast: 70,
    firstBloods: 5,
    firstDeaths: 5,
    matches: 5,
    rounds: 110,
    aimClass: 'Regular',
    impactClass: 'Equilibrado',
    contextualRating: { kdr: 'Na Média' },
    coachingHooks: ['...'],
    createdAt: new Date('2026-10-01T12:00:00Z'),
    ...overrides,
  }) as CombatSnapshotRow;

const makeStore = (rows: CombatSnapshotRow[]): CombatSnapshotStore & { calls: Array<unknown> } => {
  const calls: Array<unknown> = [];
  return {
    calls,
    insertSnapshot: async () => {},
    getRecentSnapshots: async (player, limit) => {
      calls.push({ player, limit });
      return rows;
    },
  };
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('buildPlayerEvolutionInsight', () => {
  it('monta envelope de evolução ordenando linhas do mais antigo para o mais recente', async () => {
    const store = makeStore([
      row({ kdr: 1.3, createdAt: new Date('2026-10-08T12:00:00Z') }), // DB retorna DESC (novo primeiro)
      row({ kdr: 1.0, createdAt: new Date('2026-10-01T12:00:00Z') }),
    ]);

    const insight = await buildPlayerEvolutionInsight({
      region: 'BR',
      name: 'Player',
      tag: 'BR1',
      store,
    });

    expect(store.calls[0]).toEqual({
      player: { region: 'br', nameKey: 'player', tagKey: 'br1' },
      limit: 10,
    });

    expect(insight.player.region).toBe('br');
    expect(insight.evolution.kdr).toEqual({ baseline: 1, current: 1.3, delta: 0.3, trend: 'Melhorando' });
    expect(insight.window.to).toBe('2026-10-08T12:00:00.000Z');
    expect(insight.raw_metrics.snapshots).toBe(2);
  });

  it('respeita ?limit= e o encaminha ao store', async () => {
    const store = makeStore([row(), row({ createdAt: new Date('2026-10-08T12:00:00Z') })]);

    await buildPlayerEvolutionInsight({ region: 'br', name: 'Player', tag: 'BR1', limit: 5, store });

    expect(store.calls[0]).toMatchObject({ limit: 5 });
  });

  it('menos de 2 snapshots → PlayerNoHistoryError com remediação', async () => {
    const attempt = buildPlayerEvolutionInsight({ region: 'br', name: 'Player', tag: 'BR1', store: makeStore([row()]) });

    await expect(attempt).rejects.toBeInstanceOf(PlayerNoHistoryError);
    await expect(attempt).rejects.toThrowError(/pelo menos 2 análises/);
  });

  it('sem store injetado e sem DATABASE_URL → erro de configuração (fail fast)', async () => {
    vi.stubEnv('DATABASE_URL', '');

    await expect(
      buildPlayerEvolutionInsight({ region: 'br', name: 'Player', tag: 'BR1' }),
    ).rejects.toBeInstanceOf(EnvironmentValidationError);
  });
});
