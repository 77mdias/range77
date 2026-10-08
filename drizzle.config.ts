import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle Kit — migrações do Neon Postgres.
 *
 * `DATABASE_URL` nunca é lido de arquivo local: no dev ele é injetado na
 * sessão do shell pela CLI do Infisical (host) e chega ao drizzle-kit por
 * `process.env`; em produção o valor vem do painel da Vercel.
 */
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
});
