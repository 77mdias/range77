# Visão geral da arquitetura

ValCoach é uma aplicação web que busca dados públicos de Valorant na API
**HenrikDev**, normaliza-os para contrato interno estável, calcula métricas
derivadas em módulos puros e as apresenta em uma interface teleétrica
(design system **Protocol Precision**), além de preparar um envelope de
coaching para um chatbot de baixo custo.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Framework | **Next.js 16** (App Router, Cache Components, Turbopack) |
| UI | **React 19** + **Tailwind CSS v4** (CSS-first via `@theme`) |
| Linguagem | **TypeScript** estrito (`strict` + `noUncheckedIndexedAccess`) |
| Dados | **Drizzle ORM** + **Neon Postgres** (driver `neon-http`); `neon-serverless` (WebSocket) só para o auth |
| Autenticação | **Better Auth** (Google, Discord, email/senha) |
| Gráficos | **visx** (`@visx/*`) |
| Testes | **Vitest** + `@testing-library/react` + `jsdom` |
| Runtime | Node `>=20.9` |

## Princípios estruturais

1. **Separação estrita de responsabilidades.**
   - `src/services/henrikdev/**` — integração HTTP crua com a HenrikDev.
   - `src/services/tracker/**` — normalização + orquestração + persistência.
   - `src/services/analytics/**` — **cálculo puro** (sem I/O), cobertura 100%.
   - `src/services/coaching/**` — orquestração do envelope de coaching.
   - `src/components/**` e `src/app/**` — **apresentação**; componentes de
     chart apenas desenham.

2. **Dados normalizados antes de tudo.** O payload cru (`snake_case`, campos
   nulos, ids Riot) é espelhado em `src/contracts/henrikdev.ts` e convertido
   para o contrato interno estável (`camelCase`, valores derivados) de
   `src/contracts/tracker.ts`. Nenhuma página conhece o formato externo.

3. **Inversão de dependência (DIP).** Tudo que toca rede, banco ou auth é
   injetável: as fábricas `create*(...)` recebem `client`, `store`, `getSession`
   ou `db` por parâmetro. Os testes injetam fakes sem rede nem banco.

4. **Fail-fast de configuração.** `HENRIKDEV_API_KEY` só é exigida no caminho
   que realmente chama a API (um *cache hit* de partida não precisa dela);
   `DATABASE_URL` só na criação da conexão. A leitura de segredos passa sempre
   por `loadAppEnv()` + `requireEnv()` (`src/config/env.ts`).

5. **Nunca fabricar dados.** Métricas não computáveis ficam `null`/omitidas —
   jamais `0` enganoso. Ver [convenções](../desenvolvimento/convencoes.md).

6. **Cache em camadas.** Cache Components (`'use cache'` + `cacheLife` +
   `cacheTag`) protege a cota da HenrikDev; um segundo nível durável no Neon
   (`match_cache`) guarda partidas por 24h.

## Camadas (de fora para dentro)

```
Navegador
  │
  ├─ src/proxy.ts ................ checagem otimista de cookie em /dashboard/*
  │
  ├─ src/app/** ................. páginas (RSC) + Route Handlers
  │     │  usa <Suspense> e `export const instant = false` p/ conteúdo dinâmico
  │     │
  │     ├─ src/lib/cache/tracker.ts ..... 'use cache' compartilhado com a API
  │     │
  │     └─ src/services/**
  │           ├─ tracker/* ...... orquestra: cache durável → HenrikDev → normaliza
  │           ├─ henrikdev/* .... client HTTP + normalizadores
  │           ├─ analytics/* .... cálculo puro (100%)
  │           └─ coaching/* ..... envelope de 3 camadas
  │
  ├─ src/lib/db/** .............. Drizzle + Neon + stores (DIP)
  └─ src/config/env.ts .......... snapshot tipado do ambiente
```

## Contrato de saída para o chatbot

Toda agregação destinada ao chatbot retorna um `CoachInsight` de 3 camadas
(`src/contracts/coach.ts`):

1. `raw_metrics` — números exatos calculados;
2. `contextual_rating` — classificação semântica (`Crítico` → `Excelente`);
3. `coaching_hooks` — strings pré-calculadas que guiam a IA.

Detalhes em [contratos](../dominio/contratos.md).

## Ambientes

| `APP_ENV` | Onde roda | Segredos |
| --- | --- | --- |
| `test` | Vitest local/CI | nenhum — serviços externos 100% mockados |
| `dev` | Container Docker local | injetados pelo Infisical do host |
| `prod` *(futuro)* | Vercel | configurados manualmente no painel |

Ver [variáveis de ambiente](../desenvolvimento/variaveis-de-ambiente.md) e
[deploy](../operacao/deploy.md).
