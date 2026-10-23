import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HenrikDevApiError } from '@/services/henrikdev/client';

/**
 * SUITE TDD — rota GET /api/players/[region]/[name]/[tag].
 *
 * Next 16: `params` é Promise e DEVE ser aguardado. A camada de serviço é
 * mockada aqui (testes HTTP puros); `next/cache` é neutralizado porque o
 * cache é uma preocupação de runtime do Next, não da lógica de negócio.
 */

vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));

vi.mock('@/services/coaching/player-combat', () => {
  class PlayerNoMatchesError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'PlayerNoMatchesError';
    }
  }
  return { buildPlayerCombatInsight: vi.fn(), PlayerNoMatchesError };
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

import { GET } from '@/app/api/players/[region]/[name]/[tag]/route';
import {
  buildPlayerCombatInsight,
  PlayerNoMatchesError,
} from '@/services/coaching/player-combat';

const insightMock = {
  player: { region: 'br', name: 'Player', tag: 'BR1', platform: 'pc' },
  evaluation: { aimClass: 'Excelente', impactClass: 'Equilibrado' },
  raw_metrics: { kdr: 2, kpr: 1, acs: 200, matches: 10, rounds: 220 },
  contextual_rating: { kdr: 'Excelente' },
  coaching_hooks: ['A mira é um ponto forte (HS% 25%)...'],
};

const request = (url = 'http://localhost/api/players/br/Player/BR1'): Request => new Request(url);

const context = (
  region = 'br',
  name = 'Player',
  tag = 'BR1',
): { params: Promise<{ region: string; name: string; tag: string }> } => ({
  params: Promise.resolve({ region, name, tag }),
});

beforeEach(() => {
  vi.mocked(buildPlayerCombatInsight).mockReset();
  access.getByRiotId.mockReset().mockResolvedValue(PUBLIC_LINK);
  access.viewer.mockReset().mockResolvedValue(null);
});

