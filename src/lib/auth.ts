import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { loadAppEnv, requireEnv, type EnvSource } from '@/config/env';
import { createAuthDatabase, type AuthDatabase } from '@/lib/db/auth-connection';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '@/lib/validation/credentials';
import { SESSION_TTL_SECONDS } from '@/lib/session-policy';
import { schema } from '@/lib/db/schema';

/**
 * Fábrica do Better Auth (Google + Discord + email/senha).
 * ======================================================================
 * - DIP: `createAuth(db, env)` é puro/injetável — os testes passam fakes e
 *   rodam sem rede/DB; a instância de produção nasce de `getAuth()`.
 * - Fail fast: `BETTER_AUTH_SECRET` e `BETTER_AUTH_URL` são exigidos na
 *   resolução (remediação citada por ambiente).
 * - Provedores sociais são OPCIONAIS por credencial: dev pode configurar
 *   só Discord (ou só Google) sem quebrar o boot.
 * - Login manual por email+senha (`emailAndPassword`): os limites de senha
 *   vêm do módulo de validação compartilhado com os formulários — nunca
 *   divergem entre cliente e servidor.
 * - `nextCookies()` é o ÚLTIMO plugin (exigência da doc p/ Server Actions).
 */

export interface SocialProviderCredentials {
  readonly clientId: string;
  readonly clientSecret: string;
}

export interface ResolvedAuthEnv {
  readonly baseURL: string;
  readonly secret: string;
  readonly google?: SocialProviderCredentials | undefined;
  readonly discord?: SocialProviderCredentials | undefined;
}

function socialProvider(
  clientId: string | undefined,
  clientSecret: string | undefined,
): SocialProviderCredentials | undefined {
  if (clientId === undefined || clientSecret === undefined) {
    return undefined;
  }
  return { clientId, clientSecret };
}

export function resolveAuthEnv(source: EnvSource = process.env): ResolvedAuthEnv {
  const env = loadAppEnv(source);
  return {
    secret: requireEnv(env, 'BETTER_AUTH_SECRET'),
    baseURL: requireEnv(env, 'BETTER_AUTH_URL'),
    google: socialProvider(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET),
    discord: socialProvider(env.DISCORD_CLIENT_ID, env.DISCORD_CLIENT_SECRET),
  };
}

export type ValCoachAuth = ReturnType<typeof createAuth>;

export function createAuth(db: AuthDatabase, authEnv: ResolvedAuthEnv) {
  return betterAuth({
    secret: authEnv.secret,
    baseURL: authEnv.baseURL,
    database: drizzleAdapter(db, { provider: 'pg', schema }),
    socialProviders: {
      ...(authEnv.google !== undefined ? { google: authEnv.google } : {}),
      ...(authEnv.discord !== undefined ? { discord: authEnv.discord } : {}),
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: PASSWORD_MIN_LENGTH,
      maxPasswordLength: PASSWORD_MAX_LENGTH,
      requireNameAndEmail: true,
    },
    // 30 dias é a promessa do checkbox "manter sessão" (Stitch tela 7).
    // Better Auth aceita SEGUNDOS; default da lib: 7 dias.
    session: { expiresIn: SESSION_TTL_SECONDS },
    plugins: [nextCookies()],
  });
}

let authInstance: Promise<ValCoachAuth> | null = null;

/**
 * Instância singleton (lazy) para produção: resolve env/DB no PRIMEIRO uso.
 * Isso mantém o build do Next livre de exigência de credenciais (o módulo
 * da rota só toca no env quando a primeira requisição de auth chega).
 */
export function getAuth(): Promise<ValCoachAuth> {
  authInstance ??= (async () => createAuth(createAuthDatabase(), resolveAuthEnv()))();
  return authInstance;
}
