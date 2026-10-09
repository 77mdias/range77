# ValCoach Tracker — Plano de Execução (Handoff)

> **Para:** agente de implementação (sessão isolada em Docker, com bind mount do projeto)
> **Projeto:** `/home/jeandias/projects/range77`
> **Escopo deste plano:** aplicação web tracker de Valorant (fases 1–4). MiniMax fica fora de escopo.
> **Decisões já tomadas pelo dono do produto:** design system 100% custom · direção visual dark agressivo Riot · tracker público antes de auth · visx para dataviz · primitivas interativas hand-rolled no MVP.

---

## 0. REGRAS INEGOCIÁVEIS DO PROJETO (leia antes de tocar em qualquer arquivo)

1. **TDD estrito** por funcionalidade: (1) contratos/tipos → (2) suite Vitest ANTES da implementação (sucesso, erro de API externa, dados nulos) → (3) implementação → (4) validar + refactor. RED → GREEN é verificável no histórico.
2. **Cobertura:** `src/services/analytics/**` exige **100%** (stmts/branches/funcs/lines) — threshold já configurado no `vitest.config.ts`. Qualquer função de cálculo/agregação estatística mora lá.
3. **Zero arquivos `.env`** (bloqueados em `.gitignore`/`.dockerignore`). Código lê estritamente `process.env.VAR`. Dev local: Infisical injeta da máquina hospedeira (`infisical run --env=dev -- docker compose up --build`). **Nunca imprimir valores de segredos** (política de permissões do host bloqueia `infisical secrets*`/`infisical export*`).
4. **Next.js 16**: `params`, `searchParams`, `cookies()`, `headers()` são **Promise** — sempre `await`. Cache Components habilitado (`cacheComponents: true` no next.config): rota dinâmica usa `await connection()`; cache de dados via `'use cache'` + `cacheLife(...)` + `cacheTag(...)`; `revalidateTag(tag, 'max')` (perfil obrigatório). Turbopack é o bundler — nada de config Webpack.
5. **React 19.3**: View Transitions (`<ViewTransition enter/exit/update>` com `startTransition`) e `<Activity mode>` estão estáveis — use-os no motion do design system.
6. **Erros de API** sempre no envelope `ApiErrorBody` (`src/contracts/coach.ts`): `{ error: { code, message, hint? } }`. Páginas consomem o mesmo contrato nos estados de erro.
7. **Ambientes:** `APP_ENV` ∈ `dev | test | prod`. Env de teste = 100% mocks, sem credenciais. Env de produção = Vercel com variáveis manuais (futuro).
8. **Comandos do host vs container:** você (agente) edita código e roda `npm test`/`npm run typecheck`. Builds Docker e migrações com credenciais (`infisical run --env=dev -- npm run db:migrate`) são executados pelo DONO no host. Combine com ele ao final de cada fase.

**Estado atual (já existe e está testado):** API de coaching com envelope de 3 camadas (`raw_metrics`/`contextual_rating`/`coaching_hooks`) em `/api/players/[region]/[name]/[tag]` (cacheado) e `/api/players/.../history` (evolução entre snapshots); client HenrikDev v4 (`src/services/henrikdev/client.ts`, auth header `Authorization`, timeout 15s); normalizadores; analytics puras (`combat.ts`, `evolution.ts`); Drizzle + Neon (`src/lib/db/`); tabela `player_combat_snapshots` (write-through). Env vars ativas em `dev`: `APP_ENV`, `DATABASE_URL`, `HENRIKDEV_API_KEY`.

---

## FASE 1a — Fundação do Design System (tokens, fontes, shell)

### 1. Instalação

- Tailwind CSS v4 (CSS-first, `@theme` no CSS global — sem `tailwind.config.js` legado; usar `@tailwindcss/postcss` conforme doc oficial v4).
- Fontes via `next/font/google`: **Bebas Neue** (display, condensada — substitui Tungsten), **Rajdhani** 500/600/700 (HUD/números, `font-variant-numeric: tabular-nums`), **Inter** 400/500/600 (corpo). Expor como variáveis CSS (`--font-display`, `--font-hud`, `--font-body`).

### 2. Tokens (no `@theme`)

