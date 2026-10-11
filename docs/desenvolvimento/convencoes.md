# Convenções

Regras de código, plataforma e integridade de dados que o projeto já "mordeu".
Consolidado de `AGENTS.md` e do código.

## Integridade de dados (inegociável)

1. **Nunca fabricar números/estados.** Campo sem suporte → `—` ou **omitido**.
   Um `0` nunca substitui "não computável".
2. **Conteúdo demonstrativo rotulado.** Chat sandbox, payload do console e
   perfis demo são explicitamente demo/simulado.
3. **Perspectiva do jogador.** A Visão Geral e a partida falam na perspectiva
   do jogador buscado — não é um dashboard do usuário logado.

## Onde o cálculo mora

- **`src/services/analytics/**`** — funções puras, sem I/O, cobertura **100%**.
- **`src/services/tracker/**` / `coaching/**`** — orquestração com I/O.
- **`src/components/**` / `src/app/**`** — apresentação; charts só desenham.
- Qualquer cálculo para um chart vem de `chart-transforms.ts`.

## TypeScript

- `strict` + `noUncheckedIndexedAccess` + `noImplicitOverride` +
  `noFallthroughCasesInSwitch`.
- Evitar `??` inalcançável — conta como branch não coberto nos analytics.
- Padrões para `noUncheckedIndexedAccess`: cast com pré-condição documentada,
  non-null assertion justificada, ou `??`/guardas semânticas.

## Plataforma (Next 16 / React 19)

- `params`, `searchParams`, `cookies()`, `headers()` são **`Promise`** — sempre
  `await`.
- **Middleware virou `proxy`**: `src/proxy.ts` com `export function proxy`.
- **Cache Components**: conteúdo dinâmico (DB/auth) dentro de `<Suspense>`;
  páginas com `params`/`searchParams` assíncronos usam
  `export const instant = false`. Ler `headers()` **antes** de tocar o DB
  (`src/lib/session.ts`).
- **Cache de dados**: `'use cache'` + `cacheLife(...)` + `cacheTag(...)`;
  revalidação de páginas com `revalidatePath` (perfil obrigatório).
- `await connection()` substitui `export const dynamic = 'force-dynamic'`.
- **React 19**: `<title>` (inclusive em SVG) exige **filho único** em template
  string; filhos JSX múltiplos renderizam vazio. `<ViewTransition>` e
  `<Activity mode>` estão estáveis.
- **Erros de API** sempre no envelope `ApiErrorBody`
  (`{ error: { code, message, hint? } }`); páginas consomem o mesmo contrato.
- `nextCookies()` deve ser o **último** plugin do Better Auth.

## Estilo

- Arquivos/pastas em **kebab-case**; barrels `index.ts` por pasta de componente.
- Classes condicionais com `cx` (`src/lib/cx.ts`).
- Labels/eyebrows em UPPERCASE; números em `font-hud` (tabular-nums).
- Container full-bleed `px-4 md:px-6 xl:px-8`.

## Segurança e segredos

- **Zero `.env`.** Segredos via Infisical (dev) / painel Vercel (prod).
- Nunca imprimir valores de segredos; nunca rodar
  `infisical secrets*`/`export*` (bloqueado no host).
- Detalhe interno de erro vai para **log**, nunca para o body.
- Detecção de erro **estrutural** (`hasErrorName`/`henrikDevErrorStatus`) — a
  fronteira `'use cache'` destrói `instanceof`.

## Commits

- Atômicos e descritivos (`feat(...)`, `style(...)`, `fix(...)`).
- Antes: `test:coverage` + `typecheck` + `build` verdes; sem dados fabricados;
  labels PT-BR consistentes.

## Pegadinhas conhecidas

- `PLAYER_ROUTE` na nav ignora hash para a rota ativa (prefixo mais longo vence).
- Aviso de console `Date.now()` no prerender do `MatchMetaBar`
  (`formatRelativeTime`) na rota `/matches/[matchId]` — pré-existente.
- Playwright grava só sob a raiz do repo (`.playwright-mcp/`, gitignored).
