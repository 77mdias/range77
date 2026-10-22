import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HenrikDevApiError } from '@/services/henrikdev/client';

/**
 * SUITE TDD — rota GET /api/players/[region]/[name]/[tag]/overview.
 */

vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));

vi.mock('@/services/tracker/player-overview', () => ({ buildPlayerOverview: vi.fn() }));

vi.mock('@/services/coaching/player-combat', () => {
  class PlayerNoMatchesError extends Error {
    constructor(message = 'sem partidas') {
      super(message);
      this.name = 'PlayerNoMatchesError';
    }
  }
  return { PlayerNoMatchesError };
});

// Política de consentimento: por padrão o perfil é público (vínculo RSO com
// opt-in) e o visitante é anônimo; cada teste de acesso sobrescreve.
const access = vi.hoisted(() => ({ getByRiotId: vi.fn(), viewer: vi.fn() }));
vi.mock('@/lib/db/user-riot-store', () => ({
  getUserRiotStore: () => ({ getByRiotId: access.getByRiotId }),
}));
vi.mock('@/lib/session', () => ({ getViewerUserId: access.viewer }));
const PUBLIC_LINK = { userId: 'u-owner', linkedVia: 'rso_mock', profilePublic: true };
const PRIVATE_BODY = {
  error: { code: 'PROFILE_NOT_PUBLIC', message: 'Este jogador não tornou o perfil público.' },
};

import { GET } from '@/app/api/players/[region]/[name]/[tag]/overview/route';
import { PlayerNoMatchesError } from '@/services/coaching/player-combat';
import { buildPlayerOverview } from '@/services/tracker/player-overview';

const overviewMock = {
  player: { region: 'br', name: 'Player', tag: 'BR1', platform: 'pc' },
  matches: [{ matchId: 'm-1' }],
  agents: [],
  maps: [],
  streaks: { current: { result: 'win', length: 1 }, longestWin: 1, longestLoss: 0 },
  trend: { metric: 'acs', direction: 'flat', first: 200, last: 200, delta: 0, perMatch: [200] },
  combat: { player: { region: 'br', name: 'Player', tag: 'BR1', platform: 'pc' } },
};

const request = (url = 'http://localhost/api/players/br/Player/BR1/overview'): Request =>
  new Request(url);

const context = (
  region = 'br',
  name = 'Player',
  tag = 'BR1',
): { params: Promise<{ region: string; name: string; tag: string }> } => ({
  params: Promise.resolve({ region, name, tag }),
});

beforeEach(() => {
  vi.mocked(buildPlayerOverview).mockReset();
  access.getByRiotId.mockReset().mockResolvedValue(PUBLIC_LINK);
  access.viewer.mockReset().mockResolvedValue(null);
});

