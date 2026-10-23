import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  APP_ENVIRONMENTS,
  EnvironmentValidationError,
  loadAppEnv,
  parseAppEnvironment,
  parseTrackerDataSource,
  requireEnv,
  type AppEnv,
} from '@/config/env';

/**
 * SUITE TDD — módulo de ambientes (test | dev | prod).
 *
 * Escrita ANTES da implementação (Passo 2 do pipeline). Cobre:
 *  - parsing do ambiente com precedência APP_ENV > NODE_ENV;
 *  - rejeição explícita de valores inválidos (fail fast, mensagem clara);
 *  - normalização de variáveis (trim, vazio = ausente);
 *  - `requireEnv` com mensagens de remediação por ambiente.
 */

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('parseAppEnvironment', () => {
  it.each(APP_ENVIRONMENTS)('aceita APP_ENV explícito válido: %s', (appEnv) => {
    expect(parseAppEnvironment({ appEnv })).toBe(appEnv);
  });

  it('rejeita APP_ENV inválido listando os valores aceitos', () => {
    const attempt = () => parseAppEnvironment({ appEnv: 'staging' });
    expect(attempt).toThrowError(EnvironmentValidationError);
    expect(attempt).toThrowError(/APP_ENV inválido: "staging".*dev, test, prod/s);
  });

  it('APP_ENV tem precedência sobre NODE_ENV', () => {
    expect(parseAppEnvironment({ appEnv: 'prod', nodeEnv: 'development' })).toBe('prod');
  });

  it.each([
    ['dev', 'development'],
    ['test', 'test'],
    ['prod', 'production'],
  ] as const)('deriva %s de NODE_ENV=%s quando APP_ENV não existe', (expected, nodeEnv) => {
    expect(parseAppEnvironment({ nodeEnv })).toBe(expected);
  });

  it('falha quando NODE_ENV é desconhecido e APP_ENV não foi definido', () => {
    expect(() => parseAppEnvironment({ nodeEnv: 'homolog' })).toThrowError(/NODE_ENV="homolog"/);
  });

  it('falha quando nenhuma fonte de ambiente existe', () => {
    expect(() => parseAppEnvironment({})).toThrowError(/APP_ENV/);
  });
});

describe('loadAppEnv', () => {
  it('carrega e tipa as variáveis de uma fonte explícita', () => {
    const env = loadAppEnv({
      APP_ENV: 'dev',
      DATABASE_URL: 'postgres://user:pass@host/db',
      HENRIKDEV_API_KEY: 'hd-key',
      MINIMAX_API_KEY: 'mm-key',
    });

    expect(env.APP_ENV).toBe('dev');
    expect(env.NODE_ENV).toBe('development'); // derivado de APP_ENV
    expect(env.DATABASE_URL).toBe('postgres://user:pass@host/db');
    expect(env.HENRIKDEV_API_KEY).toBe('hd-key');
    expect(env.MINIMAX_API_KEY).toBe('mm-key');
  });

  it('trata strings vazias ou só de espaços como ausentes (após trim)', () => {
    const env = loadAppEnv({ APP_ENV: 'dev', DATABASE_URL: '   ', HENRIKDEV_API_KEY: '' });

    expect(env.DATABASE_URL).toBeUndefined();
    expect(env.HENRIKDEV_API_KEY).toBeUndefined();
  });

  it('trima valores válidos', () => {
    const env = loadAppEnv({ APP_ENV: 'dev', DATABASE_URL: '  postgres://x  ' });

    expect(env.DATABASE_URL).toBe('postgres://x');
  });

  it('preserva NODE_ENV quando já definido', () => {
    const env = loadAppEnv({ APP_ENV: 'test', NODE_ENV: 'test' });

    expect(env.NODE_ENV).toBe('test');
  });

  it('usa process.env como fonte padrão (ambiente de teste → APP_ENV=test)', () => {
    vi.stubEnv('APP_ENV', 'test');

    expect(loadAppEnv().APP_ENV).toBe('test');
  });

  it('propaga erro de ambiente inválido', () => {
    expect(() => loadAppEnv({ APP_ENV: 'qa' })).toThrowError(EnvironmentValidationError);
  });
});

describe('TRACKER_DATA_SOURCE', () => {
  it('ausente ou vazio → mock (padrão)', () => {
    expect(loadAppEnv({ APP_ENV: 'test' }).TRACKER_DATA_SOURCE).toBe('mock');
    expect(loadAppEnv({ APP_ENV: 'test', TRACKER_DATA_SOURCE: '   ' }).TRACKER_DATA_SOURCE).toBe(
      'mock',
    );
  });

  it.each([
    ['MOCK', 'mock'],
    [' henrikdev ', 'henrikdev'],
    ['Riot', 'riot'],
  ] as const)('normaliza %j → %s', (raw, expected) => {
    expect(loadAppEnv({ APP_ENV: 'test', TRACKER_DATA_SOURCE: raw }).TRACKER_DATA_SOURCE).toBe(
      expected,
    );
  });

  it('valor desconhecido → EnvironmentValidationError listando os aceitos', () => {
    const attempt = () => parseTrackerDataSource('xpto');
    expect(attempt).toThrowError(EnvironmentValidationError);
    expect(attempt).toThrowError(/TRACKER_DATA_SOURCE inválido: "xpto".*mock, riot, henrikdev/);
    expect(() => loadAppEnv({ APP_ENV: 'test', TRACKER_DATA_SOURCE: 'xpto' })).toThrowError(
      EnvironmentValidationError,
    );
  });
});

describe('requireEnv', () => {
  const baseEnv: AppEnv = {
    APP_ENV: 'dev',
    NODE_ENV: 'development',
    TRACKER_DATA_SOURCE: 'mock',
    DATABASE_URL: 'postgres://ok',
    HENRIKDEV_API_KEY: undefined,
    MINIMAX_API_KEY: undefined,
  };

  it('retorna o valor quando presente', () => {
    expect(requireEnv(baseEnv, 'DATABASE_URL')).toBe('postgres://ok');
  });

  it('lança erro explicativo citando variável, ambiente e remediação via Infisical (dev)', () => {
    expect(() => requireEnv(baseEnv, 'HENRIKDEV_API_KEY')).toThrowError(
      /HENRIKDEV_API_KEY.*"dev".*infisical run --env=dev/s,
    );
  });

  it('remedia via painel da Vercel em produção', () => {
    const prodEnv: AppEnv = { ...baseEnv, APP_ENV: 'prod', NODE_ENV: 'production' };

    expect(() => requireEnv(prodEnv, 'MINIMAX_API_KEY')).toThrowError(/Vercel/);
  });

  it('orienta uso de mocks no ambiente de teste', () => {
    const testEnv: AppEnv = { ...baseEnv, APP_ENV: 'test', NODE_ENV: 'test' };

    expect(() => requireEnv(testEnv, 'MINIMAX_API_KEY')).toThrowError(/mock/i);
  });
});
