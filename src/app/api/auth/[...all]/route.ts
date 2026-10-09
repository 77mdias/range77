import { getAuth } from '@/lib/auth';

/**
 * HANDLER: /api/auth/[...all] (Better Auth).
 *
 * Next 16 App Router: monta o handler do Better Auth para GET/POST.
 * A instância nasce LAZY no primeiro uso (env + conexão WebSocket com
 * transações) — o `next build` não exige credenciais de auth.
 */

async function handle(request: Request): Promise<Response> {
  const auth = await getAuth();
  return auth.handler(request);
}

export async function GET(request: Request): Promise<Response> {
  return handle(request);
}

export async function POST(request: Request): Promise<Response> {
  return handle(request);
}
