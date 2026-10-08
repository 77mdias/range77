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
});
