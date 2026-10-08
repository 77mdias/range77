import { NextResponse } from 'next/server';
import { getCachedMatchDetail } from '@/lib/cache/tracker';
import { errorResponse, mapUpstreamError } from '@/lib/http/api-error';
import { parseMatchRouteParams } from '@/lib/validation/match-params';

/**
 * ROTA: GET /api/matches/[region]/[matchId]
 *
 * Detalhe normalizado de UMA partida (scoreboard duplo, rounds e timeline).
 * Cache Data (`'use cache'`) + cache durável em Neon (`match_cache`, TTL 24h):
 * visitas repetidas não tocam a HenrikDev. Next 16: `await params`.
 */

interface RouteContext {
  params: Promise<{ region: string; matchId: string }>;
}

export async function GET(
  _request: Request,
  { params }: RouteContext,
): Promise<NextResponse> {
  const { region, matchId } = await params;

  const parsed = parseMatchRouteParams(region, matchId);
  if (!parsed.ok) {
    return errorResponse(400, 'INVALID_PARAMS', parsed.message);
  }

  try {
    const detail = await getCachedMatchDetail(parsed.region, parsed.matchId);
    return NextResponse.json(detail);
  } catch (error) {
    return mapUpstreamError(
      error,
      {
        notFoundCode: 'MATCH_NOT_FOUND',
        notFoundMessage: 'Partida não encontrada na HenrikDev.',
        notFoundHint: 'Confira o match ID e a região da partida.',
      },
      'api/matches',
    );
  }
}
