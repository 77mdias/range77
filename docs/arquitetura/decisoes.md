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

- **Formato oficial da Riot (VAL-MATCH-V1)** como contrato cru
  (`contracts/riot.ts`); o payload **nunca** chega às páginas. A HenrikDev
  (v4) foi a fonte original e está **guardada e desligada** — sai de vez
  quando a fonte `riot` existir.
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
  entre API e páginas; chave separada por `size` de amostra (a tela Breakdown
  usa entrada própria `player-breakdown:*`, com amostra por ato).
- **TTL de 25 min nos dados de jogador** (`revalidate: 1500`): uma partida
  ranqueada dura ~30–50 min, então a janela não muda entre navegações; conta/
  cartão (mudam raramente) ficam em 1 h. Na fonte HenrikDev (guardada), cada
  **recurso** tem cache próprio (`cached-client.ts`, tags `henrikdev:*`), para
  Perfil e Breakdown compartilharem conta/MMR/histórico em vez de rebuscar.
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
- **Partidas & Breakdown é tela separada** (`/breakdown`); a amostra é
  **dinâmica por ato** (nº de partidas do ato via MMR v3 `seasonal[].games`,
  teto 30, fallback 15) e a Visão Geral usa amostra 5.
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

## Production API Key: dados simulados + consentimento

Contexto: a Riot não emite chave pessoal para VALORANT, e o RSO só é liberado
após a aprovação de produção. O app precisa provar valor e conformidade
**antes** da chave. Spec: `docs/superpowers/specs/2026-10-21-riot-production-mock-data-design.md`.

- **Simular no nível do payload cru**, não da tela: o mock gera DTOs
  VAL-MATCH-V1 e passa pelo mesmo `normalize-riot.ts` da API real. No dia da
  chave troca-se só a fonte.
- **Porta única `TrackerSource`** escolhida por `TRACKER_DATA_SOURCE`
  (default `mock`). Ver [fontes de dados](./fontes-de-dados.md).
- **Só simular o que a API oficial entrega.** Sem linha do tempo de
  habilidades (a API só tem contagem por partida); rank/RR atuais não têm
  endpoint oficial e existem só no mock.
- **Mock determinístico e fictício**: mesma entrada → mesma saída; nenhum Riot
  ID real em mock, fixture nova ou tela. Selo `DADOS SIMULADOS` + banner em
  toda tela simulada — nunca fingir dado real.
- **Detalhes brutos não atravessam o cache**: ~5 MB por amostra; o serviço
  calcula `tactical`/`deathHeatmaps` no servidor e expõe só o resultado.
- **Zonas de morte rotuladas por mapa** ("Lotus · B Site"), para não somar
  zonas homônimas de mapas diferentes.
- **Consentimento "a sua própria conta"**: perfil público é opt-in, privado e
  inexistente respondem igual, checagem fora do `'use cache'`, fail-closed.
  Vínculos legados não dão acesso. Ver
  [consentimento e RSO](./consentimento-e-rso.md).
- **RSO simulado com forma de OAuth** (state em cookie, `code` HMAC, callback).
  O navegador faz o GET do callback (`window.location.assign`), porque um
  `redirect()` de Server Action para Route Handler roda no servidor e perde
  o `Set-Cookie`.
- **Antes de ligar dados reais**: verificar que a partida pertence ao
  histórico do jogador do `?player=` (hoje só o consentimento dele é
  conferido — seguro só com o mock). Checklist completo em
  [pedido da Production Key](../operacao/pedido-production-key.md).

## Campos sem suporte (permanecem `—`/omitidos)

ECON rating, dano/HS por arma, probabilidade de vitória, narrativa de IA,
benchmark por elo, peak rank, server/ticks, linha do tempo de habilidades.
(Economia por round e posições passaram a existir com o formato Riot.)

## Pendências conhecidas

- Aviso de console `Date.now()` no prerender do `MatchMetaBar`
  (`formatRelativeTime`) na rota `/matches/[matchId]` — fora do escopo das
  rodadas de design.
- `revalidateTag`/`updateTag` para invalidação fina do cache de dados.
- Ajustes planejados na tela de **perfil** (próxima fase).
- Do spec, ainda não feitos: filtro por jogador no mapa de abates, heatmap de
  mortes separado por lado, disciplina econômica em porcentagem.
- O coach IA é **simulado**: não há cliente de LLM no repositório.
- `CONTACT_EMAIL` (`src/lib/legal.ts`) ainda é placeholder — trocar antes de
  enviar o link à Riot.
