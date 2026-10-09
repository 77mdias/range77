import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * SUITE TDD — handler /api/auth/[...all]: delega GET/POST ao `auth.handler`
 * (instância lazy — o módulo não resolve env/DB no import).
 */

const handlerMock = vi.fn(async () => new Response('auth-ok'));

vi.mock('@/lib/auth', () => ({ getAuth: vi.fn(async () => ({ handler: handlerMock })) }));

import { GET, POST } from '@/app/api/auth/[...all]/route';

describe('GET/POST /api/auth/[...all]', () => {
  beforeEach(() => {
    handlerMock.mockClear();
  });

  it('delega GET (ex.: get-session) ao handler do Better Auth', async () => {
    const request = new Request('http://localhost:3000/api/auth/get-session');

    const response = await GET(request);

    expect(await response.text()).toBe('auth-ok');
    expect(handlerMock).toHaveBeenCalledWith(request);
  });

  it('delega POST (ex.: sign-in social)', async () => {
    const request = new Request('http://localhost:3000/api/auth/sign-in/social', {
      method: 'POST',
    });

    const response = await POST(request);

    expect(await response.text()).toBe('auth-ok');
    expect(handlerMock).toHaveBeenCalledWith(request);
  });
});
