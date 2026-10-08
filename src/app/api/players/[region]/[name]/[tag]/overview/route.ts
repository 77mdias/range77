import { cacheLife, cacheTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { errorResponse, mapUpstreamError } from '@/lib/http/api-error';
import { parsePlayerRouteParams } from '@/lib/validation/player-params';
import { PlayerNoMatchesError } from '@/services/coaching/player-combat';
import { buildPlayerOverview } from '@/services/tracker/player-overview';

/**
 * ROTA: GET /api/players/[region]/[name]/[tag]/overview
 *
 * Visão geral do perfil: histórico de partidas + agregações por agente/mapa +
 * streaks + tendência + o envelope de coaching já existente. Cacheado com
 * `'use cache'` (stale 60s / revalidate 300s / expire 1h) para proteger o
 * limite da HenrikDev. Next 16: `params` é uma Promise e DEVE ser aguardada.
 */

const MIN_SAMPLE = 1;
const MAX_SAMPLE = 10;
const DEFAULT_SAMPLE = 5;

interface RouteContext {
  params: Promise<{ region: string; name: string; tag: string }>;
}

/** Envelope cacheado por jogador+amostra (tag permite invalidação futura). */
async function getCachedOverview(
  region: string,
  name: string,
  tag: string,
  size: number,
) {
  'use cache';
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
  cacheTag(`player-overview:${region}:${name.toLowerCase()}:${tag.toLowerCase()}:${size}`);
  return buildPlayerOverview({ region, name, tag, size });
}

export async function GET(
  request: Request,
  { params }: RouteContext,
): Promise<NextResponse> {
  const { region, name, tag } = await params;

  const parsed = parsePlayerRouteParams({ region, name, tag });
  if (!parsed.ok) {
    return errorResponse(400, 'INVALID_PARAMS', parsed.message);
  }

  const sizeParam = new URL(request.url).searchParams.get('size');
  let size = DEFAULT_SAMPLE;
  if (sizeParam !== null) {
    const candidate = Number.parseInt(sizeParam, 10);
    if (!Number.isInteger(candidate) || candidate < MIN_SAMPLE || candidate > MAX_SAMPLE) {
      return errorResponse(
        400,
        'INVALID_PARAMS',
        `Parâmetro "size" inválido: use um inteiro entre ${MIN_SAMPLE} e ${MAX_SAMPLE}.`,
      );
    }
    size = candidate;
  }

  try {
    const overview = await getCachedOverview(parsed.region, parsed.name, parsed.tag, size);
    return NextResponse.json(overview);
  } catch (error) {
    if (error instanceof PlayerNoMatchesError) {
      return errorResponse(
        404,
        'NO_VALID_MATCHES',
        error.message,
        'O jogador existe, mas não há partidas competitivas concluídas recentes.',
      );
    }
    return mapUpstreamError(
      error,
      {
        notFoundCode: 'PLAYER_NOT_FOUND',
        notFoundMessage: 'Jogador não encontrado na HenrikDev.',
        notFoundHint: 'Confira o Riot ID (nome#tag) e a região da conta.',
      },
      'api/players/overview',
    );
  }
}
