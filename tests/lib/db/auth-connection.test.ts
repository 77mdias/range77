import { describe, expect, it } from 'vitest';
import { EnvironmentValidationError } from '@/config/env';
import { createAuthDatabase } from '@/lib/db/auth-connection';

/**
 * SUITE TDD — conexão Drizzle do Better Auth (driver com transações).
 *
 * O `neon-http` do app não tem transação interativa; aqui usamos o Pool
 * WebSocket do Neon. Os testes apenas resolvem credenciais — o Pool é lazy
 * e nenhum socket é aberto.
 */

describe('createAuthDatabase', () => {
  it('usa AUTH_DATABASE_URL quando presente (pooler dedicado de auth)', () => {
    const db = createAuthDatabase({
      APP_ENV: 'test',
      AUTH_DATABASE_URL: 'postgres://pooler/neondb',
    });
    expect(typeof db.select).toBe('function');
    expect(typeof db.transaction).toBe('function');
  });

  it('cai para DATABASE_URL na ausência de AUTH_DATABASE_URL', () => {
    const db = createAuthDatabase({
      APP_ENV: 'test',
      DATABASE_URL: 'postgres://direct/neondb',
    });
    expect(typeof db.select).toBe('function');
  });

  it('falha rápido (fail fast) sem nenhuma credencial de banco', () => {
    expect(() => createAuthDatabase({ APP_ENV: 'dev' })).toThrow(EnvironmentValidationError);
  });
});
