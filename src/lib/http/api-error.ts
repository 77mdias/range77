import { NextResponse } from 'next/server';
import { EnvironmentValidationError } from '@/config/env';
import type { ApiErrorBody } from '@/contracts/coach';
import { HenrikDevApiError } from '@/services/henrikdev/client';

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
 */

export interface MappedErrorDescriptor {
  readonly status: number;
  readonly code: string;
  readonly message: string;
  readonly hint?: string;
  readonly detail?: string;
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

export function describeUpstreamError(
  error: unknown,
  labels: UpstreamLabels,
): MappedErrorDescriptor {
  if (error instanceof HenrikDevApiError) {
    const detail = `HenrikDevApiError status=${error.status} code=${String(error.code ?? '?')}: ${error.message}`;
    if (error.status === 404) {
      return {
        status: 404,
        code: labels.notFoundCode,
        message: labels.notFoundMessage,
        ...(labels.notFoundHint !== undefined ? { hint: labels.notFoundHint } : {}),
        detail,
      };
    }
    if (error.status === 429) {
      return {
        status: 503,
        code: 'UPSTREAM_RATE_LIMITED',
        message: 'Limite de requisições da HenrikDev atingido.',
        hint: 'Aguarde alguns segundos e tente novamente.',
        detail,
      };
    }
    if (error.status === 401) {
      return {
        status: 500,
        code: 'CONFIG_ERROR',
        message: 'A HenrikDev rejeitou a chave da API.',
        hint: 'Verifique a variável HENRIKDEV_API_KEY no Infisical (dev) ou no painel da Vercel (prod).',
        detail,
      };
    }
    if (error.status === 0) {
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
      message: `Erro upstream da HenrikDev: ${error.message}`,
      detail,
    };
  }

  if (error instanceof EnvironmentValidationError) {
    return { status: 500, code: 'CONFIG_ERROR', message: error.message, detail: error.message };
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
