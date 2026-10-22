import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RSO_CODE_TTL_MS, fictitiousAccountForUser, signRsoCode } from '@/lib/rso/mock-provider';

/**
 * SUITE — GET /api/rso/callback (Review Focus 3: nada é gravado em falha).
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
const cookieStore = vi.hoisted(() => ({ set: vi.fn(), get: vi.fn(), delete: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: async () => cookieStore }));
const session = vi.hoisted(() => ({ getSessionFromHeaders: vi.fn() }));
vi.mock('@/lib/session', () => session);
const upsert = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db/user-riot-store', () => ({ getUserRiotStore: () => ({ upsert }) }));

import { GET } from '@/app/api/rso/callback/route';

const STATE = 'state-abc';
const account = fictitiousAccountForUser('user-1', 'br');
const validCode = (over: Partial<{ userId: string; puuid: string; region: string; exp: number }> = {}, secret = SECRET) =>
  signRsoCode(
    { userId: 'user-1', puuid: account.puuid, region: 'br', exp: Date.now() + RSO_CODE_TTL_MS, ...over },
    secret,
  );
const req = (code: string, state = STATE): Request =>
  new Request(
    `http://localhost/api/rso/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
  );

const ERROR = 'NEXT_REDIRECT: /dashboard/settings?rso=error';

beforeEach(() => {
  upsert.mockReset().mockResolvedValue(undefined);
  cookieStore.get.mockReset().mockReturnValue({ name: 'rso_state', value: STATE });
  cookieStore.delete.mockReset();
  session.getSessionFromHeaders.mockReset().mockResolvedValue({ user: { id: 'user-1' } });
});

describe('GET /api/rso/callback', () => {
  it('caminho feliz → upsert rso_mock, apaga cookie, rso=linked', async () => {
    await expect(GET(req(validCode()))).rejects.toThrow('NEXT_REDIRECT: /dashboard/settings?rso=linked');
    expect(upsert).toHaveBeenCalledWith({
      userId: 'user-1',
      region: 'br',
      nameKey: (account.gameName ?? '').toLowerCase(),
      tagKey: 'br1',
      displayName: `${account.gameName}#BR1`,
      puuid: account.puuid,
      linkedVia: 'rso_mock',
    });
    expect(cookieStore.delete).toHaveBeenCalledWith('rso_state');
  });

  it('cookie de state ausente → error', async () => {
    cookieStore.get.mockReturnValue(undefined);
    await expect(GET(req(validCode()))).rejects.toThrow(ERROR);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('state diferente do cookie → error', async () => {
    await expect(GET(req(validCode(), 'outro'))).rejects.toThrow(ERROR);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('state ausente na query → error', async () => {
    await expect(GET(new Request(`http://localhost/api/rso/callback?code=${validCode()}`))).rejects.toThrow(ERROR);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('code adulterado → error', async () => {
    await expect(GET(req(validCode({}, 'segredo-errado')))).rejects.toThrow(ERROR);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('code expirado → error', async () => {
    await expect(GET(req(validCode({ exp: Date.now() - 1 })))).rejects.toThrow(ERROR);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('usuário da sessão ≠ code.userId → error', async () => {
    session.getSessionFromHeaders.mockResolvedValue({ user: { id: 'user-2' } });
    await expect(GET(req(validCode()))).rejects.toThrow(ERROR);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('sem sessão → error', async () => {
    session.getSessionFromHeaders.mockResolvedValue(null);
    await expect(GET(req(validCode()))).rejects.toThrow(ERROR);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('puuid do code ≠ conta do usuário → error', async () => {
    await expect(GET(req(validCode({ puuid: 'outro-puuid' })))).rejects.toThrow(ERROR);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('região inválida no code → error', async () => {
    await expect(GET(req(validCode({ region: 'xx' })))).rejects.toThrow(ERROR);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('puuid já vinculado a outro usuário (unique) → error sem crash', async () => {
    upsert.mockRejectedValue(new Error('duplicate key value violates unique constraint'));
    await expect(GET(req(validCode()))).rejects.toThrow(ERROR);
  });
});
