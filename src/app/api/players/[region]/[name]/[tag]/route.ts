import { cacheLife, cacheTag } from 'next/cache';
import { NextResponse } from 'next/server';
import type { ApiErrorBody } from '@/contracts/coach';
import { hasErrorName, profileNotPublicResponse } from '@/lib/http/api-error';
import { getViewerUserId } from '@/lib/session';
import { resolveProfileAccess } from '@/services/access/profile-access';
import { parsePlayerRouteParams } from '@/lib/validation/player-params';
import { buildPlayerCombatInsight } from '@/services/coaching/player-combat';
import { henrikDevErrorStatus } from '@/services/henrikdev/client';
import { getTrackerSource } from '@/services/tracker/sources';

/**
 * ROTA: GET /api/players/[region]/[name]/[tag]
 *
 * Next 16 (App Router): `params` é uma Promise e DEVE ser aguardada.
 * Cache Components: o envelope é cacheado via helper `'use cache'` com
 * `cacheLife`/`cacheTag` (stale 5min / revalidate 25min / expire 6h),
 * protegendo os limites upstream contra o tráfego do chatbot. Os dados vêm da
 * `TrackerSource` de `TRACKER_DATA_SOURCE` (padrão `mock`); o `kind` entra na tag.
 */

const MIN_SAMPLE = 1;
const MAX_SAMPLE = 10;
const DEFAULT_SAMPLE = 5;

interface RouteContext {
  params: Promise<{ region: string; name: string; tag: string }>;
}

/** Envelope cacheado por jogador+amostra (tag permite invalidação futura). */
async function getCachedInsight(
  region: string,
  name: string,
  tag: string,
  size: number,
) {
  'use cache';
  cacheLife({ stale: 300, revalidate: 1500, expire: 21600 });
  const source = getTrackerSource();
  cacheTag(
    `player-combat:${source.kind}:${region}:${name.toLowerCase()}:${tag.toLowerCase()}:${size}`,
  );
  return buildPlayerCombatInsight({ region, name, tag, size, source });
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

interface MappedErrorDescriptor {
  readonly status: number;
  readonly code: string;
  readonly message: string;
  readonly hint?: string;
  readonly detail?: string;
}

function describeError(error: unknown): MappedErrorDescriptor {
  const upstreamStatus = henrikDevErrorStatus(error);
  if (upstreamStatus !== null) {
    const detail = `HenrikDevApiError status=${upstreamStatus}: ${
      error instanceof Error ? error.message : String(error)
    }`;
    if (upstreamStatus === 404) {
      return {
        status: 404,
        code: 'PLAYER_NOT_FOUND',
        message: 'Jogador não encontrado.',
        hint: 'Confira o Riot ID (nome#tag) e a região da conta.',
        detail,
      };
    }
    if (upstreamStatus === 429) {
      return {
        status: 503,
        code: 'UPSTREAM_RATE_LIMITED',
        message: 'Limite de requisições do provedor de dados atingido.',
        hint: 'Aguarde alguns segundos e tente novamente.',
        detail,
      };
    }
    if (upstreamStatus === 401) {
      return {
        status: 500,
        code: 'CONFIG_ERROR',
        message: 'O provedor de dados rejeitou a chave da API.',
        hint: 'Verifique a variável HENRIKDEV_API_KEY no Infisical (dev) ou no painel da Vercel (prod).',
        detail,
      };
    }
    if (upstreamStatus === 0) {
      return {
        status: 502,
        code: 'UPSTREAM_UNREACHABLE',
        message: 'Não foi possível contactar o provedor de dados.',
        hint: 'Falha de rede ou timeout — tente novamente em instantes.',
        detail,
      };
    }
    return {
      status: 502,
      code: 'UPSTREAM_ERROR',
      message: `Erro upstream do provedor de dados: ${
        error instanceof Error ? error.message : String(error)
      }`,
      detail,
    };
  }

  if (hasErrorName(error, 'PlayerNoMatchesError')) {
    return {
      status: 404,
      code: 'NO_VALID_MATCHES',
      message: error.message,
      hint: 'O jogador existe, mas não há partidas competitivas concluídas.',
    };
  }

  if (hasErrorName(error, 'EnvironmentValidationError')) {
    return { status: 500, code: 'CONFIG_ERROR', message: error.message, detail: error.message };
  }

  if (hasErrorName(error, 'CombatMetricsError')) {
    return { status: 500, code: 'ANALYTICS_ERROR', message: error.message, detail: error.message };
  }

  return {
    status: 500,
    code: 'INTERNAL_ERROR',
    message: 'Erro interno inesperado.',
    detail: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
  };
}

/** Traduz erros das camadas internas em respostas HTTP "mastigadas" + log. */
function mapServiceError(error: unknown): NextResponse<ApiErrorBody> {
  const mapped = describeError(error);
  console.error(
    `[api/players] ${mapped.code} → HTTP ${mapped.status}: ${mapped.message}` +
      (mapped.detail !== undefined ? ` | causa: ${mapped.detail}` : ''),
  );
  return errorResponse(mapped.status, mapped.code, mapped.message, mapped.hint);
}

export async function GET(
  request: Request,
  { params }: RouteContext,
): Promise<NextResponse> {
  // Next 16: APIs de requisição são assíncronas — params É uma Promise.
  const { region, name, tag } = await params;

  const parsed = parsePlayerRouteParams({ region, name, tag });
  if (!parsed.ok) {
    return errorResponse(400, 'INVALID_PARAMS', parsed.message);
  }

  const sizeParam = new URL(request.url).searchParams.get('size');
  let size = DEFAULT_SAMPLE;
  if (sizeParam !== null) {
    const parsed = Number.parseInt(sizeParam, 10);
    if (!Number.isInteger(parsed) || parsed < MIN_SAMPLE || parsed > MAX_SAMPLE) {
      return errorResponse(
        400,
        'INVALID_PARAMS',
        `Parâmetro "size" inválido: use um inteiro entre ${MIN_SAMPLE} e ${MAX_SAMPLE}.`,
      );
    }
    size = parsed;
  }

  // Consentimento ANTES da fonte: sem opt-in, nada de dado pessoal.
  const viewerUserId = await getViewerUserId(request.headers);
  if ((await resolveProfileAccess(viewerUserId, parsed)) === 'private') {
    return profileNotPublicResponse();
  }

  try {
    const insight = await getCachedInsight(parsed.region, parsed.name, parsed.tag, size);
    return NextResponse.json(insight);
  } catch (error) {
    return mapServiceError(error);
  }
}
