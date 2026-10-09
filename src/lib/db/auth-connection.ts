import { neonConfig, Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { WebSocket as NodeWebSocket } from 'ws';
import { loadAppEnv, requireEnv, type EnvSource } from '@/config/env';
import { schema } from './schema';

/**
 * Conexão Drizzle dedicada ao Better Auth.
 * ======================================================================
 * O `neon-http` do app (`./index.ts`) faz UMA requisição HTTP por query e
 * NÃO tem transação interativa — o adapter do Better Auth precisa de
 * `db.transaction()`. Aqui usamos o driver WebSocket do Neon (`Pool` de
 * `@neondatabase/serverless`), que suporta transações.
 *
 * - `AUTH_DATABASE_URL` (opcional) aponta para o pooler `-pooler` quando o
 *   dono quiser separar as conexões de auth; fallback: `DATABASE_URL`.
 * - Node < 21 não tem `WebSocket` nativo → registramos o `ws` no neonConfig.
 *   Este módulo só é importado pelo Better Auth (rotas de Node runtime).
 */

export type AuthDatabase = ReturnType<typeof createAuthDatabase>;

if (typeof globalThis.WebSocket === 'undefined') {
  neonConfig.webSocketConstructor = NodeWebSocket as unknown as typeof WebSocket;
}

export function createAuthDatabase(source: EnvSource = process.env) {
  const env = loadAppEnv(source);
  const connectionString = env.AUTH_DATABASE_URL ?? requireEnv(env, 'DATABASE_URL');
  // O Pool conecta sob demanda (lazy) — criar a instância não abre socket.
  return drizzle(new Pool({ connectionString }), { schema });
}
