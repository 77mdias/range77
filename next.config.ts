import type { NextConfig } from 'next';

/**
 * ValCoach AI — configuração Next.js 16.4
 *
 * - `cacheComponents`: modelo estável de Cache Components (diretriz "use cache"
 *   + cacheTag/cacheLife). Route Handlers dinâmicos usam `await connection()`.
 * - `partialPrefetching`: explicitado para evitar warnings do novo modelo.
 * - Turbopack é o bundler padrão do Next 16 — nenhuma config de Webpack legado.
 */
const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Better Auth empacota código de servidor pesado (Kysely/jose) — precisa
  // ficar fora do bundle do Turbopack (exigência da doc de integração Next).
  serverExternalPackages: ['better-auth'],
};

export default nextConfig;
