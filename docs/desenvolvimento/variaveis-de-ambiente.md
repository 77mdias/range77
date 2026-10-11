# Variáveis de ambiente

**Não existe (nem pode existir) arquivo `.env` neste repositório.** `.gitignore`
e `.dockerignore` bloqueiam `.env*`; o código lê estritamente
`process.env.VARIABLE_NAME` (compatibilidade nativa com a Vercel).

## Tabela de variáveis

| Variável | Obrigatória? | Uso |
| --- | --- | --- |
| `APP_ENV` | sim* | ambiente canônico (`dev \| test \| prod`), precedência sobre `NODE_ENV` |
| `NODE_ENV` | — | derivado de `APP_ENV` quando ausente |
| `DATABASE_URL` | fail-fast | Neon Postgres (Drizzle + driver `neon-http`) |
| `HENRIKDEV_API_KEY` | fail-fast | API externa de dados de Valorant |
| `MINIMAX_API_KEY` | fail-fast | chatbot MiniMax |
| `BETTER_AUTH_SECRET` | fail-fast | segredo do Better Auth |
| `BETTER_AUTH_URL` | fail-fast | URL base do auth (`http://localhost:3000` em dev) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | opcionais (par) | login Google |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | opcionais (par) | login Discord |
| `AUTH_DATABASE_URL` | opcional | pooler dedicado p/ transações do auth (fallback `DATABASE_URL`) |

\* `APP_ENV`/`NODE_ENV` são resolvidos com precedência `APP_ENV` > mapeamento de
`NODE_ENV` > erro — ambiente desconhecido **nunca** vira `dev`.

"Fail-fast" (`RequiredEnvVar`) significa que a variável só é exigida no **ponto
de uso**, via `requireEnv` (`src/config/env.ts`) — importar o módulo não exige
credencial. Ex.: um *hit* de cache de partida não precisa de
`HENRIKDEV_API_KEY`.

## A cadeia completa (novo segredo)

`infisical run` injeta os segredos **no shell do host**, não no container. Uma
variável nova só chega ao Node se percorrer **todos** estes pontos:

1. **Infisical (`dev`)** — o dono configura no painel/CLI. O agente **não** roda
   `infisical secrets*`/`export*` (bloqueado no host) — **avisar o dono**.
2. **`src/config/env.ts`** — adicionar ao snapshot `AppEnv`
   (`pickDefined(source['VAR'])`) e, se for fail-fast, ao tipo
   `RequiredEnvVar`.
3. **`docker-compose.yml` → `services.web.environment`** — adicionar a entrada
   pass-through **sem valor** (`- MINHA_VAR`). **Esquecer este ponto produz
   `CONFIG_ERROR` no container mesmo com o Infisical injetando.**
4. **Vercel (prod)** — configuração manual no painel, quando a fase entrar em
   produção.

## Remediação

`requireEnv` emite uma mensagem por ambiente (`REMEDIATION_HINT`):

- `dev` → CLI do Infisical na máquina hospedeira;
- `test` → usar mocks (o ambiente de teste não depende de credenciais reais);
- `prod` → painel da Vercel (Settings → Environment Variables).

## `test`

`vitest.setup.ts` define `process.env.APP_ENV ??= 'test'` — nenhum segredo
real; serviços externos 100% mockados.

Ver também [autenticação](../arquitetura/autenticacao.md) e
[deploy](../operacao/deploy.md).
