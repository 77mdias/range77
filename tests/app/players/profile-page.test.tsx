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

import { HenrikDevApiError } from '@/services/henrikdev/client';
import PlayerPage, { PlayerProfileData } from '@/app/players/[region]/[name]/[tag]/page';

const render = async (region: string, name: string, tag: string) => {
  const element = await PlayerPage({
    params: Promise.resolve({ region, name, tag }),
  });
  return renderToStaticMarkup(element);
};

const renderData = async () =>
  renderToStaticMarkup(await PlayerProfileData({ region: 'br', name: 'Player', tag: 'BR1' }));

beforeEach(() => {
  mocks.getCachedPlayerOverview.mockReset();
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
