import { cacheLife, cacheTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { EnvironmentValidationError } from '@/config/env';
import type { ApiErrorBody } from '@/contracts/coach';
import { HENRIKDEV_AFFINITIES } from '@/contracts/henrikdev';
import { CombatMetricsError } from '@/services/analytics/combat';
import {
  buildPlayerCombatInsight,
  PlayerNoMatchesError,
} from '@/services/coaching/player-combat';
import { HenrikDevApiError } from '@/services/henrikdev/client';

/**
 * ROTA: GET /api/players/[region]/[name]/[tag]
 *
 * Next 16 (App Router): `params` é uma Promise e DEVE ser aguardada.
 * Cache Components: o envelope é cacheado via helper `'use cache'` com
 * `cacheLife`/`cacheTag` (perfil stale 60s / revalidate 300s / expire 1h),
 * protegendo nossos limites da HenrikDev contra o tráfego do chatbot.
 */

const MIN_SAMPLE = 1;
const MAX_SAMPLE = 10;
const DEFAULT_SAMPLE = 10;
const RIOT_TAG_PATTERN = /^[a-z0-9]{1,6}$/i;
const MAX_NAME_LENGTH = 32;

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
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
  cacheTag(`player-combat:${region}:${name.toLowerCase()}:${tag.toLowerCase()}:${size}`);
  return buildPlayerCombatInsight({ region, name, tag, size });
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

/** Traduz erros das camadas internas em respostas HTTP "mastigadas". */
function mapServiceError(error: unknown): NextResponse<ApiErrorBody> {
  if (error instanceof HenrikDevApiError) {
    if (error.status === 404) {
      return errorResponse(
        404,
        'PLAYER_NOT_FOUND',
        'Jogador não encontrado na HenrikDev.',
        'Confira o Riot ID (nome#tag) e a região da conta.',
      );
    }
    if (error.status === 429) {
      return errorResponse(
        503,
        'UPSTREAM_RATE_LIMITED',
        'Limite de requisições da HenrikDev atingido.',
        'Aguarde alguns segundos e tente novamente.',
      );
    }
    if (error.status === 401) {
      return errorResponse(
        500,
        'CONFIG_ERROR',
        'A HenrikDev rejeitou a chave da API.',
        'Verifique a variável HENRIKDEV_API_KEY no Infisical (dev) ou no painel da Vercel (prod).',
      );
    }
    if (error.status === 0) {
      return errorResponse(
        502,
        'UPSTREAM_UNREACHABLE',
        'Não foi possível contactar a HenrikDev.',
        'Falha de rede ou timeout — tente novamente em instantes.',
      );
    }
    return errorResponse(502, 'UPSTREAM_ERROR', `Erro upstream da HenrikDev: ${error.message}`);
  }

  if (error instanceof PlayerNoMatchesError) {
    return errorResponse(
      404,
      'NO_VALID_MATCHES',
      error.message,
      'O jogador existe, mas não há partidas competitivas concluídas recentes.',
    );
  }

  if (error instanceof EnvironmentValidationError) {
    return errorResponse(500, 'CONFIG_ERROR', error.message);
  }

  if (error instanceof CombatMetricsError) {
    return errorResponse(500, 'ANALYTICS_ERROR', error.message);
  }

  return errorResponse(500, 'INTERNAL_ERROR', 'Erro interno inesperado.');
}

export async function GET(
  request: Request,
  { params }: RouteContext,
): Promise<NextResponse> {
  // Next 16: APIs de requisição são assíncronas — params É uma Promise.
  const { region, name, tag } = await params;

  const affinity = typeof region === 'string' ? region.trim().toLowerCase() : '';
  if (!(HENRIKDEV_AFFINITIES as readonly string[]).includes(affinity)) {
    return errorResponse(
      400,
      'INVALID_PARAMS',
      `Região inválida: "${region}". Afinidades aceitas: ${HENRIKDEV_AFFINITIES.join(', ')}.`,
    );
  }

  const trimmedName = typeof name === 'string' ? name.trim() : '';
  if (trimmedName === '' || trimmedName.length > MAX_NAME_LENGTH) {
    return errorResponse(
      400,
      'INVALID_PARAMS',
      `Nome do Riot ID inválido (vazio ou acima de ${MAX_NAME_LENGTH} caracteres).`,
    );
  }

  if (typeof tag !== 'string' || !RIOT_TAG_PATTERN.test(tag)) {
    return errorResponse(
      400,
      'INVALID_PARAMS',
      'Tag do Riot ID inválida (use 1–6 caracteres alfanuméricos).',
    );
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

  try {
    const insight = await getCachedInsight(affinity, trimmedName, tag, size);
    return NextResponse.json(insight);
  } catch (error) {
    return mapServiceError(error);
  }
}
