import { NextResponse } from 'next/server';
import { EnvironmentValidationError } from '@/config/env';
import type { ApiErrorBody } from '@/contracts/coach';
import { profileNotPublicResponse } from '@/lib/http/api-error';
import { getViewerUserId } from '@/lib/session';
import { parsePlayerRouteParams } from '@/lib/validation/player-params';
import { resolveProfileAccess } from '@/services/access/profile-access';
import {
  buildPlayerEvolutionInsight,
  PlayerNoHistoryError,
} from '@/services/coaching/player-evolution';

/**
 * ROTA: GET /api/players/[region]/[name]/[tag]/history
 *
 * Evolução do jogador entre snapshots persistidos (Neon) — o "heavy lifting"
 * de tendência (deltas, classificação Melhorando/Estável/Piorando) é todo do
 * backend; o chatbot recebe o envelope pronto. Next 16: `await params`.
 */

const MIN_LIMIT = 2;
const MAX_LIMIT = 20;
const DEFAULT_LIMIT = 10;

interface RouteContext {
  params: Promise<{ region: string; name: string; tag: string }>;
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  hint?: string,
): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    { error: { code, message, ...(hint !== undefined ? { hint } : {}) } },
    { status },
  );
}

function mapServiceError(error: unknown): NextResponse<ApiErrorBody> {
  if (error instanceof PlayerNoHistoryError) {
    console.error(`[api/players/history] INSUFFICIENT_HISTORY → HTTP 404: ${error.message}`);
    return errorResponse(
      404,
      'INSUFFICIENT_HISTORY',
      error.message,
      'Acumule histórico chamando GET /api/players/{region}/{name}/{tag} em momentos diferentes antes de pedir a evolução.',
    );
  }

  if (error instanceof EnvironmentValidationError) {
    console.error(`[api/players/history] CONFIG_ERROR → HTTP 500: ${error.message}`);
    return errorResponse(500, 'CONFIG_ERROR', error.message);
  }

  const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  console.error(`[api/players/history] INTERNAL_ERROR → HTTP 500 | causa: ${detail}`);
  return errorResponse(500, 'INTERNAL_ERROR', 'Erro interno inesperado.');
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

  const limitParam = new URL(request.url).searchParams.get('limit');
  let limit = DEFAULT_LIMIT;
  if (limitParam !== null) {
    const parsedLimit = Number.parseInt(limitParam, 10);
    if (!Number.isInteger(parsedLimit) || parsedLimit < MIN_LIMIT || parsedLimit > MAX_LIMIT) {
      return errorResponse(
        400,
        'INVALID_PARAMS',
        `Parâmetro "limit" inválido: use um inteiro entre ${MIN_LIMIT} e ${MAX_LIMIT}.`,
      );
    }
    limit = parsedLimit;
  }

  // Consentimento ANTES da fonte: sem opt-in, nada de dado pessoal.
  const viewerUserId = await getViewerUserId(request.headers);
  if ((await resolveProfileAccess(viewerUserId, parsed)) === 'private') {
    return profileNotPublicResponse();
  }

  try {
    const insight = await buildPlayerEvolutionInsight({
      region: parsed.region,
      name: parsed.name,
      tag: parsed.tag,
      limit,
    });
    return NextResponse.json(insight);
  } catch (error) {
    return mapServiceError(error);
  }
}