```
CORES (primitivos)
  void        #0F1923   (fundo base — quase-preto azulado Riot)
  void-raised #16212F   (superfície elevada)
  void-hover  #1E2A3A
  steel-line  #2A3648   (bordas/divisórias)
  steel-dim   #3F4B5E
  bone        #ECE8E1   (texto primário — off-white Riot)
  bone-dim    #9AA3AF   (texto secundário)
  blood       #FF4655   (accent Riot)
  blood-hover #FF6672
  blood-dark  #8F2F35
  win         #3FBF8F
  loss        #FF4655

SEMÂNTICOS (usar estes nos componentes — nunca os primitivos direto)
  --color-surface, --color-surface-raised, --color-surface-hover,
  --color-line, --color-text-primary, --color-text-secondary,
  --color-accent, --color-accent-hover, --color-win, --color-loss

CHAMFER (assinatura visual: cantos cortados, border-radius SEMPRE 0)
  --chamfer-sm 8px · --chamfer-md 12px · --chamfer-lg 18px

TIPOGRAFIA
  display-xl 72/0.9 · display-lg 56/0.95 · display-md 40/1 · heading-lg 28/1.1
  heading-sm 20/1.2 · body-lg 16/1.6 · body 14/1.6 · label 12/1.2 (tracking wide, uppercase)
  display/heading → --font-display; números/stats → --font-hud (tabular-nums); corpo → --font-body

SOMBRA (dura, sem blur)
  --shadow-hard: 4px 4px 0 rgb(0 0 0 / 0.45)

MOTION
  --duration-fast 120ms · --duration-base 200ms · --duration-slow 320ms
  --ease-out-expo: cubic-bezier(0.2, 0.8, 0.2, 1)
```

### 3. Primitiva `Chamfer`

- Utilidade CSS `.chamfer-{sm,md,lg}` com `clip-path: polygon(...)` calculado das variáveis.
- **Borda com clip-path** exige técnica aninhada: elemento externo com `background: var(--color-line)` + clip, elemento interno (offset 1px) com `background` da superfície + mesmo clip. Criar componente React `<ChamferBox>` que encapsula isso (props: size, bordered, as, className).
- Documentar a técnica num comentário — é o detalhe mais copiado errado.

### 4. Layout shell

- `AppShell` (Server Component): header sticky (logo tipográfico "VALCOACH" em display, nav: Tracker/…, slot de usuário futuro), footer discreto, fundo `void` com textura de grid sutil (CSS radial/linear-gradient overlay a 3% de opacidade).
- Página `/` (home) provisória: hero display-xl + barra de busca (não funcional ainda — placeholder da fase 2) + faixa de features.

### 5. Critérios de aceite 1a

- [ ] `npm run typecheck` e `npx vitest run` verdes (tests existentes intactos).
- [ ] `npx next build` passa; `/` renderiza com fontes carregando via next/font (zero FOUC).
- [ ] Tokens documentados e visíveis no CSS compilado.
- [ ] Commit atômico: `feat(design): fundacao tokens/fontes/shell`.

---

## FASE 1b — Componentes core + styleguide viva

### Componentes (todos em `src/components/ui/`, com pasta + índice; props tipadas; estados de foco/teclado sempre)

1. **Button** — variants: `primary` (blood, hover blood-hover, shadow-hard), `secondary` (outline bone), `ghost`; sizes sm/md/lg; prop `loading` (spinner CSS); press effect translate(2px,2px) reduzindo sombra.
2. **SearchBar** — select de região (eu/na/ap/kr/latam/br) + input `nome#tag` com máscara/validação client-side (tag 1–6 alfanumérica), emite `{region, name, tag}` via callback (wiring real na fase 2).
3. **Card** — `<ChamferBox>` elevado, header com label uppercase + slot de ação, body.
4. **StatCard** — label, valor grande em `--font-hud` tabular, delta opcional (▲ win / ▼ loss), slot para sparkline.
5. **Table** — denso (rows 40px), header sticky, células numéricas tabular-nums alinhadas à direita, hover row `void-hover`. Sem paginação embutida.
6. **Tabs** — hand-rolled acessível: `role="tablist"`, `aria-selected`, navegação por setas, estado via `useState`; usado dentro de Client Components. Envolver transições de painel em `<ViewTransition>` + `startTransition` e preservar estado com `<Activity>` quando fizer sentido.
7. **Badge** — variants: `win`, `loss`, `accent`, `neutral` (tier placeholder).
8. **MatchRow** — mapa (display font), Badge W/L, K/D/A, ACS, HS%, data relativa; click → detalhe (link na fase 2).
9. **Sparkline** — SVG puro (sem visx ainda), props `points: number[]`, cor por tendência.
10. **Skeleton** — blocos chanfrados com pulse.
11. **EmptyState** / **ErrorState** — ErrorState consome `ApiErrorBody` (mostra code/message/hint) — contrato visual com nossa API.

