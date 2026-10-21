import { NextResponse } from 'next/server';
import { getCachedMatchDetail } from '@/lib/cache/tracker';
import { errorResponse, mapUpstreamError } from '@/lib/http/api-error';
import { parseMatchRouteParams } from '@/lib/validation/match-params';
import { parseRiotId } from '@/lib/validation/riot-id';

/**
 * ROTA: GET /api/matches/[region]/[matchId]
 *
 * Detalhe normalizado de UMA partida (scoreboard duplo, rounds e timeline).
 * Cache Data (`'use cache'`) + cache durável em Neon (`match_cache`, TTL 24h):
 * visitas repetidas não tocam o upstream. Next 16: `await params`.
 *
 * `?player=Nome#Tag` (opcional) informa o jogador em foco — exigido pela fonte
 * simulada (padrão), cujo `matchId` deriva do Riot ID do foco.
 */

interface RouteContext {
  params: Promise<{ region: string; matchId: string }>;
}

export async function GET(
  request: Request,
  { params }: RouteContext,
): Promise<NextResponse> {
  const { region, matchId } = await params;

  const parsed = parseMatchRouteParams(region, matchId);
  if (!parsed.ok) {
    return errorResponse(400, 'INVALID_PARAMS', parsed.message);
  }

  const rawPlayer = new URL(request.url).searchParams.get('player');
  let focus: { name: string; tag: string } | undefined;
  if (rawPlayer !== null) {
    const player = parseRiotId(rawPlayer);
    if (!player.ok) {
      return errorResponse(400, 'INVALID_PARAMS', `Parâmetro "player" inválido: ${player.message}`);
    }
    focus = { name: player.value.name, tag: player.value.tag };
  }

  try {
    const detail = await getCachedMatchDetail(parsed.region, parsed.matchId, focus);
    return NextResponse.json(detail);
  } catch (error) {
    return mapUpstreamError(
      error,
      {
        notFoundCode: 'MATCH_NOT_FOUND',
        notFoundMessage: 'Partida não encontrada.',
        notFoundHint: 'Abra a partida pelo histórico do jogador (o link inclui o jogador) e confira a região.',
      },
      'api/matches',
    );
  }
}
