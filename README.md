# ValCoach AI

Tracker & coach estatístico de **Valorant**. Os dados de partida chegam no
**formato oficial da Riot (VAL-MATCH-V1)** — hoje **simulados**, enquanto a
Production API Key não é aprovada —, são normalizados para um contrato interno
estável, viram métricas derivadas (KAST, Rating ValCoach, ADR, entry,
economia por round, posições no mapa...) e aparecem numa interface
telemétrica (design system **Protocol Precision**).

Dados de um jogador só aparecem com o **consentimento** dele: Riot Sign-On
(simulado) + perfil público opt-in. O backend faz todo o cálculo e prepara um
envelope de coaching em três camadas (o terminal de coach da tela ainda é
simulado).

> Estado atual e checklist antes de ligar dados reais:
> [`docs/operacao/pedido-production-key.md`](./docs/operacao/pedido-production-key.md).

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
| `TRACKER_DATA_SOURCE` | Fonte de dados: `mock` (padrão, simulada no formato Riot) · `riot` (reservada para a Production Key) · `henrikdev` (guardada) |
| `HENRIKDEV_API_KEY` | Só com `TRACKER_DATA_SOURCE=henrikdev` (integração guardada) |
| `MINIMAX_API_KEY` | Reservada para o chatbot (ainda sem cliente no código) |
| `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` | Better Auth (o secret também assina o `code` do RSO simulado) |
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

## CI/CD & Segurança

Dois gates obrigatórios por PR (GitHub Actions): **CI de qualidade**
(typecheck, testes com cobertura, build de produção) e **pipeline de
segurança** — gitleaks (segredos), `npm audit`/dependency-review (CVEs
high/critical), CodeQL (SAST) e Trivy (container/IaC), com gate estrito:
achados bloqueiam o merge. Dependabot mantém dependências e actions pinadas
atualizados. Normas, exceções e setup: [`docs/operacao/seguranca-ci.md`](./docs/operacao/seguranca-ci.md).

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
├── contracts/      # riot.ts · tracker.ts · access.ts · coach.ts · henrikdev.ts
├── lib/            # auth, session, cache, db, validação, formatação, assets
├── proxy.ts        # proteção de /dashboard (sucessor do middleware)
└── services/       # riot (mock + normalizador) · tracker (fontes, orquestração) ·
                    # access (consentimento) · analytics (cálculo puro, 100%) ·
                    # coaching (envelope) · henrikdev (guardada)
tests/              # espelha src/ 1:1 (nenhum teste mora em src/)
```

Mapa detalhado em [`docs/arquitetura/estrutura-de-pastas.md`](./docs/arquitetura/estrutura-de-pastas.md).

## Produção

Deploy na **Vercel** (subdomínio do domínio próprio) com variáveis configuradas manualmente no painel
(Settings → Environment Variables). Guia em
[`docs/operacao/deploy.md`](./docs/operacao/deploy.md).
