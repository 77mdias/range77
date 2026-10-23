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
public/assets/images/  ícones de agente, splash, minimaps/, brand/, etc.
```

Configurações: `next.config.ts`, `vitest.config.ts`, `vitest.setup.ts`,
`drizzle.config.ts`, `tsconfig.json`, `postcss.config.mjs`,
`docker-compose.yml`, `Dockerfile`, `.infisical.json`.

## `src/`

```
src/
├── app/                          App Router (páginas, layouts, rotas de API)
│   ├── layout.tsx                só html/body/fontes (sem shell)
│   ├── globals.css               tokens (Protocol Precision)
│   ├── fonts/                    .woff2 self-hosted
│   ├── (app)/                    grupo com AppShell (top-nav, NavUser, banner simulado)
│   │   ├── page.tsx / home-landing   landing "/"
│   │   ├── dashboard/            área protegida (+ settings/: RSO, perfil público)
│   │   ├── console/              console API & IA
│   │   ├── design-system/        styleguide viva (404 em prod)
│   │   ├── matches/[matchId]/    detalhe de partida (+ mapa de abates, economia)
│   │   ├── players/[region]/[name]/[tag]/
│   │   │   ├── page.tsx          Visão Geral
│   │   │   ├── profile-view.tsx  apresentação do overview
│   │   │   ├── breakdown/        Partidas & Breakdown (disciplina econômica, heatmap)
│   │   │   ├── agents-maps-*.tsx filtros + seções Agentes/Mapas
│   │   │   ├── ai-sandbox.tsx    sandbox IA (simulado, rotulado)
│   │   │   └── follow-button.tsx seguir/deixar de seguir
│   │   ├── termos/ privacidade/  páginas legais
│   │   └── error.tsx
│   ├── (auth)/                   grupo com chrome próprio
│   │   ├── login/ signup/        autenticação
│   │   └── rso/consent/          Riot Sign-On (simulado)
│   ├── actions/                  Server Actions (tracked-players, user-riot, rso)
│   └── api/                      Route Handlers
│       ├── health/               GET /api/health
│       ├── auth/[...all]/        Better Auth
│       ├── rso/authorize|callback/   fluxo RSO simulado
│       ├── players/[region]/[name]/[tag]/         (combate)
│       │   ├── overview/         overview do perfil
│       │   └── history/          evolução entre snapshots
│       └── matches/[region]/[matchId]/
├── components/                   apresentação (barrels por pasta)
│   ├── ui/                       primitivas (inclui simulated-badge, states/private-profile-state)
│   ├── layout/                   shell, top-nav, brand-logo, nav-user, footer, simulated-banner
│   ├── home/                     landing
│   ├── match/                    scoreboard, timeline, MVP, arsenal, kill-map, round-economy
│   ├── player/                   header, histórico, economy-discipline-card
│   ├── agents/                   cards de agente/mapa/benchmark
│   ├── ai/                       terminal, chat, code viewer
│   └── charts/                   visx + geometrias puras (inclui death-heatmap)
├── config/env.ts                 snapshot tipado do ambiente (inclui TRACKER_DATA_SOURCE)
├── contracts/                    riot.ts · tracker.ts · access.ts · coach.ts · henrikdev.ts
├── lib/                          utilidades transversais
│   ├── auth.ts / auth-client.ts  Better Auth (servidor/cliente)
│   ├── session.ts                sessão server-side (getSession, getViewerUserId)
│   ├── rso/mock-provider.ts      RSO simulado (conta fictícia, code HMAC, state)
│   ├── legal.ts                  aviso legal da Riot + e-mail de contato
│   ├── cache/tracker.ts          camada 'use cache' compartilhada
│   ├── db/                       conexões + schema + stores
│   ├── recents/                  perfis recentes (localStorage v2)
│   ├── format/                   rank, relative-time
│   ├── http/api-error.ts         mapa de erros → ApiErrorBody
│   ├── validation/               riot-id, player/match-params, credentials
│   ├── valorant-assets.ts        ícones de agente/mapa
│   └── valorant-maps.ts          minimapas + transformações por mapa
├── proxy.ts                      proteção de /dashboard (sucessor do middleware)
└── services/
    ├── riot/                     normalize-riot + catalog + mock/ (gerador simulado)
    ├── tracker/                  orquestração + persistência + sources/ (TrackerSource)
    ├── access/                   política de consentimento
    ├── analytics/                cálculo puro (cobertura 100%)
    ├── coaching/                 envelope de 3 camadas
    └── henrikdev/                integração antiga (guardada, desligada)
```

## `tests/`

Espelha `src/`: `tests/app/**` (páginas e API), `tests/components/**`,
`tests/services/**` (analytics, coaching, tracker, riot, access, henrikdev), `tests/lib/**`,
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
