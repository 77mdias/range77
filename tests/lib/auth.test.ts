import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EnvironmentValidationError } from '@/config/env';

/**
 * SUITE TDD — fábrica do Better Auth (DIP: db + env injetáveis).
 *
 * `betterAuth`/`drizzleAdapter`/`nextCookies` são mockados: as asserções
 * verificam as OPÇÕES passadas (adapter pg, provedores sociais, ordem dos
 * plugins) sem instanciar o runtime real do Better Auth.
 */

vi.mock('better-auth', () => ({
  betterAuth: vi.fn(() => ({ handler: async () => new Response('ok') })),
}));
vi.mock('better-auth/adapters/drizzle', () => ({
  drizzleAdapter: vi.fn(() => 'DRIZZLE_ADAPTER'),
}));
vi.mock('better-auth/next-js', () => ({ nextCookies: vi.fn(() => 'NEXT_COOKIES') }));

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { createAuth, resolveAuthEnv } from '@/lib/auth';

const fakeDb = { select: async () => [] } as never;

interface CapturedOptions {
  secret?: string;
  baseURL?: string;
  socialProviders?: Record<string, unknown>;
  plugins?: unknown[];
}

const lastOptions = (): CapturedOptions =>
  vi.mocked(betterAuth).mock.calls.at(-1)?.[0] as CapturedOptions;

describe('resolveAuthEnv', () => {
  it('exige BETTER_AUTH_SECRET e BETTER_AUTH_URL (fail fast com remediação)', () => {
    expect(() => resolveAuthEnv({ APP_ENV: 'dev' })).toThrow(EnvironmentValidationError);
    expect(() => resolveAuthEnv({ APP_ENV: 'dev', BETTER_AUTH_SECRET: 's' })).toThrow(
      /BETTER_AUTH_URL/,
    );
  });

  it('resolve provedores configurados e omite credenciais ausentes', () => {
    const env = resolveAuthEnv({
      APP_ENV: 'dev',
      BETTER_AUTH_SECRET: 'secret-dev',
      BETTER_AUTH_URL: 'http://localhost:3000',
      GOOGLE_CLIENT_ID: 'g-id',
      GOOGLE_CLIENT_SECRET: 'g-secret',
      DISCORD_CLIENT_ID: 'd-id',
      DISCORD_CLIENT_SECRET: 'd-secret',
    });

    expect(env.baseURL).toBe('http://localhost:3000');
    expect(env.google).toEqual({ clientId: 'g-id', clientSecret: 'g-secret' });
    expect(env.discord).toEqual({ clientId: 'd-id', clientSecret: 'd-secret' });
  });

  it('descarta provedor com credencial pela metade (boot nunca quebra)', () => {
    const env = resolveAuthEnv({
      APP_ENV: 'dev',
      BETTER_AUTH_SECRET: 's',
      BETTER_AUTH_URL: 'http://localhost:3000',
      GOOGLE_CLIENT_ID: 'apenas-id',
    });

    expect(env.google).toBeUndefined();
    expect(env.discord).toBeUndefined();
  });
});

describe('createAuth', () => {
  beforeEach(() => {
    vi.mocked(betterAuth).mockClear();
    vi.mocked(drizzleAdapter).mockClear();
  });

  it('configura adapter pg com nosso schema e ambos os provedores', () => {
    createAuth(fakeDb, {
      secret: 'secret-dev',
      baseURL: 'http://localhost:3000',
      google: { clientId: 'g', clientSecret: 'gs' },
      discord: { clientId: 'd', clientSecret: 'ds' },
    });

    expect(vi.mocked(drizzleAdapter)).toHaveBeenCalledWith(
      fakeDb,
      expect.objectContaining({ provider: 'pg' }),
    );

    const options = lastOptions();
    expect(options.secret).toBe('secret-dev');
    expect(options.baseURL).toBe('http://localhost:3000');
    expect(options.socialProviders).toEqual({
      google: { clientId: 'g', clientSecret: 'gs' },
      discord: { clientId: 'd', clientSecret: 'ds' },
    });
  });

  it('nextCookies é o ÚLTIMO plugin (exigência da doc p/ Server Actions)', () => {
    createAuth(fakeDb, { secret: 's', baseURL: 'u' });
    expect(lastOptions().plugins).toEqual(['NEXT_COOKIES']);
  });

  it('omite socialProviders quando nenhum provedor está configurado', () => {
    createAuth(fakeDb, { secret: 's', baseURL: 'u' });
    expect(lastOptions().socialProviders).toEqual({});
  });
});
