import { createHmac, timingSafeEqual } from 'node:crypto';
import { HENRIKDEV_AFFINITIES, type HenrikDevAffinity } from '@/contracts/henrikdev';
import type { RiotAccountDto } from '@/contracts/riot';
import { MOCK_ROSTER, createRng, generateAccount } from '@/services/riot/mock';
import { seedOf } from '@/services/riot/mock/rng';

/**
 * Provedor RSO SIMULADO. Modelado como OAuth real: o `code` é opaco para o
 * cliente e só o "provedor" o valida. Trocar pelo RSO real = trocar a URL do
 * provedor (authorize) e `verifyRsoCode` + `fictitiousAccountForUser` pela
 * troca code→token + `GET /riot/account/v1/accounts/me`.
 */

/** Escopos pedidos — [a confirmar] no portal da Riot (spec §5). */
export const RSO_SCOPES = ['openid', 'cpid', 'offline_access'] as const;

export const RSO_STATE_COOKIE = 'rso_state';
export const RSO_STATE_MAX_AGE_S = 600;
export const RSO_CODE_TTL_MS = 5 * 60_000;

export interface RsoCodePayload {
  readonly userId: string;
  readonly puuid: string;
  readonly region: string;
  readonly exp: number;
}

export function isRsoRegion(value: unknown): value is HenrikDevAffinity {
  return (HENRIKDEV_AFFINITIES as readonly unknown[]).includes(value);
}

/**
 * Conta fictícia do usuário: 1ª palavra de um nome do roster + 4 dígitos
 * (cabe nos 16 caracteres do Riot ID), tag `BR1`/`NA1`... O puuid sai do
 * mesmo gerador da fonte mock, então o perfil simulado bate com o vínculo.
 */
export function fictitiousAccountForUser(userId: string, region: string): RiotAccountDto {
  const rng = createRng(seedOf('rso-account', userId));
  const prefix = rng.pick(MOCK_ROSTER).gameName.split(' ')[0] as string;
  return generateAccount(`${prefix}${rng.int(1000, 9999)}`, `${region.toUpperCase()}1`);
}

const hmac = (data: string, secret: string): Buffer =>
  createHmac('sha256', secret).update(data).digest();

export function signRsoCode(payload: RsoCodePayload, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${hmac(body, secret).toString('base64url')}`;
}

/** Payload do `code` se a assinatura confere e `now < exp`; senão `null`. */
export function verifyRsoCode(code: string, secret: string, now: number): RsoCodePayload | null {
  const parts = code.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts as [string, string];
  const expected = hmac(body, secret);
  const given = Buffer.from(sig, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  const p = parsed as Partial<RsoCodePayload> | null;
  if (
    typeof p?.userId !== 'string' ||
    typeof p.puuid !== 'string' ||
    typeof p.region !== 'string' ||
    typeof p.exp !== 'number' ||
    now >= p.exp
  ) {
    return null;
  }
  return { userId: p.userId, puuid: p.puuid, region: p.region, exp: p.exp };
}
