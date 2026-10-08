import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HenrikDevApiError } from '@/services/henrikdev/client';

/**
 * SUITE TDD — rota GET /api/matches/[region]/[matchId].
 */

vi.mock('@/services/tracker/match-detail', () => ({ getMatchDetail: vi.fn() }));

import { GET } from '@/app/api/matches/[region]/[matchId]/route';
import { getMatchDetail } from '@/services/tracker/match-detail';

const MATCH_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

const detailMock = {
  matchId: MATCH_ID,
  region: 'br',
  map: 'Ascent',
  queue: 'competitive',
  season: null,
  startedAt: '2026-10-01T12:00:00.000Z',
  gameLengthMs: 2_400_000,
  isCompleted: true,
  teams: [],
  scoreboard: [],
  rounds: [],
  kills: [],
};

const context = (
  region = 'br',
  matchId = MATCH_ID,
): { params: Promise<{ region: string; matchId: string }> } => ({
  params: Promise.resolve({ region, matchId }),
});

beforeEach(() => {
  vi.mocked(getMatchDetail).mockReset();
});

describe('GET /api/matches/[region]/[matchId]', () => {
  it('retorna 200 com o detalhe normalizado (região minúscula)', async () => {
    vi.mocked(getMatchDetail).mockResolvedValueOnce(detailMock as never);

    const response = await GET(new Request('http://localhost/api/matches/NA/x'), context('NA', MATCH_ID));
    const body = (await response.json()) as typeof detailMock;

    expect(response.status).toBe(200);
    expect(body.matchId).toBe(MATCH_ID);
    expect(vi.mocked(getMatchDetail)).toHaveBeenCalledWith({ region: 'na', matchId: MATCH_ID });
  });

  it('rejeita região inválida (400)', async () => {
    const response = await GET(new Request('http://localhost'), context('mars', MATCH_ID));
    expect(response.status).toBe(400);
    expect(((await response.json()) as { error: { code: string } }).error.code).toBe(
      'INVALID_PARAMS',
    );
  });

  it('rejeita matchId que não é UUID (400)', async () => {
    const response = await GET(new Request('http://localhost'), context('br', 'not-a-uuid'));
    expect(response.status).toBe(400);
  });

  it('mapeia 404 upstream → MATCH_NOT_FOUND', async () => {
    vi.mocked(getMatchDetail).mockRejectedValueOnce(
      new HenrikDevApiError(404, 'Match not found', 10_004),
    );

    const response = await GET(new Request('http://localhost'), context());
    const body = (await response.json()) as { error: { code: string; hint?: string } };

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('MATCH_NOT_FOUND');
    expect(body.error.hint).toMatch(/match ID/i);
  });

  it('mapeia erros upstream (429/401/rede)', async () => {
    vi.mocked(getMatchDetail).mockRejectedValueOnce(new HenrikDevApiError(429, 'rate'));
    expect((await GET(new Request('http://localhost'), context())).status).toBe(503);

    vi.mocked(getMatchDetail).mockRejectedValueOnce(new HenrikDevApiError(401, 'unauthorized'));
    expect((await GET(new Request('http://localhost'), context())).status).toBe(500);

    vi.mocked(getMatchDetail).mockRejectedValueOnce(new HenrikDevApiError(0, 'rede'));
    expect((await GET(new Request('http://localhost'), context())).status).toBe(502);
  });

  it('erro desconhecido → 500 INTERNAL_ERROR', async () => {
    vi.mocked(getMatchDetail).mockRejectedValueOnce(new Error('boom'));

    const response = await GET(new Request('http://localhost'), context());
    expect(response.status).toBe(500);
    expect(((await response.json()) as { error: { code: string } }).error.code).toBe(
      'INTERNAL_ERROR',
    );
  });
});