### Styleguide

- Rota `/design-system` renderizando: paleta, escala tipográfica, chamfers, todos os componentes em estados (default/hover/loading/disabled), exemplos de composição. Gate: exibir apenas quando `APP_ENV !== 'prod'` (usar `loadAppEnv()` server-side).

### Critérios de aceite 1b

- [ ] Todos os componentes com Story-like examples na `/design-system`.
- [ ] `next build` + typecheck verdes; commit `feat(design): componentes core + styleguide`.

---

## FASE 2 — Tracker público (perfil, histórico, detalhe de partida)

### 1. Pesquisa prévia (fazer PRIMEIRO, via Context7/doc oficial)

- Confirmar se a HenrikDev v4 tem **endpoint de match por `match_id`** (`GET /valorant/v4/matches/{affinity}/{platform}/{matchid}` ou similar) e seu schema. Anotar no contrato.

### 2. Contratos + normalizadores novos (TDD)

- Estender `src/contracts/henrikdev.ts`: scoreboard por jogador (todos os `players[].stats` brutos: damage, economy, abilities), `teams`, `rounds[]` (resultado por round, plant/defuse), `kills[]` (timeline com tempo/round/armas), `metadata` (mapa, queue, started_at, season).
- `src/services/henrikdev/normalize-tracker.ts`: extração por partida → `MatchSummary` (linha do histórico), `MatchScoreboardRow`, `RoundOutcome[]`.
- Agregações por agente/mapa = funções de CÁLCULO → `src/services/analytics/tracker-aggregations.ts` (**100% coverage obrigatória**): winrate, avg/ACS/HS%/KDA por agente e por mapa, streaks, tendência por partida.

### 3. Endpoints novos (Route Handlers, mesmos padrões dos existentes)

- `GET /api/players/[region]/[name]/[tag]/overview` — match list (últimas N) + agregações agente/mapa + envelope coach já existente. Cache `'use cache'` + `cacheTag('player-overview:{region}:{nameKey}:{tagKey}:{size}')`, `cacheLife` stale 60s/revalidate 300s/expire 1h.
- `GET /api/matches/[region]/[matchId]` — detalhe bruto. Fluxo: tabela de cache → miss: HenrikDev → persistir → responder. Erros mapeados em `ApiErrorBody` (mesmo mapa de status da rota de players: 404→PLAYER/MATCH_NOT_FOUND, 429→503, 401→500 CONFIG_ERROR, rede→502).

### 4. Camada de dados

- Nova tabela Drizzle `match_cache`: `match_id` (pk), `region`, `payload jsonb notNull`, `fetched_at timestamptz defaultNow`, `expires_at timestamptz notNull`, index em `expires_at`. TTL 24h. Store injetável (`src/lib/db/match-cache-store.ts`) seguindo o padrão DIP do `combat-snapshot-store`. Migração via `drizzle-kit generate` (aplicar no host é tarefa do dono).

### 5. Páginas (RSC-first; interatividade mínima em Client Components)

- `/players/[region]/[name]/[tag]` — header do jogador (display font, região, tag), StatCards (KDR/HS%/ACS/KAST do envelope existente), Tabs: Visão Geral | Partidas | Agentes | Mapas; erro → `ErrorState` com `ApiErrorBody`.
- `/players/.../matches` (ou aba) — lista de `MatchRow` + Load More.
- `/matches/[matchId]` — scoreboard duplo com Table, faixa round-a-round (sequência W/L com Badges), stats por jogador; heatmap visx fica para a fase 4 (aqui já renderizar a sequência).
- Busca da home funcional → navegação para perfil. `searchParams` é Promise — `await`.
- Estados: Skeleton (loading), EmptyState (sem partidas), ErrorState.

### Critérios de aceite 2

- [ ] Suites novas RED→GREEN; `src/services/analytics/**` 100%.
- [ ] Perfis de um jogador real funcionam end-to-end em `dev` (donro valida).
- [ ] Segunda visita ao perfil/match não gera chamada à HenrikDev (cache Data + `'use cache'`).
- [ ] Commit(s): `feat(tracker): ...` por entregável.

---

## FASE 3 — Better Auth (Google + Discord) + dashboard

