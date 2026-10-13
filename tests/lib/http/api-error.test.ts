import { describe, expect, it, vi } from 'vitest';
import { EnvironmentValidationError } from '@/config/env';
import { describeUpstreamError, errorResponse, hasErrorName, mapUpstreamError } from '@/lib/http/api-error';
import { HenrikDevApiError } from '@/services/henrikdev/client';

/**
 * SUITE TDD — mapeamento HTTP compartilhado (`ApiErrorBody`).
 */

const labels = {
  notFoundCode: 'THING_NOT_FOUND',
  notFoundMessage: 'Coisa não encontrada.',
  notFoundHint: 'Confira o identificador.',
};

describe('describeUpstreamError', () => {
  it('mapeia 404 para o rótulo do recurso com hint', () => {
    expect(describeUpstreamError(new HenrikDevApiError(404, 'not found', 10_001), labels)).toMatchObject({
      status: 404,
      code: 'THING_NOT_FOUND',
      message: 'Coisa não encontrada.',
      hint: 'Confira o identificador.',
    });
  });

  it('omite hint quando o rótulo não traz hint', () => {
    const mapped = describeUpstreamError(new HenrikDevApiError(404, 'x', 1), {
      notFoundCode: 'N',
      notFoundMessage: 'M',
    });
    expect(mapped.hint).toBeUndefined();
  });

  it.each([
    [429, 503, 'UPSTREAM_RATE_LIMITED'],
    [401, 500, 'CONFIG_ERROR'],
    [0, 502, 'UPSTREAM_UNREACHABLE'],
    [500, 502, 'UPSTREAM_ERROR'],
  ])('mapeia status %i → HTTP %i (%s)', (status, http, code) => {
    expect(describeUpstreamError(new HenrikDevApiError(status, 'boom'), labels)).toMatchObject({
      status: http,
      code,
    });
  });

  it('mapeia 429 preservando o retryAfterSeconds do header', () => {
    expect(
      describeUpstreamError(new HenrikDevApiError(429, 'rate limited', undefined, 12), labels),
    ).toMatchObject({
      status: 503,
      code: 'UPSTREAM_RATE_LIMITED',
      retryAfterSeconds: 12,
    });
  });

  it('429 sem header de reset não define retryAfterSeconds', () => {
    const mapped = describeUpstreamError(new HenrikDevApiError(429, 'rate limited'), labels);
    expect(mapped.retryAfterSeconds).toBeUndefined();
  });

  it('mapeia env inválido → CONFIG_ERROR', () => {
    expect(describeUpstreamError(new EnvironmentValidationError('faltou DATABASE_URL'), labels)).toMatchObject({
      status: 500,
      code: 'CONFIG_ERROR',
      message: 'faltou DATABASE_URL',
    });
  });

  it('mapeia erro desconhecido → INTERNAL_ERROR sem vazar stack no message', () => {
    const mapped = describeUpstreamError(new Error('boom interno'), labels);
    expect(mapped.status).toBe(500);
    expect(mapped.code).toBe('INTERNAL_ERROR');
    expect(mapped.message).not.toMatch(/boom/);
    expect(mapped.detail).toMatch(/boom/);

    expect(describeUpstreamError('string solta', labels).detail).toBe('string solta');
  });

  it('mapeia o erro SERIALIZADO pela fronteira `use cache` (só name/message sobrevivem)', () => {
    // Regressão: o Next reconstrói o erro ao cruzar `'use cache'`, perdendo o
    // protótipo (instanceof) e as props. O status codificado no `name` mantém
    // o mapeamento HTTP — este era o bug do jogador demo caindo em INTERNAL_ERROR.
    const serialized = Object.assign(new Error('Region not found'), {
      name: 'HenrikDevApiError:404',
    });

    expect(describeUpstreamError(serialized, labels)).toMatchObject({
      status: 404,
      code: 'THING_NOT_FOUND',
      message: 'Coisa não encontrada.',
    });
  });

  it('detecta erros por name (robusto à serialização do cache)', () => {
    expect(hasErrorName(new EnvironmentValidationError('x'), 'EnvironmentValidationError')).toBe(true);
    expect(
      hasErrorName(Object.assign(new Error('x'), { name: 'CombatMetricsError' }), 'CombatMetricsError'),
    ).toBe(true);
    expect(hasErrorName(new Error('x'), 'CombatMetricsError')).toBe(false);
    expect(hasErrorName('string', 'CombatMetricsError')).toBe(false);
  });
});

describe('errorResponse / mapUpstreamError', () => {
  it('serializa o envelope ApiErrorBody com status', async () => {
    const response = errorResponse(400, 'INVALID_PARAMS', 'ruim', 'dica');
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: 'INVALID_PARAMS', message: 'ruim', hint: 'dica' },
    });
  });

  it('loga a causa e responde o mapa', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const response = mapUpstreamError(new HenrikDevApiError(0, 'rede'), labels, 'api/test');
      expect(response.status).toBe(502);
      expect(errorSpy).toHaveBeenCalled();
      expect(String(errorSpy.mock.calls[0]?.[0])).toMatch(/api\/test/);
    } finally {
      errorSpy.mockRestore();
    }
  });
});