describe('GET /api/players/[region]/[name]/[tag]', () => {
  it('retorna 200 com o envelope de coaching (região normalizada p/ minúscula)', async () => {
    vi.mocked(buildPlayerCombatInsight).mockResolvedValueOnce(insightMock as never);

    const response = await GET(request(), context('BR', 'Player One', 'BR1'));
    const body = (await response.json()) as typeof insightMock;

    expect(response.status).toBe(200);
    expect(body.player.region).toBe('br');
    expect(vi.mocked(buildPlayerCombatInsight)).toHaveBeenCalledWith(
      expect.objectContaining({
        region: 'br',
        name: 'Player One',
        tag: 'BR1',
        size: 5,
      }),
    );
  });

  it('respeita ?size= válido (1–10) e repassa ao serviço', async () => {
    vi.mocked(buildPlayerCombatInsight).mockResolvedValueOnce(insightMock as never);

    await GET(request('http://localhost/api/players/br/Player/BR1?size=5'), context());

    expect(vi.mocked(buildPlayerCombatInsight)).toHaveBeenCalledWith(
      expect.objectContaining({ size: 5 }),
    );
  });

  it('rejeita região fora das afinidades da HenrikDev (400 + lista válida)', async () => {
    const response = await GET(request(), context('mars', 'Player', 'BR1'));
    const body = (await response.json()) as { error: { code: string; message: string } };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('INVALID_PARAMS');
    expect(body.error.message).toMatch(/eu, na, ap, kr, latam, br/);
  });

  it('rejeita tag com caracteres inválidos (400)', async () => {
    const response = await GET(request(), context('br', 'Player', 'a!b'));

    expect(response.status).toBe(400);
    expect(((await response.json()) as { error: { code: string } }).error.code).toBe(
      'INVALID_PARAMS',
    );
  });

  it('rejeita nome vazio (400)', async () => {
    const response = await GET(request(), context('br', '', 'BR1'));

    expect(response.status).toBe(400);
  });

  it('rejeita size fora da faixa 1–10 (400)', async () => {
    const tooBig = await GET(
      request('http://localhost/api/players/br/Player/BR1?size=99'),
      context(),
    );
    const zero = await GET(request('http://localhost/api/players/br/Player/BR1?size=0'), context());

    expect(tooBig.status).toBe(400);
    expect(zero.status).toBe(400);
  });

  it('mapeia 404 upstream → 404 PLAYER_NOT_FOUND com hint de Riot ID', async () => {
    vi.mocked(buildPlayerCombatInsight).mockRejectedValueOnce(
      new HenrikDevApiError(404, 'Riot ID not found', 10_001),
    );

    const response = await GET(request(), context());
    const body = (await response.json()) as { error: { code: string; hint?: string } };

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('PLAYER_NOT_FOUND');
    expect(body.error.hint).toMatch(/Riot ID/i);
  });

  it('mapeia 429 upstream → 503 UPSTREAM_RATE_LIMITED', async () => {
    vi.mocked(buildPlayerCombatInsight).mockRejectedValueOnce(
      new HenrikDevApiError(429, 'Rate limit exceeded', 10_003),
    );

    const response = await GET(request(), context());
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(503);
    expect(body.error.code).toBe('UPSTREAM_RATE_LIMITED');
  });

  it('mapeia 401 upstream → 500 CONFIG_ERROR apontando para a variável', async () => {
    vi.mocked(buildPlayerCombatInsight).mockRejectedValueOnce(
      new HenrikDevApiError(401, 'Unauthorized', 10_002),
    );

    const response = await GET(request(), context());
    const body = (await response.json()) as { error: { code: string; hint?: string } };

    expect(response.status).toBe(500);
    expect(body.error.code).toBe('CONFIG_ERROR');
    expect(body.error.hint).toMatch(/HENRIKDEV_API_KEY/);
  });

  it('mapeia falha de rede upstream → 502 UPSTREAM_UNREACHABLE', async () => {
    vi.mocked(buildPlayerCombatInsight).mockRejectedValueOnce(
      new HenrikDevApiError(0, 'Falha de rede', 'NETWORK_ERROR'),
    );

    const response = await GET(request(), context());
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(502);
    expect(body.error.code).toBe('UPSTREAM_UNREACHABLE');
  });

  it('mapeia jogador sem partidas válidas → 404 NO_VALID_MATCHES', async () => {
    vi.mocked(buildPlayerCombatInsight).mockRejectedValueOnce(
      new PlayerNoMatchesError('Nenhuma partida competitiva válida encontrada'),
    );

    const response = await GET(request(), context());
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('NO_VALID_MATCHES');
  });

  it('erro desconhecido → 500 INTERNAL_ERROR sem vazar stack', async () => {
    vi.mocked(buildPlayerCombatInsight).mockRejectedValueOnce(new Error('boom interno'));

    const response = await GET(request(), context());
    const body = (await response.json()) as { error: { code: string; message: string } };

    expect(response.status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).not.toMatch(/boom/);
  });

  it('loga o erro mapeado no servidor (diagnóstico sem precisar do body)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      vi.mocked(buildPlayerCombatInsight).mockRejectedValueOnce(new Error('boom interno'));

      await GET(request(), context());

      expect(errorSpy).toHaveBeenCalled();
      expect(String(errorSpy.mock.calls[0]?.[0])).toMatch(/api\/players/);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('perfil privado ou inexistente → mesmo 404 PROFILE_NOT_PUBLIC, sem chamar a fonte', async () => {
    access.getByRiotId.mockResolvedValueOnce(null);
    const missing = await GET(request(), context());
    access.getByRiotId.mockResolvedValueOnce({ ...PUBLIC_LINK, profilePublic: false });
    const optedOut = await GET(request(), context());

    expect(missing.status).toBe(404);
    expect(optedOut.status).toBe(404);
    expect(await missing.json()).toEqual(PRIVATE_BODY);
    expect(await optedOut.json()).toEqual(PRIVATE_BODY);
    expect(vi.mocked(buildPlayerCombatInsight)).not.toHaveBeenCalled();
  });

  it('dono do perfil privado e conta demo → passam pela política', async () => {
    access.viewer.mockResolvedValueOnce('u-owner');
    access.getByRiotId.mockResolvedValueOnce({ ...PUBLIC_LINK, profilePublic: false });
    const owner = await GET(request(), context());
    const demo = await GET(request(), context('br', 'ValCoachDemo', 'DEMO'));

    expect(owner.status).not.toBe(404);
    expect(demo.status).not.toBe(404);
    expect(vi.mocked(buildPlayerCombatInsight)).toHaveBeenCalledTimes(2);
  });
});
