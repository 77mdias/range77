import { describe, expect, it } from 'vitest';
import {
  RSO_CODE_TTL_MS,
  RSO_SCOPES,
  fictitiousAccountForUser,
  signRsoCode,
  verifyRsoCode,
} from '@/lib/rso/mock-provider';
import { DEMO_ACCOUNT, generateAccount } from '@/services/riot/mock';

const SECRET = 'test-secret-de-teste-com-tamanho-suficiente';
const NOW = 1_800_000_000_000;
const payload = { userId: 'user-1', puuid: 'p-1', region: 'br', exp: NOW + RSO_CODE_TTL_MS };

describe('fictitiousAccountForUser', () => {
  it('é determinística por usuário e região', () => {
    expect(fictitiousAccountForUser('user-1', 'br')).toEqual(fictitiousAccountForUser('user-1', 'br'));
  });

  it('difere entre usuários', () => {
    const a = fictitiousAccountForUser('user-1', 'br');
    const b = fictitiousAccountForUser('user-2', 'br');
    expect(a.puuid).not.toBe(b.puuid);
    expect(a.gameName).not.toBe(b.gameName);
  });

  it('nome = prefixo do roster + 4 dígitos; tag = REGIÃO + 1; puuid do gerador', () => {
    const account = fictitiousAccountForUser('user-1', 'na');
    expect(account.gameName).toMatch(/^\p{L}+\d{4}$/u);
    expect((account.gameName ?? '').length).toBeLessThanOrEqual(16);
    expect(account.tagLine).toBe('NA1');
    expect(account.puuid).toBe(generateAccount(account.gameName ?? '', 'NA1').puuid);
  });

  it('nunca colide com a conta demo', () => {
    for (let i = 0; i < 200; i += 1) {
      expect(fictitiousAccountForUser(`u-${i}`, 'br').tagLine).not.toBe(DEMO_ACCOUNT.tagLine);
    }
  });
});

describe('signRsoCode / verifyRsoCode', () => {
  it('ida e volta devolve o payload', () => {
    expect(verifyRsoCode(signRsoCode(payload, SECRET), SECRET, NOW)).toEqual(payload);
  });

  it('código expirado → null', () => {
    expect(verifyRsoCode(signRsoCode(payload, SECRET), SECRET, payload.exp)).toBeNull();
  });

  it('assinatura com outro segredo → null', () => {
    expect(verifyRsoCode(signRsoCode(payload, 'outro-segredo'), SECRET, NOW)).toBeNull();
  });

  it('payload adulterado → null', () => {
    const [, sig] = signRsoCode(payload, SECRET).split('.');
    const forged = Buffer.from(JSON.stringify({ ...payload, userId: 'atacante' })).toString('base64url');
    expect(verifyRsoCode(`${forged}.${sig}`, SECRET, NOW)).toBeNull();
  });

  it.each(['', 'sem-ponto', 'a.b.c', '.', 'e30.xx'])('código malformado %j → null', (code) => {
    expect(verifyRsoCode(code, SECRET, NOW)).toBeNull();
  });

  it('payload assinado com forma inválida → null', () => {
    const bad = signRsoCode({ ...payload, exp: 'amanhã' } as never, SECRET);
    expect(verifyRsoCode(bad, SECRET, NOW)).toBeNull();
  });

  it('escopos pedidos', () => {
    expect(RSO_SCOPES).toEqual(['openid', 'cpid', 'offline_access']);
  });
});
