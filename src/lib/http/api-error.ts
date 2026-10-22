import { NextResponse } from 'next/server';
import { PRIVATE_PROFILE_MESSAGE, PROFILE_NOT_PUBLIC_CODE } from '@/contracts/access';
import type { ApiErrorBody } from '@/contracts/coach';
import { henrikDevErrorStatus, henrikDevRetryAfterSeconds } from '@/services/henrikdev/client';
import { TRACKER_NOT_FOUND_ERROR_NAME } from '@/services/tracker/source';

/**
 * Mapeamento HTTP compartilhado (Route Handlers) — traduz erros das camadas
 * internas no envelope `ApiErrorBody` do chatbot.
 *
 * Mantém UM único mapa de status para toda a API:
 *   404 → recurso não encontrado (código rótulo-por-rota)
 *   429 → 503 UPSTREAM_RATE_LIMITED (problema do fornecedor, não nosso)
 *   401 → 500 CONFIG_ERROR (nossa chave está errada)
 *   0   → 502 UPSTREAM_UNREACHABLE (rede/timeout)
 *   outros upstream → 502 UPSTREAM_ERROR
 *   env inválido → 500 CONFIG_ERROR
 *   desconhecido → 500 INTERNAL_ERROR (sem vazar stack no body)
 *
 * IMPORTANTE — fronteira `'use cache'`: o Next serializa erros lançados dentro
 * de funções cacheadas, reconstruindo um `Error` comum que preserva apenas
 * `name`/`message`. O protótipo (classe) e as props próprias somem, então
 * `instanceof` falha DEPOIS do cache. Por isso a detecção abaixo é ESTRUTURAL
 * (`hasErrorName` / `henrikDevErrorStatus`), nunca por classe.
 */

/**
 * Detecta um erro pelo `name` — que sobrevive à serialização da fronteira
 * `'use cache'`, ao contrário do protótipo exigido por `instanceof`.
 */
export function hasErrorName(error: unknown, name: string): error is Error {
  return error instanceof Error && error.name === name;
}

export interface MappedErrorDescriptor {
  readonly status: number;
  readonly code: string;
  readonly message: string;
  readonly hint?: string;
  readonly detail?: string;
  /** Segundos até a cota da HenrikDev reabrir (só no 429). */
  readonly retryAfterSeconds?: number;
}

/** Rótulos do 404 especificamente do recurso da rota (jogador vs. partida). */
export interface UpstreamLabels {
  readonly notFoundCode: string;
  readonly notFoundMessage: string;
  readonly notFoundHint?: string;
}

export function errorResponse(
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

/** 404 neutro: o mesmo corpo para perfil privado e conta inexistente. */
export function profileNotPublicResponse(): NextResponse<ApiErrorBody> {
  return errorResponse(404, PROFILE_NOT_PUBLIC_CODE, PRIVATE_PROFILE_MESSAGE);
}

export function describeUpstreamError(
  error: unknown,
  labels: UpstreamLabels,
): MappedErrorDescriptor {
  const upstreamStatus = henrikDevErrorStatus(error);
  if (upstreamStatus !== null) {
    const detail = `HenrikDevApiError status=${upstreamStatus}: ${
      error instanceof Error ? error.message : String(error)
    }`;
    if (upstreamStatus === 404) {
      return {
        status: 404,
        code: labels.notFoundCode,
        message: labels.notFoundMessage,
        ...(labels.notFoundHint !== undefined ? { hint: labels.notFoundHint } : {}),
        detail,
      };
    }
    if (upstreamStatus === 429) {
      const retryAfterSeconds = henrikDevRetryAfterSeconds(error);
      return {
        status: 503,
        code: 'UPSTREAM_RATE_LIMITED',
        message: 'Limite de requisições da HenrikDev atingido.',
        hint: 'Aguarde alguns segundos e tente novamente.',
        ...(retryAfterSeconds !== null ? { retryAfterSeconds } : {}),
        detail,
      };
    }
    if (upstreamStatus === 401) {
      return {
        status: 500,
        code: 'CONFIG_ERROR',
        message: 'A HenrikDev rejeitou a chave da API.',
        hint: 'Verifique a variável HENRIKDEV_API_KEY no Infisical (dev) ou no painel da Vercel (prod).',
        detail,
      };
    }
    if (upstreamStatus === 0) {
      return {
        status: 502,
        code: 'UPSTREAM_UNREACHABLE',
        message: 'Não foi possível contactar a HenrikDev.',
        hint: 'Falha de rede ou timeout — tente novamente em instantes.',
        detail,
      };
    }
    return {
      status: 502,
      code: 'UPSTREAM_ERROR',
      message: `Erro upstream da HenrikDev: ${
        error instanceof Error ? error.message : String(error)
      }`,
      detail,
    };
  }

  // Recurso inexistente na fonte do tracker (ex.: partida simulada sem foco
  // ou fora do histórico do foco) — mesmo 404 rotulado da rota.
  if (hasErrorName(error, TRACKER_NOT_FOUND_ERROR_NAME)) {
    return {
      status: 404,
      code: labels.notFoundCode,
      message: labels.notFoundMessage,
      ...(labels.notFoundHint !== undefined ? { hint: labels.notFoundHint } : {}),
      detail: `${error.name}: ${error.message}`,
    };
  }

  if (hasErrorName(error, 'EnvironmentValidationError')) {
    return {
      status: 500,
      code: 'CONFIG_ERROR',
      message: error instanceof Error ? error.message : String(error),
      detail: error instanceof Error ? error.message : String(error),
    };
  }

  return {
    status: 500,
    code: 'INTERNAL_ERROR',
    message: 'Erro interno inesperado.',
    detail: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
  };
}

/** Traduz um descritor mapeado no envelope `ApiErrorBody` (uso em RSC). */
export function mappedToApiErrorBody(mapped: MappedErrorDescriptor): ApiErrorBody {
  return {
    error: {
      code: mapped.code,
      message: mapped.message,
      ...(mapped.hint !== undefined ? { hint: mapped.hint } : {}),
    },
  };
}

/** Traduz o erro em resposta HTTP + log no servidor (diagnóstico sem body). */
export function mapUpstreamError(
  error: unknown,
  labels: UpstreamLabels,
  logPrefix: string,
): NextResponse<ApiErrorBody> {
  const mapped = describeUpstreamError(error, labels);
  console.error(
    `[${logPrefix}] ${mapped.code} → HTTP ${mapped.status}: ${mapped.message}` +
      (mapped.detail !== undefined ? ` | causa: ${mapped.detail}` : ''),
  );
  return errorResponse(mapped.status, mapped.code, mapped.message, mapped.hint);
}
