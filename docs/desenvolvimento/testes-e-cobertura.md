# Testes e cobertura

Filosofia: **TDD estrito** — contratos/tipos → suíte Vitest **antes** da
implementação (sucesso, erro de serviço externo, dados nulos) → implementação
→ validar/refactor. O ciclo RED → GREEN é verificável no histórico.

## Estrutura

`tests/` espelha `src/` quase 1:1. **Nenhum teste mora dentro de `src/`.**

| Pasta | Cobre |
| --- | --- |
| `tests/proxy.test.ts` | proteção otimista de `/dashboard` por cookie |
| `tests/config/env.test.ts` | ambientes: parse, fail-fast, `requireEnv` |
| `tests/app/**` | páginas e Route Handlers |
| `tests/app/api/**` | handlers HTTP puros (service mockado) |
| `tests/components/**` | componentes (render puro e interação) |
| `tests/services/analytics/**` | cálculo puro — **cobertura 100%** |
| `tests/services/{coaching,tracker,henrikdev}/**` | orquestração/normalização/client |
| `tests/lib/**` | utilidades, formatação, validação, stores |

## Cobertura — regra dura

`vitest.config.ts` exige **statements/branches/functions/lines = 100%** para
`src/services/analytics/**`. Todo cálculo/agregação estatística mora lá; os
componentes apenas renderizam. Corolário: as branches de guarda (divisão por
zero, listas vazias, `null`/`undefined`) precisam de teste por faixa.

`src/services/coaching/**` **não** está sob esse threshold explícito — é
orquestração com I/O, testada por injeção (client/store falsos).

Checagem: `npm run test:coverage` (reporter `text` + `lcov`).

## Convenções

- Arquivo em kebab-case igual ao módulo + `.test.ts` (sem JSX) / `.test.tsx`
  (JSX). Rotas: `route.test.ts` ou prefixo (`overview.route.test.ts`);
  auth vira `handler.test.ts`.
- Bloco de cabeçalho `/** SUITE TDD — ... */` explicando o alvo.
- Ambiente padrão `node`; apenas 4 arquivos usam o pragma
  `// @vitest-environment jsdom` (button, tabs, search-bar, email-auth-forms).
- `params` é `Promise` — invocar handlers/rotas com `Promise.resolve({...})`.

## Padrões e mocks recorrentes

- **RSC → `renderToStaticMarkup`**: componentes/servidor são serializados e
  assertados por marcadores `data-*` estáveis.
- **Interação → `@testing-library/react`** (só os 4 arquivos jsdom).
- **`vi.hoisted` + `vi.mock`** de módulos internos:
  ```ts
  const mocks = vi.hoisted(() => ({ getSession: vi.fn(), listByUser: vi.fn() }));
  vi.mock('@/lib/session', () => ({ getSession: mocks.getSession }));
  ```
- **`next/navigation` mockado**; redirects espelham o contrato do Next lançando
  `new Error('NEXT_REDIRECT: <url>')`. Teste: `await expect(fn()).rejects.toThrow(/login/i)`.
- **`next/cache` neutralizado** (`cacheLife`/`cacheTag`/`revalidatePath`) — cache
  é preocupação de runtime, não de lógica.
- **API routes**: constroem `Request` + contexto com `params` resolvido; cobrem
  o mapa completo de erros e garantem que a stack não vaza no body.
- **DIP**: services recebem `deps` (session/store/client) para dispensar
  DB/rede; `client.test.ts` usa `vi.stubGlobal` em `fetch`.
- **Fake de Drizzle** para stores, sem Neon.
- `it.each` para parametrização; `afterEach(cleanup)`,
  `vi.unstubAllGlobals()`, `vi.unstubAllEnvs()`.

## O que não tem teste unitário

`GET /api/health` é validado pelo healthcheck do Compose e por smoke test; os
demais route handlers têm teste em `tests/app/api/`.

Ver [convenções](./convencoes.md) e
[setup local](./setup-local.md) para os comandos.
