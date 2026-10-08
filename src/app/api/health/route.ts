import { NextResponse } from 'next/server';
import { connection } from 'next/server';
import { loadAppEnv } from '@/config/env';

/**
 * Health check — rota de fumaça do container/Vercel.
 *
 * Next 16 + Cache Components: `await connection()` substitui o legado
 * `export const dynamic = 'force-dynamic'`, marcando dependência explícita
 * do request-time (o ambiente é lido em runtime, nunca em build).
 */
export async function GET() {
  await connection();

  const env = loadAppEnv();

  return NextResponse.json({
    status: 'ok',
    service: 'valcoach-ai',
    environment: env.APP_ENV,
    timestamp: new Date().toISOString(),
  });
}
