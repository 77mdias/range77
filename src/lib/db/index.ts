import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { loadAppEnv, requireEnv, type EnvSource } from '@/config/env';
import { schema } from './schema';

/**
 * Client Drizzle sobre o driver HTTP do Neon (serverless-native: uma
 * requisição HTTP por query, sem pool TCP — ideal para Vercel + Route
 * Handlers).
 *
 * `DATABASE_URL` é exigida apenas NO MOMENTO da criação (fail fast via
 * requireEnv, com remediação por ambiente) — importar este módulo é
 * gratuito para os testes que injetam stores falsos.
 */

export type ValCoachDatabase = ReturnType<typeof createDatabase>;

export function createDatabase(source: EnvSource = process.env) {
  const connectionString = requireEnv(loadAppEnv(source), 'DATABASE_URL');
  return drizzle(neon(connectionString), { schema });
}
