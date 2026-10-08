import { NextResponse } from 'next/server';
import { HENRIKDEV_AFFINITIES } from '@/contracts/henrikdev';
import { errorResponse, mapUpstreamError } from '@/lib/http/api-error';
import { getMatchDetail } from '@/services/tracker/match-detail';

/**
 * ROTA: GET /api/matches/[region]/[matchId]
 *
 * Detalhe bruto normalizado de UMA partida (scoreboard duplo, rounds e
 * timeline de abates). O cache durável em Neon (`match_cache`, TTL 24h) evita
 * tocar a HenrikDev em visitas repetidas. Next 16: `await params`.
 */

const MATCH_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RouteContext {
  params: Promise<{ region: string; matchId: string }>;
}

type MatchParamsResult =
  | { readonly ok: true; readonly region: string; readonly matchId: string }
  | { readonly ok: false; readonly message: string };

function parseMatchRouteParams(region: unknown, matchId: unknown): MatchParamsResult {
  const normalizedRegion = typeof region === 'string' ? region.trim().toLowerCase() : '';
  if (!(HENRIKDEV_AFFINITIES as readonly string[]).includes(normalizedRegion)) {
    return {
      ok: false,
      message: `Região inválida: "${String(region)}". Afinidades aceitas: ${HENRIKDEV_AFFINITIES.join(', ')}.`,
    };
  }

  const normalizedMatchId = typeof matchId === 'string' ? matchId.trim() : '';
  if (!MATCH_ID_PATTERN.test(normalizedMatchId)) {
    return { ok: false, message: 'matchId inválido: informe o UUID da partida.' };
  }

  return { ok: true, region: normalizedRegion, matchId: normalizedMatchId };
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
    const detail = await getMatchDetail({ region: parsed.region, matchId: parsed.matchId });
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
