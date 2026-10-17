import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * SUITE TDD — página do breakdown: branch de erro de dados (429 → tela de
 * espera; 404 → ErrorState).
 */

const mocks = vi.hoisted(() => ({ getCachedBreakdownOverview: vi.fn() }));

vi.mock('@/lib/cache/tracker', () => ({
  getCachedBreakdownOverview: mocks.getCachedBreakdownOverview,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import { HenrikDevApiError } from '@/services/henrikdev/client';
import { BreakdownData } from '@/app/(app)/players/[region]/[name]/[tag]/breakdown/page';

const renderData = async () =>
  renderToStaticMarkup(await BreakdownData({ region: 'br', name: 'Player', tag: 'BR1' }));

beforeEach(() => {
  mocks.getCachedBreakdownOverview.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('BreakdownData', () => {
  it('429 da HenrikDev → tela de espera', async () => {
    mocks.getCachedBreakdownOverview.mockRejectedValueOnce(
      new HenrikDevApiError(429, 'rate limited', undefined, 45),
    );

    const html = await renderData();

    expect(html).toContain('data-state="rate-limit"');
    expect(html).toContain('45s');
  });

  it('404 da HenrikDev → ErrorState PLAYER_NOT_FOUND', async () => {
    mocks.getCachedBreakdownOverview.mockRejectedValueOnce(
      new HenrikDevApiError(404, 'not found'),
    );

    const html = await renderData();

    expect(html).toContain('PLAYER_NOT_FOUND');
  });
});
