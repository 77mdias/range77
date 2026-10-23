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

// Política de consentimento (sessão + vínculo) e espião da fonte: o perfil
// privado não pode tocar o tracker.
const access = vi.hoisted(() => ({
  getByRiotId: vi.fn(),
  viewer: vi.fn(),
  getTrackerSource: vi.fn(),
}));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('@/lib/session', () => ({ getViewerUserId: access.viewer, getSession: async () => null }));
vi.mock('@/lib/db/user-riot-store', () => ({
  getUserRiotStore: () => ({ getByRiotId: access.getByRiotId }),
}));
vi.mock('@/services/tracker/sources', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/tracker/sources')>()),
  getTrackerSource: access.getTrackerSource,
}));
const PRIVATE_LINK = { userId: 'u-owner', linkedVia: 'rso_mock', profilePublic: false };
const PRIVATE_TEXT = 'Este jogador não tornou o perfil público.';

import { HenrikDevApiError } from '@/services/henrikdev/client';
import { BreakdownData } from '@/app/(app)/players/[region]/[name]/[tag]/breakdown/page';

const renderData = async () =>
  renderToStaticMarkup(await BreakdownData({ region: 'br', name: 'ValCoachDemo', tag: 'DEMO' }));

beforeEach(() => {
  mocks.getCachedBreakdownOverview.mockReset();
  access.getByRiotId.mockReset().mockResolvedValue(null);
  access.viewer.mockReset().mockResolvedValue(null);
  access.getTrackerSource.mockReset();
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

describe('BreakdownData — consentimento', () => {
  it('perfil privado → estado neutro, sem chamar a fonte', async () => {
    access.getByRiotId.mockResolvedValueOnce(PRIVATE_LINK);
    const html = renderToStaticMarkup(await BreakdownData({ region: 'br', name: 'Fulano', tag: 'BR1' }));

    expect(html).toContain(PRIVATE_TEXT);
    expect(mocks.getCachedBreakdownOverview).not.toHaveBeenCalled();
    expect(access.getTrackerSource).not.toHaveBeenCalled();
  });

  it('conta inexistente → o MESMO estado neutro', async () => {
    const html = renderToStaticMarkup(await BreakdownData({ region: 'br', name: 'Fulano', tag: 'BR1' }));
    expect(html).toContain(PRIVATE_TEXT);
    expect(mocks.getCachedBreakdownOverview).not.toHaveBeenCalled();
  });

  it('dono do perfil privado → renderiza os dados', async () => {
    access.viewer.mockResolvedValueOnce('u-owner');
    access.getByRiotId.mockResolvedValueOnce(PRIVATE_LINK);
    mocks.getCachedBreakdownOverview.mockRejectedValueOnce(new HenrikDevApiError(404, 'not found'));

    const html = renderToStaticMarkup(await BreakdownData({ region: 'br', name: 'Fulano', tag: 'BR1' }));

    expect(html).not.toContain(PRIVATE_TEXT);
    expect(mocks.getCachedBreakdownOverview).toHaveBeenCalled();
  });

  it('conta demo → renderiza para o visitante anônimo', async () => {
    mocks.getCachedBreakdownOverview.mockRejectedValueOnce(new HenrikDevApiError(404, 'not found'));
    const html = renderToStaticMarkup(
      await BreakdownData({ region: 'br', name: 'ValCoachDemo', tag: 'DEMO' }),
    );
    expect(html).not.toContain(PRIVATE_TEXT);
    expect(mocks.getCachedBreakdownOverview).toHaveBeenCalledWith('br', 'ValCoachDemo', 'DEMO');
  });
});
