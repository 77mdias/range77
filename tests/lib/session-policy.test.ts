import { describe, expect, it } from 'vitest';
import { SESSION_TTL_DAYS, SESSION_TTL_SECONDS } from '@/lib/session-policy';

/**
 * A copy do login promete "30 dias" ao usuário. Constante e rótulo saem da
 * mesma fonte para a promessa não divergir da configuração do Better Auth.
 */
describe('política de sessão', () => {
  it('vale 30 dias', () => {
    expect(SESSION_TTL_DAYS).toBe(30);
    expect(SESSION_TTL_SECONDS).toBe(2_592_000);
  });

  it('deriva segundos de dias sem arredondar', () => {
    expect(SESSION_TTL_SECONDS).toBe(SESSION_TTL_DAYS * 24 * 60 * 60);
    expect(SESSION_TTL_SECONDS % 86_400).toBe(0);
  });
});
