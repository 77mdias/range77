import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * SUITE TDD — rota GET /api/players/[region]/[name]/[tag]/history.
 * Serviço mockado: aqui só valida HTTP, await params e mapeamento de erros.
 */

vi.mock('@/services/coaching/player-evolution', () => {
  class PlayerNoHistoryError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'PlayerNoHistoryError';
    }
  }
  return { buildPlayerEvolutionInsight: vi.fn(), PlayerNoHistoryError };
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

import { GET } from '@/app/api/players/[region]/[name]/[tag]/history/route';
import {
  buildPlayerEvolutionInsight,
  PlayerNoHistoryError,
} from '@/services/coaching/player-evolution';

const insightMock = {
  player: { region: 'br', name: 'Player', tag: 'BR1' },
  window: { from: '2026-10-01T12:00:00.000Z', to: '2026-10-08T12:00:00.000Z' },
  evolution: { kdr: { baseline: 1, current: 1.3, delta: 0.3, trend: 'Melhorando' } },
  raw_metrics: { kdr: 1.3, kpr: 0.9, acs: 220, snapshots: 2 },
  contextual_rating: { kdr: 'Acima da Média' },
  coaching_hooks: ['Evolução em KDR: 1.00 → 1.30 (+0.30)...'],
};

const request = (url = 'http://localhost/api/players/br/Player/BR1/history'): Request =>
  new Request(url);

const context = (
  region = 'br',
  name = 'Player',
  tag = 'BR1',
): { params: Promise<{ region: string; name: string; tag: string }> } => ({
  params: Promise.resolve({ region, name, tag }),
});

beforeEach(() => {
  vi.mocked(buildPlayerEvolutionInsight).mockReset();
  access.getByRiotId.mockReset().mockResolvedValue(PUBLIC_LINK);
  access.viewer.mockReset().mockResolvedValue(null);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('GET /api/players/[region]/[name]/[tag]/history', () => {
  it('retorna 200 com o envelope de evolução', async () => {
    vi.mocked(buildPlayerEvolutionInsight).mockResolvedValueOnce(insightMock as never);

    const response = await GET(request(), context('BR', 'Player', 'BR1'));
    const body = (await response.json()) as typeof insightMock;

    expect(response.status).toBe(200);
    expect(body.player.region).toBe('br');
    expect(body.evolution.kdr?.trend).toBe('Melhorando');
    expect(vi.mocked(buildPlayerEvolutionInsight)).toHaveBeenCalledWith({
      region: 'br',
      name: 'Player',
      tag: 'BR1',
      limit: 10,
    });
  });

  it('valida ?limit= entre 2 e 20 (400 fora da faixa; valor válido é repassado)', async () => {
    const tooSmall = await GET(
      request('http://localhost/api/players/br/Player/BR1/history?limit=1'),
      context(),
    );
    const tooBig = await GET(
      request('http://localhost/api/players/br/Player/BR1/history?limit=21'),
      context(),
    );
    expect(tooSmall.status).toBe(400);
    expect(tooBig.status).toBe(400);

    vi.mocked(buildPlayerEvolutionInsight).mockResolvedValueOnce(insightMock as never);
    await GET(request('http://localhost/api/players/br/Player/BR1/history?limit=5'), context());
    expect(vi.mocked(buildPlayerEvolutionInsight)).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 5 }),
    );
  });

  it('rejeita região inválida com a lista de afinidades (400)', async () => {
    const response = await GET(request(), context('mars', 'Player', 'BR1'));
    const body = (await response.json()) as { error: { code: string; message: string } };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('INVALID_PARAMS');
    expect(body.error.message).toMatch(/eu, na, ap, kr, latam, br/);
  });

  it('histórico insuficiente → 404 INSUFFICIENT_HISTORY com hint acionável', async () => {
    vi.mocked(buildPlayerEvolutionInsight).mockRejectedValueOnce(
      new PlayerNoHistoryError('Histórico insuficiente: são necessárias pelo menos 2 análises.'),
    );

    const response = await GET(request(), context());
    const body = (await response.json()) as { error: { code: string; hint?: string } };

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('INSUFFICIENT_HISTORY');
    expect(body.error.hint).toMatch(/api\/players/);
  });

  it('erro desconhecido → 500 INTERNAL_ERROR com log no servidor', async () => {
    vi.mocked(buildPlayerEvolutionInsight).mockRejectedValueOnce(new Error('boom'));

    const response = await GET(request(), context());

    expect(response.status).toBe(500);
    expect(((await response.json()) as { error: { code: string } }).error.code).toBe(
      'INTERNAL_ERROR',
    );
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
    expect(vi.mocked(buildPlayerEvolutionInsight)).not.toHaveBeenCalled();
  });

  it('dono do perfil privado e conta demo → passam pela política', async () => {
    access.viewer.mockResolvedValueOnce('u-owner');
    access.getByRiotId.mockResolvedValueOnce({ ...PUBLIC_LINK, profilePublic: false });
    const owner = await GET(request(), context());
    const demo = await GET(request(), context('br', 'ValCoachDemo', 'DEMO'));

    expect(owner.status).not.toBe(404);
    expect(demo.status).not.toBe(404);
    expect(vi.mocked(buildPlayerEvolutionInsight)).toHaveBeenCalledTimes(2);
  });
});
