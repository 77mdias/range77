# ValCoach AI

Tracker & coach estatístico de **Valorant**: busca dados públicos na
**HenrikDev**, normaliza-os para um contrato interno estável, calcula métricas
derivadas (KAST, Rating ValCoach, ADR, entry, consistência, evolução...) e as
apresenta numa interface teleétrica (design system **Protocol Precision**).

O backend faz todo o *heavy lifting* de cálculo e entrega ao chatbot (MiniMax)
um JSON mastigado em três camadas — a IA de baixo custo nunca toca dados brutos
da HenrikDev.

> 📚 **Documentação completa:** [`docs/`](./docs/README.md) — arquitetura,
> domínio, design, desenvolvimento, operação e referência. O `README` aqui é a
> visão rápida.

## Regras de ouro

1. **Nunca fabricar dados.** Campo sem suporte → `—` ou omitido.
2. **Todo cálculo mora em `src/services/analytics/**`** — cobertura **100%**;
   componentes apenas renderizam.
3. **Zero arquivos `.env`.** Segredos via Infisical (dev) / painel Vercel (prod).

## Arquitetura da resposta (contrato de 3 camadas)

Toda agregação para o chatbot retorna um `CoachInsight` (`src/contracts/coach.ts`):

1. **`raw_metrics`** — números exatos calculados (ex: `hsPercentage: 28.5`);
2. **`contextual_rating`** — classificação semântica por faixas/benchmarks do
   Valorant (`Crítico` → `Excelente`);
3. **`coaching_hooks`** — strings pré-calculadas pelo backend que guiam a IA
   (o que sugerir, como responder).

Detalhes em [`docs/dominio/contratos.md`](./docs/dominio/contratos.md).

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
| `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` | Better Auth |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Login Google (opcional) |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | Login Discord (opcional) |
| `AUTH_DATABASE_URL` | Pooler dedicado do auth (opcional; fallback `DATABASE_URL`) |

> Nova variável exige registrar em **toda a cadeia**: Infisical (dono) →
> `src/config/env.ts` → pass-through no `docker-compose.yml` → Vercel (prod).
> Ver [`docs/desenvolvimento/variaveis-de-ambiente.md`](./docs/desenvolvimento/variaveis-de-ambiente.md).

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

Guia completo em [`docs/desenvolvimento/setup-local.md`](./docs/desenvolvimento/setup-local.md).

## Testes (TDD estrito)

Pipeline obrigatório por funcionalidade: **(1)** contratos de tipagem →
**(2)** suite Vitest (sucesso, erro de API externa, dados nulos) →
**(3)** implementação → **(4)** validação/refactor.

```bash
npm run test            # suite completa
npm run test:watch      # modo watch
npm run test:coverage   # cobertura (services/analytics exige 100%)
npm run typecheck       # tsc --noEmit (strict + noUncheckedIndexedAccess)
npm run build           # next build
```

Os testes rodam dentro do container (`docker compose exec web npm test`) ou no
host — o ambiente `test` não depende de credenciais reais. Convenções e mocks
em [`docs/desenvolvimento/testes-e-cobertura.md`](./docs/desenvolvimento/testes-e-cobertura.md).

## Stack

- **Next.js 16.4** (App Router, Turbopack, Cache Components: `cacheComponents`
  + `partialPrefetching`; rotas dinâmicas via `await connection()`)
- **React 19.3** (View Transitions, Fragment Refs, Activity — nas telas do app)
- **TypeScript 5.9** strict (`noUncheckedIndexedAccess`)
- **Tailwind CSS v4** (CSS-first, tokens em `globals.css`) + design system
  Protocol Precision (fontes Space Grotesk / Geist / JetBrains Mono self-hosted)
- **Drizzle ORM** + Neon Postgres (driver `neon-http`; `neon-serverless` só p/ auth)
- **Better Auth** (Google, Discord, email/senha)
- **visx** (gráficos)
- **Vitest 4** (100% de cobertura exigida em `src/services/analytics/**`)

## Estrutura

```
src/
├── app/            # páginas (RSC), layouts, rotas de API e Server Actions
├── components/     # apresentação (ui, layout, match, player, agents, ai, charts)
├── config/env.ts   # ambientes (test|dev|prod) + requireEnv fail-fast
├── contracts/      # henrikdev.ts · tracker.ts · coach.ts (envelope 3 camadas)
├── lib/            # auth, session, cache, db, validação, formatação, assets
├── proxy.ts        # proteção de /dashboard (sucessor do middleware)
└── services/       # henrikdev (client) · tracker (orquestração) ·
                    # analytics (cálculo puro, 100%) · coaching (envelope)
tests/              # espelha src/ 1:1 (nenhum teste mora em src/)
```

Mapa detalhado em [`docs/arquitetura/estrutura-de-pastas.md`](./docs/arquitetura/estrutura-de-pastas.md).

## Produção (futuro)

Deploy na **Vercel** com variáveis configuradas manualmente no painel
(Settings → Environment Variables). Guia em
[`docs/operacao/deploy.md`](./docs/operacao/deploy.md).
