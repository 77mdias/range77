# Deploy

O ambiente de produção é a **Vercel** (fase futura). O `dev` roda em Docker
local; não há deploy automatizado configurado no repositório.

## Dockerfile

Imagem de **desenvolvimento** (`node:20-alpine`):

- `NEXT_TELEMETRY_DISABLED=1`, `apk add libc6-compat`;
- `chown node:node /app` (permite `npm install` como `node`);
- copia `package.json` + lock e roda `npm install` como `node`;
- `COPY --chown=node:node . .`, cria `/app/.next`, `EXPOSE 3000`,
  `CMD ["npm", "run", "dev"]`;
- **nenhuma credencial é copiada** (fluxo outside-in via Infisical).

`.dockerignore` exclui `.git`, `node_modules`, `.next`, `coverage`,
`*.tsbuildinfo`, `.env*`, `.infisical.json`.

## Vercel (prod)

1. Configurar as variáveis manualmente no painel (Settings → Environment
   Variables): `APP_ENV=prod`, `DATABASE_URL`, `HENRIKDEV_API_KEY`,
   `MINIMAX_API_KEY`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, provedores
   sociais e, se aplicável, `AUTH_DATABASE_URL`.
2. Build: `npm run build` (Next 16 com Turbopack). O build **não** exige
   credenciais — env/DB são resolvidos lazy no primeiro uso.
3. Driver do Neon é `neon-http` (serverless); o auth usa o pool WebSocket.
   Em ambiente serverless, prefira `AUTH_DATABASE_URL` apontando para o pooler.
4. Migrações continuam sendo aplicadas explicitamente
   (`db:migrate`) com `DATABASE_URL` de produção.

## Healthcheck

`GET /api/health` responde
`{ status: 'ok', service: 'valcoach-ai', environment, timestamp }` usando
`await connection()`. O Compose usa esse endpoint no healthcheck.

## Checklist de release

- [ ] `npm run test:coverage` verde (analytics 100%).
- [ ] `npm run typecheck` limpo.
- [ ] `npm run build` passa.
- [ ] Migrações geradas/aplicadas quando o schema mudou.
- [ ] Variáveis de produção revisadas (todos os pontos da cadeia).
- [ ] Sem segredos em código/logs.

Ver [variáveis de ambiente](../desenvolvimento/variaveis-de-ambiente.md).
