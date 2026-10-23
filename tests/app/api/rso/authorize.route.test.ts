import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * SUITE — GET /api/rso/authorize (início do RSO simulado).
 */

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT: ${url}`);
  },
}));
const cookieStore = vi.hoisted(() => ({ set: vi.fn(), get: vi.fn(), delete: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: async () => cookieStore }));
const session = vi.hoisted(() => ({ getSessionFromHeaders: vi.fn() }));
vi.mock('@/lib/session', () => session);

import { GET } from '@/app/api/rso/authorize/route';

const req = (query: string): Request => new Request(`http://localhost/api/rso/authorize${query}`);

beforeEach(() => {
  cookieStore.set.mockReset();
  session.getSessionFromHeaders.mockReset().mockResolvedValue({ user: { id: 'user-1' } });
});

describe('GET /api/rso/authorize', () => {
  it('sem sessão → login com next de volta para o authorize', async () => {
    session.getSessionFromHeaders.mockResolvedValue(null);
    await expect(GET(req('?region=br'))).rejects.toThrow(
      `NEXT_REDIRECT: /login?next=${encodeURIComponent('/api/rso/authorize?region=br')}`,
    );
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it('falha de auth → login (fail-closed)', async () => {
    session.getSessionFromHeaders.mockRejectedValue(new Error('db down'));
    await expect(GET(req('?region=br'))).rejects.toThrow('NEXT_REDIRECT: /login?next=');
  });

  it.each(['', '?region=xx', '?region=BR%20'])('região inválida (%j) → rso=error', async (q) => {
    await expect(GET(req(q))).rejects.toThrow('NEXT_REDIRECT: /dashboard/settings?rso=error');
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it('grava cookie de state e redireciona para o consentimento', async () => {
    const error = await GET(req('?region=BR')).catch((e: Error) => e);
    expect(cookieStore.set).toHaveBeenCalledTimes(1);
    const [name, state, options] = cookieStore.set.mock.calls[0] as [string, string, Record<string, unknown>];
    expect(name).toBe('rso_state');
    expect(state).toMatch(/^[\w-]{43}$/);
    expect(options).toMatchObject({ httpOnly: true, sameSite: 'lax', maxAge: 600, path: '/' });
    expect(String(error)).toContain(`NEXT_REDIRECT: /rso/consent?state=${state}&region=br`);
  });

  it('state é aleatório a cada chamada', async () => {
    await GET(req('?region=br')).catch(() => undefined);
    await GET(req('?region=br')).catch(() => undefined);
    const [a, b] = cookieStore.set.mock.calls.map((call) => call[1]);
    expect(a).not.toBe(b);
  });
});
