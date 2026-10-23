import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fictitiousAccountForUser, verifyRsoCode } from '@/lib/rso/mock-provider';

/**
 * SUITE — Server Actions do consentimento (provedor RSO simulado).
 */

const SECRET = 'segredo-de-teste';
vi.mock('@/config/env', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/config/env')>()),
  loadAppEnv: () => ({ BETTER_AUTH_SECRET: SECRET }),
}));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT: ${url}`);
  },
}));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
const session = vi.hoisted(() => ({ getSessionFromHeaders: vi.fn() }));
vi.mock('@/lib/session', () => session);

import { authorizeRso, denyRso } from '@/app/actions/rso';

beforeEach(() => {
  session.getSessionFromHeaders.mockReset().mockResolvedValue({ user: { id: 'user-1' } });
});

describe('authorizeRso', () => {
  it('devolve a URL do callback com code assinado para o usuário da sessão e o state', async () => {
    const url = new URL(await authorizeRso('st-1', 'br'), 'http://localhost');
    expect(url.pathname).toBe('/api/rso/callback');
    expect(url.searchParams.get('state')).toBe('st-1');
    const payload = verifyRsoCode(url.searchParams.get('code') ?? '', SECRET, Date.now());
    expect(payload).toMatchObject({
      userId: 'user-1',
      region: 'br',
      puuid: fictitiousAccountForUser('user-1', 'br').puuid,
    });
  });

  it('sem sessão → URL de rso=error', async () => {
    session.getSessionFromHeaders.mockResolvedValue(null);
    await expect(authorizeRso('st-1', 'br')).resolves.toBe('/dashboard/settings?rso=error');
  });

  it('falha de auth → URL de rso=error', async () => {
    session.getSessionFromHeaders.mockRejectedValue(new Error('db down'));
    await expect(authorizeRso('st-1', 'br')).resolves.toBe('/dashboard/settings?rso=error');
  });

  it('região inválida → URL de rso=error', async () => {
    await expect(authorizeRso('st-1', 'zz')).resolves.toBe('/dashboard/settings?rso=error');
  });
});

describe('denyRso', () => {
  it('volta para configurações com rso=denied', async () => {
    await expect(denyRso()).rejects.toThrow('NEXT_REDIRECT: /dashboard/settings?rso=denied');
  });
});
