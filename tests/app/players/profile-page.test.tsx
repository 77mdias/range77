import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * SUITE TDD — página do perfil: validação de params (branch síncrona) e o
 * branch de erro de dados (429 → tela de espera; 404 → ErrorState). Os
 * serviços são mockados (sem rede/DB).
 */

const mocks = vi.hoisted(() => ({ getCachedPlayerOverview: vi.fn() }));

vi.mock('@/lib/cache/tracker', () => ({
  getCachedPlayerOverview: mocks.getCachedPlayerOverview,
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
import PlayerPage, { PlayerProfileData } from '@/app/(app)/players/[region]/[name]/[tag]/page';

const render = async (region: string, name: string, tag: string) => {
  const element = await PlayerPage({
    params: Promise.resolve({ region, name, tag }),
  });
  return renderToStaticMarkup(element);
};

const renderData = async () =>
  renderToStaticMarkup(await PlayerProfileData({ region: 'br', name: 'ValCoachDemo', tag: 'DEMO' }));

beforeEach(() => {
  mocks.getCachedPlayerOverview.mockReset();
  access.getByRiotId.mockReset().mockResolvedValue(null);
  access.viewer.mockReset().mockResolvedValue(null);
  access.getTrackerSource.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PlayerPage', () => {
  it('região inválida → ErrorState INVALID_PARAMS', async () => {
    const html = await render('mars', 'Player', 'BR1');
    expect(html).toContain('INVALID_PARAMS');
    expect(html).toContain('Região inválida');
  });

  it('nome vazio → ErrorState INVALID_PARAMS', async () => {
    expect(await render('br', '', 'BR1')).toContain('INVALID_PARAMS');
  });

  it('tag inválida → ErrorState INVALID_PARAMS', async () => {
    expect(await render('br', 'Player', 'a!b')).toContain('INVALID_PARAMS');
  });
});

describe('PlayerProfileData', () => {
  it('429 da HenrikDev → tela de espera com o reset do header', async () => {
    mocks.getCachedPlayerOverview.mockRejectedValueOnce(
      new HenrikDevApiError(429, 'rate limited', undefined, 12),
    );

    const html = await renderData();

    expect(html).toContain('data-state="rate-limit"');
    expect(html).toContain('12s');
  });

  it('404 da HenrikDev → ErrorState PLAYER_NOT_FOUND', async () => {
    mocks.getCachedPlayerOverview.mockRejectedValueOnce(new HenrikDevApiError(404, 'not found'));

    const html = await renderData();

    expect(html).toContain('PLAYER_NOT_FOUND');
    expect(html).not.toContain('data-state="rate-limit"');
  });
});

describe('PlayerProfileData — consentimento', () => {
  it('perfil privado → estado neutro, sem chamar a fonte', async () => {
    access.getByRiotId.mockResolvedValueOnce(PRIVATE_LINK);
    const html = renderToStaticMarkup(await PlayerProfileData({ region: 'br', name: 'Fulano', tag: 'BR1' }));

    expect(html).toContain(PRIVATE_TEXT);
    expect(mocks.getCachedPlayerOverview).not.toHaveBeenCalled();
    expect(access.getTrackerSource).not.toHaveBeenCalled();
  });

  it('conta inexistente → o MESMO estado neutro', async () => {
    const html = renderToStaticMarkup(await PlayerProfileData({ region: 'br', name: 'Fulano', tag: 'BR1' }));
    expect(html).toContain(PRIVATE_TEXT);
    expect(mocks.getCachedPlayerOverview).not.toHaveBeenCalled();
  });

  it('dono do perfil privado → renderiza os dados', async () => {
    access.viewer.mockResolvedValueOnce('u-owner');
    access.getByRiotId.mockResolvedValueOnce(PRIVATE_LINK);
    mocks.getCachedPlayerOverview.mockRejectedValueOnce(new HenrikDevApiError(404, 'not found'));

    const html = renderToStaticMarkup(await PlayerProfileData({ region: 'br', name: 'Fulano', tag: 'BR1' }));

    expect(html).not.toContain(PRIVATE_TEXT);
    expect(mocks.getCachedPlayerOverview).toHaveBeenCalled();
  });

  it('conta demo → renderiza para o visitante anônimo', async () => {
    mocks.getCachedPlayerOverview.mockRejectedValueOnce(new HenrikDevApiError(404, 'not found'));
    const html = renderToStaticMarkup(
      await PlayerProfileData({ region: 'br', name: 'ValCoachDemo', tag: 'DEMO' }),
    );
    expect(html).not.toContain(PRIVATE_TEXT);
    expect(mocks.getCachedPlayerOverview).toHaveBeenCalledWith('br', 'ValCoachDemo', 'DEMO', 5);
  });
});
