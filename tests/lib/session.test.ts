import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * SUITE TDD — `@/lib/session`.
 *
 * `getSessionFromHeaders` é o núcleo extraído para o fail-soft (recebe os
 * headers já resolvidos). `getSession` mantém o contrato original: resolve
 * `headers()` PRIMEIRO (sinal de dinâmico do Cache Components) e delega.
 * `getAuth`/`headers` são mockados — nenhuma rede/DB.
 */

const mocks = vi.hoisted(() => ({
  getAuth: vi.fn(),
  headers: vi.fn(),
  apiGetSession: vi.fn(),
}));

vi.mock('next/headers', () => ({ headers: mocks.headers }));
vi.mock('@/lib/auth', () => ({ getAuth: mocks.getAuth }));

import { getSession, getSessionFromHeaders } from '@/lib/session';

const RESOLVED = new Headers({ 'x-test': '1' });

describe('getSessionFromHeaders', () => {
  beforeEach(() => {
    mocks.getAuth.mockReset();
    mocks.apiGetSession.mockReset();
    mocks.getAuth.mockResolvedValue({ api: { getSession: mocks.apiGetSession } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sem sessão → null e repassa os headers resolvidos', async () => {
    mocks.apiGetSession.mockResolvedValueOnce(null);

    await expect(getSessionFromHeaders(RESOLVED)).resolves.toBeNull();
    expect(mocks.apiGetSession).toHaveBeenCalledWith({ headers: RESOLVED });
  });

  it('com sessão → achata o usuário (email/image nulos viram null)', async () => {
    mocks.apiGetSession.mockResolvedValueOnce({
      user: { id: 'u1', name: 'Ana', email: undefined, image: null },
    });

    await expect(getSessionFromHeaders(RESOLVED)).resolves.toEqual({
      user: { id: 'u1', name: 'Ana', email: null, image: null },
    });
  });

  it('propaga falhas de auth/env para o chamador decidir o fail-soft', async () => {
    mocks.getAuth.mockRejectedValueOnce(new Error('BETTER_AUTH_SECRET ausente'));

    await expect(getSessionFromHeaders(RESOLVED)).rejects.toThrow('BETTER_AUTH_SECRET ausente');
    expect(mocks.apiGetSession).not.toHaveBeenCalled();
  });
});

describe('getSession', () => {
  beforeEach(() => {
    mocks.getAuth.mockReset();
    mocks.headers.mockReset();
    mocks.apiGetSession.mockReset();
    mocks.getAuth.mockResolvedValue({ api: { getSession: mocks.apiGetSession } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolve headers() PRIMEIRO e delega ao núcleo', async () => {
    mocks.headers.mockResolvedValueOnce(RESOLVED);
    mocks.apiGetSession.mockResolvedValueOnce({
      user: { id: 'u1', name: 'Ana', email: 'a@b.c', image: 'img' },
    });

    await expect(getSession()).resolves.toEqual({
      user: { id: 'u1', name: 'Ana', email: 'a@b.c', image: 'img' },
    });
    expect(mocks.headers).toHaveBeenCalledTimes(1);
    expect(mocks.apiGetSession).toHaveBeenCalledWith({ headers: RESOLVED });
  });

  it('tolera sessão ausente sem tocar em auth se headers() lançar (sinal de dinâmico)', async () => {
    mocks.headers.mockRejectedValueOnce(new Error('dynamic usage'));

    await expect(getSession()).rejects.toThrow('dynamic usage');
    expect(mocks.getAuth).not.toHaveBeenCalled();
  });
});
