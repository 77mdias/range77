import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * SUITE TDD — página do detalhe: validação de params/região (branch síncrona)
 * e o branch de erro de dados (429 → tela de espera).
 */

const mocks = vi.hoisted(() => ({
  getCachedMatchDetail: vi.fn(),
  getCachedPlayerCard: vi.fn(),
}));

vi.mock('@/lib/cache/tracker', () => ({
  getCachedMatchDetail: mocks.getCachedMatchDetail,
  getCachedPlayerCard: mocks.getCachedPlayerCard,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), back: vi.fn() }) }));

// Política de consentimento (sessão + vínculo) e espião da fonte: foco
// privado/ausente não pode tocar o tracker.
const access = vi.hoisted(() => ({
  getByRiotId: vi.fn(),
  viewer: vi.fn(),
  getTrackerSource: vi.fn(),
}));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('@/lib/session', () => ({ getViewerUserId: access.viewer }));
vi.mock('@/lib/db/user-riot-store', () => ({
  getUserRiotStore: () => ({ getByRiotId: access.getByRiotId }),
}));
vi.mock('@/services/tracker/sources', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/tracker/sources')>()),
  getTrackerSource: access.getTrackerSource,
}));
const PRIVATE_LINK = { userId: 'u-owner', linkedVia: 'rso_mock', profilePublic: false };
const PRIVATE_TEXT = 'Este jogador não tornou o perfil público.';
const DEMO = { name: 'ValCoachDemo', tag: 'DEMO' };

import { HenrikDevApiError } from '@/services/henrikdev/client';
import MatchPage, { MatchDetailData } from '@/app/(app)/matches/[matchId]/page';

const MATCH_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

const render = async (region: string, matchId: string, player?: string) => {
  const element = await MatchPage({
    params: Promise.resolve({ matchId }),
    searchParams: Promise.resolve(player === undefined ? { region } : { region, player }),
  });
  return renderToStaticMarkup(element);
};

beforeEach(() => {
  mocks.getCachedMatchDetail.mockReset();
  mocks.getCachedPlayerCard.mockReset();
  access.getByRiotId.mockReset().mockResolvedValue(null);
  access.viewer.mockReset().mockResolvedValue(null);
  access.getTrackerSource.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('MatchPage', () => {
  it('região inválida → ErrorState INVALID_PARAMS', async () => {
    const html = await render('mars', MATCH_ID);
    expect(html).toContain('INVALID_PARAMS');
    expect(html).toContain('Região inválida');
  });

  it('matchId inválido → ErrorState INVALID_PARAMS', async () => {
    expect(await render('br', 'not-a-uuid')).toContain('INVALID_PARAMS');
  });

  it('botão Voltar: fallback para o perfil da perspectiva (ou home sem ?player=)', async () => {
    mocks.getCachedMatchDetail.mockReturnValue(new Promise(() => undefined));
    const withPlayer = await render('br', MATCH_ID, 'ValCoachDemo#DEMO');
    expect(withPlayer).toContain('data-match-back');
    expect(withPlayer).toContain('href="/players/br/ValCoachDemo/DEMO"');

    const neutral = await render('br', MATCH_ID);
    expect(neutral).toMatch(/href="\/"[^>]*data-match-back|data-match-back[^>]*href="\/"/);
  });
});

describe('MatchDetailData', () => {
  it('429 da HenrikDev → tela de espera com o reset do header', async () => {
    mocks.getCachedMatchDetail.mockRejectedValueOnce(
      new HenrikDevApiError(429, 'rate limited', undefined, 30),
    );

    const html = renderToStaticMarkup(
      await MatchDetailData({ region: 'br', matchId: MATCH_ID, viewer: DEMO }),
    );

    expect(html).toContain('data-state="rate-limit"');
    expect(html).toContain('30s');
  });

  it('repassa o jogador em foco (?player=) à fonte', async () => {
    mocks.getCachedMatchDetail.mockRejectedValueOnce(new HenrikDevApiError(404, 'not found'));

    await MatchDetailData({ region: 'br', matchId: MATCH_ID, viewer: DEMO });

    expect(mocks.getCachedMatchDetail).toHaveBeenCalledWith('br', MATCH_ID, DEMO);
  });

  it('sem ?player= → estado neutro, sem chamar a fonte', async () => {
    const html = renderToStaticMarkup(
      await MatchDetailData({ region: 'br', matchId: MATCH_ID, viewer: null }),
    );

    expect(html).toContain(PRIVATE_TEXT);
    expect(mocks.getCachedMatchDetail).not.toHaveBeenCalled();
    expect(access.getTrackerSource).not.toHaveBeenCalled();
  });

  it('foco privado → estado neutro, sem chamar a fonte', async () => {
    access.getByRiotId.mockResolvedValueOnce(PRIVATE_LINK);
    const html = renderToStaticMarkup(
      await MatchDetailData({
        region: 'br',
        matchId: MATCH_ID,
        viewer: { name: 'Fulano', tag: 'BR1' },
      }),
    );

    expect(html).toContain(PRIVATE_TEXT);
    expect(mocks.getCachedMatchDetail).not.toHaveBeenCalled();
    expect(access.getTrackerSource).not.toHaveBeenCalled();
  });

  it('dono do foco privado → carrega a partida', async () => {
    access.viewer.mockResolvedValueOnce('u-owner');
    access.getByRiotId.mockResolvedValueOnce(PRIVATE_LINK);
    mocks.getCachedMatchDetail.mockRejectedValueOnce(new HenrikDevApiError(404, 'not found'));

    const html = renderToStaticMarkup(
      await MatchDetailData({
        region: 'br',
        matchId: MATCH_ID,
        viewer: { name: 'Fulano', tag: 'BR1' },
      }),
    );

    expect(html).not.toContain(PRIVATE_TEXT);
    expect(mocks.getCachedMatchDetail).toHaveBeenCalled();
  });

  it('partida simulada inexistente (TrackerNotFoundError) → MATCH_NOT_FOUND', async () => {
    const notFound = new Error('sem foco');
    notFound.name = 'TrackerNotFoundError';
    mocks.getCachedMatchDetail.mockRejectedValueOnce(notFound);

    const html = renderToStaticMarkup(
      await MatchDetailData({ region: 'br', matchId: MATCH_ID, viewer: DEMO }),
    );

    expect(html).toContain('MATCH_NOT_FOUND');
  });
});
