# Visão geral da arquitetura

ValCoach é uma aplicação web de análise e coaching de Valorant. Os dados de
partida chegam no **formato oficial da Riot (VAL-MATCH-V1)** — hoje
**simulados**, enquanto a Production API Key não é aprovada — e passam por
normalização para um contrato interno estável, cálculo em módulos puros e uma
interface telemétrica (design system **Protocol Precision**). Dados de um
jogador só aparecem com o **consentimento** dele (Riot Sign-On simulado +
perfil público opt-in).

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
   - `src/services/tracker/sources/**` — fontes de dados atrás da porta
     `TrackerSource` (`mock` padrão; `henrikdev` guardada). Ver
     [fontes de dados](./fontes-de-dados.md).
   - `src/services/riot/**` — gerador simulado + normalizador do formato Riot.
   - `src/services/tracker/**` — orquestração + persistência.
   - `src/services/access/**` — política de consentimento (quem vê o quê).
   - `src/services/analytics/**` — **cálculo puro** (sem I/O), cobertura 100%.
   - `src/services/coaching/**` — orquestração do envelope de coaching.
   - `src/components/**` e `src/app/**` — **apresentação**; componentes de
     chart apenas desenham.

2. **Dados normalizados antes de tudo.** O payload cru da Riot é espelhado
   em `src/contracts/riot.ts` e convertido por `normalize-riot.ts` para o
   contrato interno estável de `src/contracts/tracker.ts`. Nenhuma página
   conhece o formato externo.

3. **Inversão de dependência (DIP).** Tudo que toca rede, banco ou auth é
   injetável: as fábricas `create*(...)` recebem `client`, `store`, `getSession`
   ou `db` por parâmetro. Os testes injetam fakes sem rede nem banco.

4. **Fail-fast de configuração.** `TRACKER_DATA_SOURCE` inválido falha no
   `loadAppEnv`; `DATABASE_URL` só é exigida na criação da conexão. A leitura de segredos passa sempre
   por `loadAppEnv()` + `requireEnv()` (`src/config/env.ts`).

5. **Nunca fabricar dados.** Métricas não computáveis ficam `null`/omitidas —
   jamais `0` enganoso. Ver [convenções](../desenvolvimento/convencoes.md).

6. **Cache em camadas.** Cache Components (`'use cache'` + `cacheLife` +
   `cacheTag`, com a fonte na tag) compartilhado entre páginas e API.

7. **Consentimento antes de dado.** Toda superfície de dado de jogador chama
   `resolveProfileAccess` antes da fonte, fora do `'use cache'`. Ver
   [consentimento e RSO](./consentimento-e-rso.md).

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
  │     ├─ src/services/access/* ........ consentimento (antes do cache)
  │     └─ src/services/**
  │           ├─ tracker/* ...... orquestra a fonte ativa (TrackerSource)
  │           ├─ tracker/sources/ mock (padrão) · henrikdev (guardada)
  │           ├─ riot/* ......... gerador simulado + normalizador Riot
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
| `prod` | Vercel (subdomínio do domínio próprio) | configurados manualmente no painel |

Ver [variáveis de ambiente](../desenvolvimento/variaveis-de-ambiente.md) e
[deploy](../operacao/deploy.md).
