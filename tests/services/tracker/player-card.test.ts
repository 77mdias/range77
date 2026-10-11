import { describe, expect, it, vi } from 'vitest';
import type { HenrikDevClient } from '@/services/henrikdev/client';
import { getPlayerCard } from '@/services/tracker/player-card';

/**
 * SUITE TDD — card in-game do jogador (v1 account) para o destaque de MVP.
 * Best-effort: qualquer falha vira `null` (a view cai no fallback).
 */

function clientWith(account: unknown): HenrikDevClient {
  return { fetchAccount: vi.fn(async () => account) } as unknown as HenrikDevClient;
}

describe('getPlayerCard', () => {
  it('prefere a imagem large do card', async () => {
    const card = await getPlayerCard({
      name: 'TenZ',
      tag: 'BR1',
      client: clientWith({ card: { large: 'large.png', small: 'small.png', wide: 'wide.png' } }),
    });
    expect(card).toBe('large.png');
  });

  it('cai para small/wide quando large falta', async () => {
    expect(
      await getPlayerCard({ name: 'a', tag: 'b', client: clientWith({ card: { small: 's.png' } }) }),
    ).toBe('s.png');
    expect(
      await getPlayerCard({ name: 'a', tag: 'b', client: clientWith({ card: { wide: 'w.png' } }) }),
    ).toBe('w.png');
  });

  it('sem card no payload → null', async () => {
    expect(await getPlayerCard({ name: 'a', tag: 'b', client: clientWith({}) })).toBeNull();
  });

  it('falha no upstream → null (não lança)', async () => {
    const failing = {
      fetchAccount: vi.fn(async () => {
        throw new Error('boom');
      }),
    } as unknown as HenrikDevClient;
    expect(await getPlayerCard({ name: 'a', tag: 'b', client: failing })).toBeNull();
  });
});