### 1. Setup (verificado na doc oficial Better Auth)

- `betterAuth({ database: drizzleAdapter(db, { provider: 'pg', schema }), socialProviders: { google: {...}, discord: {...} } })` em `src/lib/auth.ts`.
- **Atenção (tarefa de validação):** o db do auth precisa de driver com transações — nosso `neon-http` (fetch puro) NÃO tem transação interativa. Avaliar `@neondatabase/serverless` Pool (WebSocket) ou `postgres`/node-postgres apontando pro pooler `-pooler`. Criar `createAuthDatabase()` separado em `src/lib/db/auth-connection.ts` com teste real de login em dev.
- Handler: `src/app/api/auth/[...all]/route.ts` → `export const { POST, GET } = toNextJsHandler(auth)`.
- `serverExternalPackages: ['better-auth']` no `next.config.ts` (obrigatório).
- Cliente: `createAuthClient` de `better-auth/react` com SocialLogin buttons (Google/Discord) usando nosso Button.
- Schema: `npx auth generate --adapter drizzle` → **merge** das tabelas `users/sessions/accounts/verifications` no nosso `schema.ts` + migração. **Discord pode retornar `email: null`** (contas só-celular) — tornar email nullable/único-quando-presente e tratar no `mapProfileToUser` (puxar `name` e `image` do perfil do provedor).
- Middleware (edge, sem DB): `getSessionCookie(request)` → proteger `/dashboard/*`, redirect `/login`.
- Server-side: `auth.api.getSession({ headers: await headers() })`.

### 2. Env vars (dono configura no Infisical `dev` — AVISAR com antecedência)

`BETTER_AUTH_SECRET` (gerar com `openssl rand -base64 32`), `BETTER_AUTH_URL` (http://localhost:3000 em dev), `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` (Google Cloud Console, redirect `.../api/auth/callback/google`), `DISCORD_CLIENT_ID`/`DISCORD_CLIENT_SECRET` (Discord Developer Portal, redirect `.../api/auth/callback/discord`).

### 3. Domínio

- Tabela `tracked_players`: `user_id → users.id` (cascade), `region`, `name_key`, `tag_key`, `display_name`, `created_at`, unique `(user_id, region, name_key, tag_key)`.
- `/dashboard`: grid de jogadores trackeados (último snapshot + tendência do `/history`), botão "seguir" no perfil público (Server Action + `updateTag`/revalidação).
- `/dashboard/settings`: perfil do usuário (avatar/nome do provedor), logout.

### Critérios de aceite 3

- [ ] Login Google E Discord funcionando em dev; avatar/nome persistidos.
- [ ] Middleware protege `/dashboard`; Server Components leem sessão com `await headers()`.
- [ ] Follow/unfollow com persistência e revalidação de cache.
- [ ] Commit(s): `feat(auth): ...`.

---

## FASE 4 — Dataviz com visx

- Pacotes: `@visx/scale @visx/axis @visx/shape @visx/group @visx/tooltip @visx/heatmap @visx/legend`.
- Componentes em `src/components/charts/` (SVG, RSC-friendly onde possível):
  1. **TrendLine** — métrica (ACS/HS%/KDR) ao longo das partidas (perfil + evolução);
  2. **RoundHeatmap** — round-a-round no detalhe da partida (resultado/economia/kills);
  3. **MapWinrateBars** — winrate por mapa;
  4. **AgentRadar** — perfil de agente.
- **Transformações de dados (scales/domínios/agregações para plotar) como funções puras em `src/services/analytics/chart-transforms.ts` → 100% coverage.** Os componentes visuais só renderizam.
- Estilo: grid lines `--color-line`, eixo `--color-text-secondary` em `--font-hud`, accent `--color-accent`, tooltip chanfrado seguindo o design system.

### Critérios de aceite 4

- [ ] 4 charts no perfil/detalhe consumindo dados reais; transforms 100% cobertos.
- [ ] Commit(s): `feat(charts): ...`.

---

## Checklist geral de qualidade (toda fase, antes de commit)

1. `npx vitest run --coverage` verde (thresholds ok) · 2. `npm run typecheck` · 3. `npx next build` · 4. sem segredos em código/logs · 5. commits atômicos e descritivos · 6. avisar o dono sobre: novas env vars no Infisical, migrações a aplicar (`infisical run --env=dev -- npm run db:migrate` no host), rebuild do container (`infisical run --env=dev -- docker compose up --build`).
