# Estrutura de pastas

Mapa dos diretórios versionados (excluindo `public/assets`). A árvore de
`tests/` espelha `src/` quase 1:1.

## Raiz

```
AGENTS.md              memória/invariantes do projeto (fonte de verdade)
DESIGN.md              design system Protocol Precision (fonte de verdade)
README.md              porta de entrada do repositório
docs/                  esta documentação
plan/                  planos de execução (histórico)
design-stitch/         HTML de referência das telas Stitch
drizzle/               migrações SQL + meta (drizzle-kit)
src/                   código-fonte
tests/                 suíte de testes
public/assets/images/  ícones de agente, splash/minimapa, etc.
```

Configurações: `next.config.ts`, `vitest.config.ts`, `vitest.setup.ts`,
`drizzle.config.ts`, `tsconfig.json`, `postcss.config.mjs`,
`docker-compose.yml`, `Dockerfile`, `.infisical.json`.

## `src/`

```
src/
├── app/                          App Router (páginas, layouts, rotas de API)
│   ├── layout.tsx                shell raiz + fontes self-hosted
│   ├── globals.css               tokens (Protocol Precision)
│   ├── page.tsx / home-landing   landing "/"
│   ├── login/ signup/            autenticação
│   ├── dashboard/                área protegida (+ settings/)
│   ├── console/                  console API & IA
│   ├── design-system/            styleguide viva (404 em prod)
│   ├── matches/[matchId]/        detalhe de partida
│   ├── players/[region]/[name]/[tag]/
│   │   ├── page.tsx              Visão Geral
│   │   ├── profile-view.tsx      apresentação do overview
│   │   ├── breakdown/            Partidas & Breakdown (amostra por ato, até 30)
│   │   ├── agents-maps-*.tsx     filtros + seções Agentes/Mapas
│   │   ├── ai-sandbox.tsx        sandbox IA (demo rotulado)
│   │   └── follow-button.tsx     seguir/deixar de seguir
│   ├── actions/                  Server Actions (tracked-players, user-riot)
│   └── api/                      Route Handlers
│       ├── health/               GET /api/health
│       ├── auth/[...all]/        Better Auth
│       ├── players/[region]/[name]/[tag]/         (combate)
│       │   ├── overview/         overview do perfil
│       │   └── history/          evolução entre snapshots
│       └── matches/[region]/[matchId]/
├── components/                   apresentação (barrels por pasta)
│   ├── ui/                       primitivas do design system
│   ├── layout/                   shell, top-nav, nav-user, footer
│   ├── home/                     landing
│   ├── match/                    scoreboard, timeline, MVP, arsenal...
│   ├── player/                   header, histórico
│   ├── agents/                   cards de agente/mapa/benchmark
│   ├── ai/                       terminal, chat, code viewer
│   └── charts/                   visx + geometrias puras
├── config/env.ts                 snapshot tipado do ambiente
├── contracts/                    henrikdev.ts · tracker.ts · coach.ts
├── lib/                          utilidades transversais
│   ├── auth.ts / auth-client.ts  Better Auth (servidor/cliente)
│   ├── session.ts                leitura de sessão server-side
│   ├── cache/tracker.ts          camada 'use cache' compartilhada
│   ├── db/                       conexões + schema + stores
│   ├── format/                   rank, relative-time
│   ├── http/api-error.ts         mapa de erros → ApiErrorBody
│   ├── validation/               riot-id, player/match-params, credentials
│   └── valorant-assets.ts        resolução de ícones de agente/mapa
├── proxy.ts                      proteção de /dashboard (sucessor do middleware)
└── services/
    ├── henrikdev/                client HTTP + cached-client + normalizadores
    ├── tracker/                  orquestração + persistência
    ├── analytics/                cálculo puro (cobertura 100%)
    └── coaching/                 envelope de 3 camadas
```

## `tests/`

Espelha `src/`: `tests/app/**` (páginas e API), `tests/components/**`,
`tests/services/**` (analytics, coaching, tracker, henrikdev), `tests/lib/**`,
`tests/config/**` e `tests/proxy.test.ts`. **Nenhum teste mora dentro de
`src/`.** Ver [testes e cobertura](../desenvolvimento/testes-e-cobertura.md).

## Convenções de nomes

- Arquivos e pastas em **kebab-case** (`round-timeline.tsx`).
- Testes: `<modulo>.test.ts` / `.test.tsx`; rotas usam `route.test.ts` ou
  prefixo (`overview.route.test.ts`).
- Cada pasta de componentes expõe um `index.ts` (barrel); `layout/` é a
  exceção.
- Componentes de UI ficam em pasta própria (`button/button.tsx` +
  `button/index.ts`).
