# Registro de decisões

Decisões arquiteturais e de produto tomadas ao longo do projeto. Consolidado
de `plan/` e do código. Cada item traz o **porquê** para evitar reabertura
acidental.

## Plataforma

- **Next.js 16 com Cache Components** (`cacheComponents: true`,
  `partialPrefetching: true`) e Turbopack. Sem config Webpack legado.
- **`params`/`searchParams`/`cookies()`/`headers()` são `Promise`** — sempre
  `await`.
- **Middleware virou `proxy`** em Next 16: `src/proxy.ts` com
  `export function proxy`.
- **Tailwind v4 CSS-first** (`@theme` em `globals.css`); sem
  `tailwind.config.js`.
- **Fontes self-hosted** (`next/font/local`) com os `.woff2` commitados em
  `src/app/fonts/`: `next/font/google` baixaria no build e quebraria no
  container sem rede.

## Dados e cálculo

- **HenrikDev v4** como fonte; o payload cru é espelhado em
  `contracts/henrikdev.ts` e **nunca** chega às páginas.
- **Todo cálculo em `src/services/analytics/**`**, com cobertura **100%**;
  componentes apenas renderizam. Isso mantém o cálculo testável e a UI burra.
- **Nunca fabricar dados.** Métricas ausentes → `—`/omitidas; conteúdo demo
  rotulado. O que não é derivável fica no backlog (ver "Campos sem suporte").
- **KAST** e **Rating ValCoach** são métricas derivadas (a fonte não as expõe).
  Rating é composto e normalizado para `1.00` no jogador médio.
- **DEF/ATK** são inferidos dos plants (só o atacante planta) e o outro half
  assume a troca; OT (>24 rounds) omite o rótulo. A página sempre fala na
  **perspectiva do jogador buscado**.
- **`noUncheckedIndexedAccess: true`** — evita `??` inalcançável (que contaria
  branch não coberto nos analytics).

## Cache e persistência

- **Cache Components** (`'use cache'` + `cacheLife` + `cacheTag`) compartilhado
  entre API e páginas; chave separada por `size` de amostra.
- **Cache durável `match_cache` (24h)** para partidas imutáveis.
- **Write-through best-effort**: falha de persistência não derruba a resposta.
- **Snapshot de combate** (`player_combat_snapshots`) alimenta o endpoint de
  evolução; a evolução exige ≥2 snapshots.

## Autenticação

- **Better Auth** com Google/Discord/email; driver `neon-serverless`
  (transações) separado do driver do app.
- **`proxy` faz checagem otimista** por cookie; validação real via `getSession`.
- **Provedores sociais opcionais por credencial** (configurar só um funciona).

## Produto e design

- **Visão Geral aponta para o jogador buscado** — não é um dashboard do usuário
  logado. Fora do contexto de jogador, a nav global tem apenas **Busca** e
  **Console** (nunca inventar "player conectado").
- **Partidas & Breakdown é tela separada** (`/breakdown`, amostra 20); a Visão
  Geral usa amostra 5.
- **Direção visual Protocol Precision** (Stitch): canvas `#f9f9f9`, card
  `#ffffff`/`#f9fafb`, hairline preta, acento `#f5f841`, `tertiary #2c676b`,
  micro-raio, sombra dura sem blur, fontes Space Grotesk / Geist / JetBrains
  Mono.
- **Card in-game do jogador é quadrado** (não agente, não circular). O MVP usa
  o card v1 (`card.large`) best-effort.
- **Scoreboard "máximo idêntico possível"**: colunas de largura fixa
  (`<colgroup>` + `table-fixed`) idênticas entre os times; a linha do jogador
  buscado é diferenciada ("você"); DEF/ATK de 12 rounds por half; resultado na
  perspectiva do jogador.
- **Timeline de rounds é própria** (não a do Stitch): tipo de encerramento,
  lado DEF/ATK, chip PIST (R1/R13), separador do 2º half, placar progressivo e
  resumo — sem tags econômicas, ECON rating nem probabilidade de vitória
  (não fabricar).
- **Widgets do Stitch com "replay telemétrico"** (affordance não implementada)
  não são exibidos como funcionais.

## Campos sem suporte (permanecem `—`/omitidos)

ECON rating, dano/HS por arma, tags econômicas por round, probabilidade de
vitória, narrativa de IA, benchmark por elo, peak rank, server/ticks.

## Pendências conhecidas

- Aviso de console `Date.now()` no prerender do `MatchMetaBar`
  (`formatRelativeTime`) na rota `/matches/[matchId]` — fora do escopo das
  rodadas de design.
- `revalidateTag`/`updateTag` para invalidação fina do cache de dados.
