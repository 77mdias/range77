# ValCoach AI

API de coaching estatístico para Valorant. O backend faz todo o *heavy lifting*
de cálculo e entrega ao chatbot (MiniMax) um JSON mastigado em três camadas —
a IA de baixo custo nunca toca dados brutos da HenrikDev.

## Arquitetura da resposta (contrato de 3 camadas)

Toda agregação para o chatbot retorna um `CoachInsight` (`src/contracts/coach.ts`):

1. **`raw_metrics`** — números exatos calculados (ex: `hsPercentage: 28.5`);
2. **`contextual_rating`** — classificação semântica por faixas/benchmarks do
   Valorant (`Crítico` → `Excelente`);
3. **`coaching_hooks`** — strings pré-calculadas pelo backend que guiam a IA
   (o que sugerir, como responder).

## Ambientes

| Ambiente `APP_ENV` | Onde roda | Segredos |
|---|---|---|
| `test` | Vitest local/CI | Nenhum — serviços externos 100% mockados |
| `dev` | Container Docker local (Node 20.9+) | Injetados pelo **Infisical da máquina hospedeira** |
| `prod` *(futuro)* | Vercel | Configurados manualmente no painel |

**Não existe (nem pode existir) nenhum arquivo `.env` neste repositório.**
`.gitignore` e `.dockerignore` bloqueiam `.env*`. O código lê estritamente
`process.env.VARIABLE_NAME` — compatibilidade nativa com a Vercel.

### Variáveis

| Variável | Uso |
|---|---|
| `APP_ENV` | Ambiente canônico (`dev` \| `test` \| `prod`). Precedência sobre `NODE_ENV` |
| `NODE_ENV` | Derivado de `APP_ENV` quando ausente |
| `DATABASE_URL` | Neon Postgres (Drizzle ORM, driver `neon-http`) |
| `HENRIKDEV_API_KEY` | API externa de dados de Valorant |
| `MINIMAX_API_KEY` | Chatbot MiniMax |

## Desenvolvimento local (Docker + Infisical outside-in)

Pré-requisitos na **máquina hospedeira**: Docker e CLI do Infisical autenticada
(workspace já vinculado via `.infisical.json`).

```bash
# Na máquina hospedeira — o Infisical injeta as variáveis na sessão do compose:
infisical run --env=dev -- docker compose up --build
```

Como funciona: `environment:` do `docker-compose.yml` lista as chaves **sem
valor**; o Compose resolve cada uma do shell criado pelo `infisical run` e
omite silenciosamente as ausentes. Nada é persistido em arquivo.

- App: http://localhost:3000
- Smoke test: `GET /api/health` → `{ status, service, environment, timestamp }`

## Testes (TDD estrito)

Pipeline obrigatório por funcionalidade: **(1)** contratos de tipagem →
**(2)** suite Vitest (sucesso, erro de API externa, dados nulos) →
**(3)** implementação → **(4)** validação/refactor.

```bash
npm run test            # suite completa
npm run test:watch      # modo watch
npm run test:coverage   # cobertura (services/analytics exige 100%)
npm run typecheck       # tsc --noEmit (strict + noUncheckedIndexedAccess)
```

Os testes rodam dentro do container (`docker compose exec web npm test`) ou no
host — o ambiente `test` não depende de credenciais reais.

## Stack

- **Next.js 16.4** (App Router, Turbopack, Cache Components: `cacheComponents`
  + `partialPrefetching`; rotas dinâmicas via `await connection()`)
- **React 19.3** (View Transitions, Fragment Refs, Activity — nas telas do app)
- **TypeScript 5.9** strict (`noUncheckedIndexedAccess`)
- **Drizzle ORM** + Neon Postgres (driver `neon-http`, serverless-native)
- **Vitest 4** (100% de cobertura exigida em `src/services/analytics/**`)

## Estrutura

```
src/
├── app/
│   ├── api/health/route.ts   # smoke test (await connection())
│   ├── layout.tsx / page.tsx
├── config/env.ts             # ambientes (test|dev|prod) + requireEnv fail-fast
├── contracts/coach.ts        # envelope de 3 camadas + erros da API
├── lib/db/                   # client Drizzle + schema (Neon)
└── services/                 # analytics (cálculo puro) + henrikdev (client)
tests/
└── config/env.test.ts        # suite TDD do módulo de ambientes
```

## Produção (futuro)

Deploy na **Vercel** com variáveis configuradas manualmente no painel
(Settings → Environment Variables): `APP_ENV=prod`, `DATABASE_URL`,
`HENRIKDEV_API_KEY`, `MINIMAX_API_KEY`. A resolução de dependências em
Docker/CI/Vercel usa o `package-lock.json` (next@16.4.0 já travado).