describe('GET /api/players/[region]/[name]/[tag]/overview', () => {
  it('retorna 200 com o envelope e normaliza a região', async () => {
    vi.mocked(buildPlayerOverview).mockResolvedValueOnce(overviewMock as never);

    const response = await GET(request(), context('BR', 'Player One', 'BR1'));
    const body = (await response.json()) as typeof overviewMock;

    expect(response.status).toBe(200);
    expect(body.player.region).toBe('br');
    expect(vi.mocked(buildPlayerOverview)).toHaveBeenCalledWith(
      expect.objectContaining({
        region: 'br',
        name: 'Player One',
        tag: 'BR1',
        size: 5,
      }),
    );
  });

  it('respeita ?size= válido', async () => {
    vi.mocked(buildPlayerOverview).mockResolvedValueOnce(overviewMock as never);

    await GET(request('http://localhost/api/players/br/Player/BR1/overview?size=8'), context());

    expect(vi.mocked(buildPlayerOverview)).toHaveBeenCalledWith(
      expect.objectContaining({ size: 8 }),
    );
  });

  it('rejeita região/nome/tag/size inválidos (400)', async () => {
    expect((await GET(request(), context('mars', 'Player', 'BR1'))).status).toBe(400);
    expect((await GET(request(), context('br', '', 'BR1'))).status).toBe(400);
    expect((await GET(request(), context('br', 'Player', 'a!b'))).status).toBe(400);
    expect(
      (await GET(request('http://localhost/api/players/br/Player/BR1/overview?size=99'), context()))
        .status,
    ).toBe(400);
  });

  it('mapeia jogador sem partidas → 404 NO_VALID_MATCHES', async () => {
    vi.mocked(buildPlayerOverview).mockRejectedValueOnce(new PlayerNoMatchesError());

    const response = await GET(request(), context());
    const body = (await response.json()) as { error: { code: string; hint?: string } };

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('NO_VALID_MATCHES');
  });

  it('reconhece o PlayerNoMatchesError SERIALIZADO pela fronteira `use cache`', async () => {
    // Depois do cache só `name`/`message` sobrevivem: um `Error` comum com o
    // mesmo name deve gerar o mesmo mapeamento (regressão do cache boundary).
    vi.mocked(buildPlayerOverview).mockRejectedValueOnce(
      Object.assign(new Error('sem partidas válidas'), { name: 'PlayerNoMatchesError' }),
    );

    const response = await GET(request(), context());
    const body = (await response.json()) as { error: { code: string; message: string } };

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('NO_VALID_MATCHES');
    expect(body.error.message).toMatch(/sem partidas válidas/);
  });

  it('mapeia 404 upstream → PLAYER_NOT_FOUND com hint de Riot ID', async () => {
    vi.mocked(buildPlayerOverview).mockRejectedValueOnce(
      new HenrikDevApiError(404, 'Riot ID not found', 10_001),
    );

    const response = await GET(request(), context());
    const body = (await response.json()) as { error: { code: string; hint?: string } };

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('PLAYER_NOT_FOUND');
    expect(body.error.hint).toMatch(/Riot ID/i);
  });

  it('mapeia erros upstream no mapa compartilhado', async () => {
    vi.mocked(buildPlayerOverview).mockRejectedValueOnce(
      new HenrikDevApiError(429, 'rate', 10_003),
    );
    expect((await GET(request(), context())).status).toBe(503);

    vi.mocked(buildPlayerOverview).mockRejectedValueOnce(
      new HenrikDevApiError(401, 'unauthorized', 10_002),
    );
    const unauthorized = await GET(request(), context());
    expect(unauthorized.status).toBe(500);
    expect(
      ((await unauthorized.json()) as { error: { hint?: string } }).error.hint,
    ).toMatch(/HENRIKDEV_API_KEY/);

    vi.mocked(buildPlayerOverview).mockRejectedValueOnce(
      new HenrikDevApiError(0, 'rede', 'NETWORK_ERROR'),
    );
    expect((await GET(request(), context())).status).toBe(502);
  });

  it('erro desconhecido → 500 INTERNAL_ERROR sem vazar stack', async () => {
    vi.mocked(buildPlayerOverview).mockRejectedValueOnce(new Error('boom interno'));

    const response = await GET(request(), context());
    const body = (await response.json()) as { error: { code: string; message: string } };

    expect(response.status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).not.toMatch(/boom/);
  });

  it('perfil privado ou inexistente → mesmo 404 PROFILE_NOT_PUBLIC, sem chamar a fonte', async () => {
    access.getByRiotId.mockResolvedValueOnce(null);
    const missing = await GET(new Request('http://localhost/x'), context());
    access.getByRiotId.mockResolvedValueOnce({ ...PUBLIC_LINK, profilePublic: false });
    const optedOut = await GET(new Request('http://localhost/x'), context());

    expect(missing.status).toBe(404);
    expect(optedOut.status).toBe(404);
    expect(await missing.json()).toEqual(PRIVATE_BODY);
    expect(await optedOut.json()).toEqual(PRIVATE_BODY);
    expect(vi.mocked(buildPlayerOverview)).not.toHaveBeenCalled();
  });

  it('dono do perfil privado e conta demo → passam pela política', async () => {
    access.viewer.mockResolvedValueOnce('u-owner');
    access.getByRiotId.mockResolvedValueOnce({ ...PUBLIC_LINK, profilePublic: false });
    const owner = await GET(new Request('http://localhost/x'), context());
    const demo = await GET(new Request('http://localhost/x'), context('br', 'ValCoachDemo', 'DEMO'));

    expect(owner.status).not.toBe(404);
    expect(demo.status).not.toBe(404);
    expect(vi.mocked(buildPlayerOverview)).toHaveBeenCalledTimes(2);
  });
});
