# ValCoach — Plano: fidelidade às telas Stitch (design system "Protocol Precision")

> **Para:** sessão de implementação (agente em Docker, bind mount do projeto).
> **Projeto:** `/home/jeandias/projects/range77`
> **Origem:** Google Stitch project **"Valorant Stats Coach Tracker"** — `projects/10337952812821192130` (updateTime `2026-10-11T12:06:29Z`).
> **Objetivo:** levar as páginas da app ao visual/layout das 5 telas de UI do Stitch, adotando o design system **Protocol Precision** como fonte de verdade dos tokens.
> **Data do plano:** 2026-10-11.

---

## 0. Decisões tomadas com o dono (não reabrir sem pedido)

1. **Direção visual:** adotar o design system **Protocol Precision** (do Stitch) como fonte de verdade — fontes **Space Grotesk / Geist / JetBrains Mono**, hairlines **pretas (`#000000`)**, **sombra dura** (`1px–6px 0 #000`) e **micro-raio**. `DESIGN.md` + `globals.css` passam a refletir esses tokens.
2. **Ordem de execução:** **Partida → Agentes & Mapas → Visão Geral → Shell/Landing**.
3. **Dados ausentes:** pode **omitir ou mostrar `—`**; campos sem suporte no contrato **não** são fabricados. Cálculos para renderizá-los de verdade **virão depois** (ver §6).
4. Regras inegociáveis do repo continuam valendo: **TDD**, cobertura **100%** em `src/services/analytics/**`, **zero `.env`**, tudo que é cálculo fora de componentes; componentes **render-only**.

---

## 1. Inventário verificado das telas Stitch

| # | Título da tela | screen id | Rota no app | Arquivo-chave | Estado |
|---|---|---|---|---|---|
| 1 | Busca de Jogador & Apresentação do Ecossistema | `27e682689ef64c95971120332c86960c` | `/` | `src/app/home-landing.tsx` | estrutura ~igual |
| 2 | Visão Geral do Jogador & AI Coaching Hub | `0afd6f3231cc4b2499b4336e9e12b049` | `/players/[region]/[name]/[tag]` | `.../profile-view.tsx` | parcial |
| 3 | Desempenho por Agente & Mapa | `0d982740f8b547b7bf8e8a811a6730ae` | seções `#agentes` / `#mapas` | `.../profile-view.tsx` | parcial (sem filtros) |
| 4 | Histórico & Análise Profunda de Partida (Aprimorado) | `5d74c25c05b247e5a9be99ff50b76def` | `/matches/[matchId]` | `src/app/matches/[matchId]/match-view.tsx` | **maior gap** |
| 5 | Console API & IA Coaching Assistant | `7d1c0b3db8e14fbfa48e49556314ab86` | `/console` | `src/app/console/console-view.tsx` | ~igual |
| — | DESIGN.md (upload do dono) | `667638550059620293` | `DESIGN.md` / `/design-system` | `DESIGN.md` | referência |

> Há também uma instância **oculta** (`2eb2d2d49e684ad0af944f62c9e27aaf`, "Partida" antiga) que **não** aparece em `list_screens` — ignorar.

### Como re-obter as referências (para a próxima sessão)

```
tools.stitch.list_screens({ projectId: '10337952812821192130' })   // títulos + screenshot + html download URLs
tools.stitch.get_screen({ name: 'projects/10337952812821192130/screens/<id>' })
```

Baixar `screenshot.downloadUrl` (PNG) e `htmlCode.downloadUrl` (HTML com o Tailwind config de tokens) para `/tmp/opencode/stitch-ref/`. O HTML das telas é a **referência executável** (contém o `tailwind.config` com colors/fontFamily).

---

## 2. Design system Protocol Precision → tokens do app

Fonte: `designTheme.designMd` do projeto (resumo fiel abaixo).

### 2.1 Cores

| Papel (Protocol Precision) | Valor | Token atual em `globals.css` | Ação |
|---|---|---|---|
| `surface` / `background` | `#f9f9f9` | `--color-canvas` = `#ffffff` | canvas de página → `#f9f9f9`; cards brancos |
| `surface-container-lowest` | `#ffffff` | (nenhum) | superfície de card/modal |
| `canvas-soft` | `#f9fafb` | `--color-canvas-soft` = `#f9fafb` | manter |
| `on-surface` | `#1a1c1c` | `--color-ink` = `#000000` | texto/títulos → ink preto dominante |
| `primary-container` | `#f5f841` | `--color-primary` = `#f5f841` | manter (acento de superfície) |
| `primary` | `#616200` | (nenhum) | **novo**: acento "ink-olive" p/ texto sobre claro |
| `border-hairline` | `#000000` | `--color-hairline` = `#e4e4e7` | **mudar para `#000000`** (assinatura brutalista) |
| `secondary` | `#000000` | `--color-ink` | bordas/badges/botões escuros |
| `error` | `#ba1a1a` | `--color-loss` = `#dc2626` | alinhar loss ao `#ba1a1a` (ou manter, decisão do dev) |
| `outline` / `outline-variant` | `#797861` / `#cac8ad` | `--color-ink-mute` = `#71717a` | usar para texto secundário |

Regra do doc: **não** introduzir cores secundárias (sem vermelho/azul roxo decorativos); estados dependem de preenchimento preto, wireframes e o amarelo. Ajustar `--color-win`/`--color-loss` com cuidado (os charts dependem delas).

### 2.2 Tipografia (mapear para papéis existentes)

Protocol Precision → papéis atuais (`font-display` / `font-body` / `font-hud`):

| Papel | Família | Tamanho/linha | Peso | Tracking |
|---|---|---|---|---|
| `display-xl` | Space Grotesk | 32 / 36 | 700 | -0.03em |
| `display-xl-mobile` | Space Grotesk | 24 / 28 | 700 | -0.02em |
| `headline-lg` | Space Grotesk | 20 / 24 | 600 | -0.02em |
| `headline-md` | Space Grotesk | 16 / 20 | 600 | -0.01em |
| `body-lg` | Geist | 14 / 18 | 500 | — |
| `body-md` | Geist | 13 / 17 | 400 | — |
| `body-sm` | Geist | 12 / 16 | 400 | — |
| `label-md` | JetBrains Mono | 11 / 14 | 600 | 0.04em (UPPER) |
| `label-sm` | JetBrains Mono | 10 / 12 | 500 | 0.06em (UPPER) |
| `label-xs` | JetBrains Mono | 9 / 11 | 700 | 0.08em (UPPER) |

Tarefas:
- `next/font`: carregar **Space Grotesk** e **JetBrains Mono** via `next/font/google`; **Geist** via pacote `geist` (Vercel) **ou** `next/font/google` — validar build offline no Docker (ver §7). Expor em `--font-display`, `--font-body`, `--font-hud`.
- `@utility font-display` já existe; trocar a família; garantir **tabular-nums** em `font-hud`.
- Reescrever a escala `--text-*` em `globals.css` para os tamanhos acima (a escala atual é bem maior: `display-xl` 48px). Mapear nomes: `display-xl`, `display-lg→(usar 24 mobile? decidir)`, `heading-lg→headline-lg`, `heading-sm→headline-md`, `body-lg/body`, `label→label-md`; adicionar `label-sm`/`label-xs` se necessário.
- Regra: todo eyebrow/label em **UPPERCASE**; números em JetBrains Mono com `tabular-nums`.

### 2.3 Raio, sombra e elevação

- Raio (tokens): `sm` 0.125rem (2px) · `DEFAULT` 0.25rem (4px) · `md` 0.375rem (6px) · `lg` 0.5rem (8px) · `xl` 0.75rem (12px) · `full` 9999px. O texto do doc cita "3px universal" e "1px em inputs/pills" — **usar os tokens numéricos** e tratar `rounded-sm`/`rounded-DEFAULT` como o padrão de botões/cards, `rounded-sm` (ou 1px) em inputs/pills.
- Elevação (sem blur):
  - Nível 0: canvas branco plano.
  - Nível 1: `#f9fafb` + `1px solid #000` (cards/tabelas/heatmaps).
  - Nível 2: `#ffffff` + `1px solid #000` + sombra dura `2px 2px 0 #000` (elemento ativo/hover principal) ou sublinhado amarelo.
  - Nível 3: overlay `#ffffff` + `1px solid #000` + `3px 3px 0 #000` (dropdowns/popovers/modal).
- Criar utilitários de sombra dura (ex.: `shadow-hard-1/-2/-3/-6` em `@theme`) e **substituir** o padrão atual de hairline cinza + raio grande. O app já tem `shadow-[4px_4px_0px_0px_var(--color-ink)]` em `search-console.tsx` / `search-ingestion-modal.tsx` — migrar para os utilitários.

### 2.4 Componentes (especificação do doc, para conferir primitivas)

- **Botões:** primary = fill `#f5f841`, texto/borda `#000`, `label-md`, raio 3px, padding `5px 8px`, hover com `1px 1px 0 #000`. secondary = fill/texto `#000`/`#fff`. tertiary = fill `#fff`, texto/borda `#000`.
- **Chips/badges:** retangular, raio 1px, padding `2px 4px`, `label-xs`; ativo/MVP/FIRST BLOOD = fill `#f5f841` + texto `#000`.
- **Cards de telemetria:** fill `#f9fafb`, borda `1px #000`, raio 3px, padding 7px, grid interno dividido por hairlines `1px #000`.
- **Inputs/filtros:** fill `#fff`, texto `#000`, borda `1px #000`, raio 1px, padding `5px 6px`, `body-sm`.
- **Checkbox/radio:** 12×12, borda `1px #000`, checked = fill `#000` + glifo amarelo.
- **AI Coach Callout (componente especializado):** fill `#fff`, borda `1px #000`, **borda-esquerda 4px `#f5f841`**, raio 3px, padding `8px 10px`, eyebrow `label-xs` `// PROTOCOL ADVICE: ROUND N`, corpo `body-sm` → **já corresponde** a `src/components/ui/coaching-tip/coaching-tip.tsx` (confirmar e ajustar cores/borda).

**Primitivas já desenhadas e ainda não usadas em páginas** (só no `/design-system`): `CoachingTip`, `InsightList`, `FilterBar`, `KpiMetric`, `StatCard`, `Sparkline` (+ `chamfer-box`). São exatamente os blocos das telas 2 e 3 — **reaproveitar**, não recriar.

---

## FASE 0 (pré-requisito) — Fundação de tokens

Executar **junto** do início da Fase A (é global; toca todas as telas). Arquivos: `src/app/globals.css`, `src/app/layout.tsx`, `DESIGN.md`, `src/app/design-system/showcase.tsx`, `src/components/ui/**`.

- [ ] 0.1 Atualizar `DESIGN.md` para os tokens Protocol Precision (nome, cores, tipografia, raio, elevação, componentes). Manter o formato "alpha" do arquivo atual; anexar/atualizar as tabelas.
- [ ] 0.2 `globals.css`: cores (§2.1), tipografia (§2.2), raio/sombra dura (§2.3), `--font-*` e `@utility` correspondentes.
- [ ] 0.3 `next/font` no `layout.tsx` (Space Grotesk / Geist / JetBrains Mono) + fallback.
- [ ] 0.4 Abrir um utilitário/serviço de sombra dura e migrar as 2 ocorrências ad-hoc (`search-console.tsx`, `search-ingestion-modal.tsx`).
- [ ] 0.5 Atualizar o `/design-system` para refletir os tokens novos (é a página de referência viva).
- [ ] 0.6 Rodar `pnpm/npm test` + `tsc --noEmit` e corrigir quebras de contraste/classes; conferir testes que afirmam texto de labels (não devem depender de cor/tamanho, mas validar).

**DoD Fase 0:** `tsc` limpo, suíte verde, `/design-system` renderiza com fontes/hairlines/sombra corretas.

---

## FASE A — Partida (`/matches/[matchId]`) — maior gap

Arquivos: `src/app/matches/[matchId]/match-view.tsx`, `src/components/match/**`, `src/components/player/**` (se citado), analytics em `src/services/analytics/**`.

Componentes que **já existem** mas só aparecem no showcase: `MvpCallout`, `RoundDiagnosis`, `RoundSelector`, `TacticalMap`, `WeaponCard` (`src/components/match/**`). Verificar props vs. dados.

### A.1 Estrutura da tela Stitch (referência)

1. **Header da partida:** nome do mapa (`ASCENT`), id (`#BR-ASC-8942-TX9`), `DELTA RR:`, `// RESULTADO FINAL`, **meios-placar** `DEF: 7-5` / `ATK: 6-4`; linha do jogador analisado (nome, rank, rating `1.48`, `KDA: 26/13/4`, `HS RATE 34.8%`, `KAST 81.8%`).
2. **Scoreboard:** cabeçalho `// TABELA TELEMÉTRICA DA PARTIDA`, chips `ALL ROLES COMPUTED` / `FORMATO RIOT V3`, nota `RANKED MMR RANGE ... CLIQUE NA LINHA PARA REPLAY TELEMÉTRICO`.
   - Por time: `TIME ALIADO (DEFESA INICIAL // VENCEDOR: 13 ROUNDS)` + `RATING MÉDIO • ECON RATING • DANO TOTAL`.
   - Colunas: **Jogador & Ranque · Agente · K/D/A · HS% · KAST% · FK/FD · ECON**.
3. **Timeline de rounds:** `// TIMELINE DE 22 ROUNDS • ESTADO ECONÔMICO & COMBATE`, legenda `Vitória Def / Vitória Atk / Derrota`, fita compacta com tags econômicas por round (`ELIM/PIST/SEMI/PLNT/BONU/CLUT/FULL`) e progressão de placar.
4. **Diagnóstico:** `Conversão Pistols 2/2 (100%)`, `Taxa Rounds Bônus 1/2 (50%)`, `Rounds Full-Buy Ganhos 8/11 (72.7%)`, `Créditos Poupados (Eco) ¤18.400`.
5. **Probabilidade de vitória:** `PRÉ-LANCE` / `PÓS-LANCE: 18% (-46%)` → `WinProbabilityBar`.
6. **Análise de evento / diagnóstico de IA por round:** narrativa textual (Round 4, Catwalk, util restante) → `RoundDiagnosis` + `RoundSelector`.
7. **Mapa tático:** `SITE A/B`, `MID COURTYARD`, marcadores `FK`/`MORTE` → `TacticalMap`.
8. **Cards de arma:** `VANDAL` (18 abates, HS%, dano médio/round, tempo 1º tiro), `OPERATOR`, `BLADE STORM` → `WeaponCard`.

### A.2 Mapeamento dado → contrato (`src/contracts/tracker.ts`)

| Bloco Stitch | Campo disponível hoje | Ação |
|---|---|---|
| Meios-placar DEF/ATK | — (só `MatchRound.winningTeamId`/`defused`) | **calcular depois** (atk/def split) |
| K/D/A, HS% | `MatchScoreboardRow.kills/deaths/assists/hsPercentage` | ✅ renderizar |
| ACS | `MatchScoreboardRow.acs` | ✅ |
| Rating, ECON rating, KAST%, FK/FD, ECON por jogador | parcial: `economy.spent/loadoutValue`, `abilityCasts`; `MatchDetail.kills` (permite FK por round) | **KAST/ECON rating = futuro**; FK/FD = futuro (analytics a partir de `kills`) |
| `RATING MÉDIO / ECON RATING / DANO TOTAL` do time | `ScoreboardRow.damageDealt` (dano total ✅); rating/econ = futuro | dano ✅; resto `—`/omitir |
| Tags econômicas por round | — | **futuro** |
| Conversão de pistols/bônus/full-buy; créditos poupados | — | **futuro** |
| Probabilidade de vitória | — | **futuro** (ou omitir) |
| Narrativa de IA | — | **omitir** (sem backend) |
| Mapa tático | `MatchRound.plantSite` (site), `kills` (posições não existem) | parcial (sites), resto omitir |
| Cards de arma | `KillEvent.weapon` + `kills` | ✅ agregar (necessário cálculo → `analytics/**`, com testes 100%) |

### A.3 Tarefas

- [ ] A.3.1 Adicionar **meios-placar** e `DELTA RR` ao `MatchMetaBar`/header (quando calculáveis) ou `—`.
- [ ] A.3.2 Estender `ScoreboardTable`: colunas `KAST%`/`FK-FD`/`ECON` (renderizam `—` até haver cálculo); cabeçalho de time com `Dano total` real e espaços de rating/econ.
- [ ] A.3.3 Timeline: legenda `Vitória Def/Atk/Derrota` (cor por metade) + fita compacta; sem tags econômicas (futuro).
- [ ] A.3.4 Montar no `match-view` os blocos `MvpCallout`, `RoundSelector`+`RoundDiagnosis`, `WinProbabilityBar`, `TacticalMap`, `WeaponCard` — apenas onde há dado; omitir o resto.
- [ ] A.3.5 Analytics novos (com testes **100%**): split ATK/DEF por round, first bloods por jogador/round, agregação de armas por partida/jogador. Manter tudo em `src/services/analytics/**`.
- [ ] A.3.6 Testes de página/componentes (padrão `renderToStaticMarkup`).

**DoD Fase A:** `/matches/[matchId]` fiel ao layout do Stitch, com `—`/omissões nos dados ausentes; tsc + testes + cobertura analytics 100%.

---

## FASE B — Agentes & Mapas (seções do perfil)

Arquivos: `src/app/players/[region]/[name]/[tag]/profile-view.tsx` (`AgentsTab`, `MapsTab`), `src/components/agents/**`, `src/components/ui/filter-bar/**`, `src/services/analytics/agent-map-profiles.ts`.

### B.1 Estrutura Stitch

1. **FilterBar:** `FILTROS ATIVOS:` + select **Temporada** (Ep 9 Act 2 / Act 1 / Ep 8 Act 3), select **Fila** (Fila Competitiva / Premier League / Scrims Custom), checkbox **Mínimo de 3 jogos**; à direita `AMOSTRA TOTAL: N PARTIDAS`, `ELO BASE: <tier>`.
2. **`Matriz de Performance por Agente`** (`// AGENT_TELEMETRY_PIPELINE`, `SORT: ACS DECRESCENTE`).
   - Cards: nome, tier (`TIER S MAIN` / `SOLID SEC` / `BOTTLENECK`), `ROLE • N PARTIDAS`, `WIN RATE %`, `K/D RATIO` (+Δ vs Elo), `AVG ACS` (top/bottom/mediana), `HEADSHOT %` (+ tag de arma), métrica extra (`FIRST BLOOD CONVERSION` / `SMOKE COVERAGE EFFICIENCY` / `RECON ASSIST SUCCESS RATE`), `STATUS TÁTICO // …` / `ALERTA // GARGALO`.
3. **Calibração de benchmark:** `Comparativo Direto: Player vs Média Ascendant` com 3 barras (`K/D Geral Ponderado`, `Util Impact`, `FB%`) mostrando marcadores player/elo/benchmark/cap → **primitiva nova** (barras com marcadores) ou adaptar `ProgressBar`.
4. **`Performance por Mapa (Map Pool Analytics)`** (`// MAP_VECTOR_BREAKDOWN`, `COMPETITIVE ROTATION (ACTIVE 6)`).
   - Map cards: status (`MELHOR MAPA`/`ESTÁVEL`/`POSITIVO`/`NEUTRO`/`DESFAVORÁVEL`/`PIOR MAPA`), `PARTIDAS`, `V-D`, `ATK%`, `DEF%`.
5. **`// PROTOCOL ADVICE: MAP POOL DEFICIT ENGINE`** (CoachingTip) + `PRESET DRILL SUGERIDO` / `CARREGAR DRILL` / `MAPA DE CALOR DETALHADO`.

### B.2 Dado → contrato

`GroupedStat` dá `matches/wins/losses/winrate/kda/avgAcs/avgHsPercentage` (agente e mapa). **Não** há: role do agente (derivável de um mapa estático existe em `agent-map-profiles.ts`? conferir), Δ vs Elo, percentis top/bottom, first-blood/util metrics por agente, split ATK/DEF por mapa (futuro), temporada/fila no histórico normalizado (`MatchSummary.season`/`queue` existem — dá para filtrar de verdade).

### B.3 Tarefas

- [ ] B.3.1 Ligar `FilterBar` na seção de agentes/mapas com filtros **reais** que o contrato suporta (`season`, `queue`, mínimo de partidas) — recalcular via `analytics` (client-side sobre `overview.matches`, sem fetch novo). Testar.
- [ ] B.3.2 Enriquecer `AgentCard` (role, Δ vs Elo se computável, métrica extra) — campos sem dado → omitir.
- [ ] B.3.3 Criar/estender barras de benchmark (primitiva + testes).
- [ ] B.3.4 `MapCard`: expor `ATK%/DEF%` só se calculável (senão omitir) e status.
- [ ] B.3.5 `CoachingTip` de map pool (quando houver cálculo; senão omitir) + drill links (podem ficar estáticos/rotulados se forem conteúdo, não dado de jogador).
- [ ] B.3.6 Cobertura 100% em `agent-map-profiles.ts` e novos cálculos.

**DoD Fase B:** filtros funcionais e reais; cards fiéis; nada fabricado.

---

## FASE C — Visão Geral (`/players/[region]/[name]/[tag]`)

Arquivos: `.../profile-view.tsx` (`OverviewTab`), `src/components/player/player-header.tsx`, `src/components/player/match-history-table.tsx`, `src/components/ui/{kpi-metric,stat-card,insight-list,coaching-tip}`, `src/components/charts/rr-trend-chart.tsx`, `src/services/analytics/**`.

### C.1 Estrutura Stitch

1. **Faixa de contexto:** `REGION: BR / SÃO PAULO 1 • CLIENT: PRODUCTION 9.11 • PAYLOAD: LAYER 3 SYNTHESIZED • SYNC RATE: 10s CACHED`.
2. **PlayerHeader:** nome, `VERIFIED BR/VAL`, `ASCENDANT 3`, `RR POOL:`, `PEAK RANK: IMMORTAL 1 (ACT 8)`, `MATCH ROSTER: COMPETITIVE 5V5`, botões `Atualizar HenrikDev` e `Solicitar Análise de IA`.
3. **6 KPI tiles** com 3 linhas cada: `K/D RATIO` (+0.14 / 1.34 / TOP 8%), `WIN RATE` (210 GMS / 58.2% / 122W 88L), `HEADSHOT %` (VANDAL FAV / 28.4% / BR AVG 21%), `ACS MÉDIO` (COMBAT / 248.6 / ELITE), `KAST %` (IMPACT / 74.2% / CONSISTENT), `FIRST BLOOD / RD` (OPENING / 0.19 / +3.2% EXP).
4. **RR chart:** `Trajetória RR • Últimas 20 Partidas`, `NET: +144 RR`, anotações `20 PARTIDAS ATRÁS (-66 RR / ASC 2)`, `ASC 3 PROMOTION THRESHOLD`, `ATUAL: 78 RR (ASC 3)`.
5. **`Histórico Recente (Últimos 5 Jogos)`:** selo `CAMADA 2 TELEMETRY PARSED`, `STATUS`; colunas `AGENTE/MAPA/PLACAR/K/D/A/HS%/RR DELTA`; linhas `VITÓRIA/DERROTA`.
6. **Insights:** `// FIRST PICK WIN RATE: +3.2% 78.4%`, `// CLUTCH SURVIVAL RATE: 1v1 62%`, `// DISCIPLINA ECONÔMICA (ROUND BÔNUS)`, `// DELAY DE COBERTURA EM SMOKES 4.8s` → `InsightList` (strength/weakness).
7. **`// PROTOCOL ADVICE`:** 3 `CoachingTip` (prioridade alta/crítico/rotina) com `IMPACTO ESTIMADO`.
8. **AI prompt box:** input (`PROMPT TOKEN: 4.2k`, `MODEL: MINIMAX-VAL-03`, `CTRL+ENTER`, `Enviar Consulta`) + bloco `// RESPOSTA DO MOTOR MINIMAX` — hoje isso só existe no `/console`.
9. **`MATCH PIPELINE STATUS`:** `HENRIKDEV REALTIME LOGS: OK`, `VALORANT CLIENT HOOK: CONNECTED`, `CALC ENGINE: v4.2 MATRIX`, `SERVER: SA-BRAZIL-1`, `TICKS: 128HZ PARITY` + estados de sync.

### C.2 Dado → contrato

Disponível: `combat.raw_metrics` (kdr, acs, hsPercentage, kast, firstBloods, rounds, matches), `RrHistoryPoint` (rr, delta, tier, tierId), `MatchSummary` (score, kda, hsPercentage), `streaks`, `combat.evaluation`, `combat.coaching_hooks`, `PlayerOverview.player.level`.
**Sem dado:** peak rank "IMMORTAL 1 (ACT 8)", médias de elo/% (`TOP 8%`, `BR AVG 21%`, `ELITE`, `CONSISTENT`), clutch survival, disciplina econômica, delay de smokes, win prob, narrativa de IA, server/ticks.

### C.3 Tarefas

- [ ] C.3.1 Faixa de contexto: só campos reais (região/plataforma/nível); resto omitir.
- [ ] C.3.2 `PlayerHeader`: incluir nível + verificado (já feito) e, se calcular, `peak rank` (futuro); botões de ação.
- [ ] C.3.3 KPI tiles ricos via `KpiMetric`/`StatCard` (3 linhas) usando **apenas** dado existente; linhas sem dado omitidas.
- [ ] C.3.4 `RrTrendChart`: anotações de eixo (limiar de promoção / "N partidas atrás") se deriváveis de `tierId`+`rr` (futuro), senão apenas `NET` e `Atual`.
- [ ] C.3.5 Histórico: ajustar rótulos/status; manter colunas atuais (já alinhado).
- [ ] C.3.6 Ligações `InsightList` + `CoachingTip` a `combat.evaluation`/`coaching_hooks` (dado real) — sem inventar impacto estimado.
- [ ] C.3.7 AI prompt box: reutilizar o chat do `/console` como sandbox **rotulado demo** na página do perfil (decisão do dono: pode mostrar rotulado).
- [ ] C.3.8 `MATCH PIPELINE STATUS`: só o que é verdadeiro do ambiente; caso contrário omitir.

**DoD Fase C:** overview fiel, sem fabricação; testes atualizados.

---

## FASE D — Shell global + Landing (+ polimento do Console)

Arquivos: `src/components/layout/{top-nav,app-top-nav,app-shell,system-status-bar,app-footer}.tsx`, `src/app/home-landing.tsx`, `src/components/home/**`, `src/app/console/console-view.tsx`.

### D.1 Shell (todas as telas)

- Nav do Stitch: `Visão Geral` · `Partidas & Breakdown` · `Agentes & Mapas` · `Console API & IA` + ícone busca + chip de região `BR/LATAM` + notificações + chip do jogador conectado (`NEXUS#BR1 / Ascendant 3`).
- Faixa: `// MOTOR TÁTICO v4.2 • POWERED BY MINIMAX AI • 3-LAYER TELEMETRY PIPELINE` · `LATÊNCIA: <150ms` · `RIOT v9.11 COMPLIANT`.
- Footer: `VALORANT.COACH // TELEMETRY MATRIX • PROTOCOL V4.2.0` · `LATENCY: 12MS` · `API REFRESH: SYNCED` · copyright.
- **Decisão de produto pendente (⚠):** hoje o app é público/per-jogador (`Busca / Dashboard / Console`). O Stitch é um dashboard de **um** jogador conectado. Definir se renomeamos as abas/`chip do jogador` ou mantemos a navegação atual (ver §7). **Não** inventar identidade conectada se não houver sessão.

### D.2 Landing (`/`)

- Elementos Stitch: hero (chip + heading + console de busca com **select de região** + botão `BUSCAR JOGADOR & CALCULAR` + helper), modal de ingestão 3-layer, cards de pipeline (`FASE 01/02/03` + bloco `EFICIÊNCIA DE TOKEN COMPUTACIONAL: 98.5% REDUÇÃO / ZERO DATA LOSS`), módulos `MOD_01..04`, strip `LATÊNCIA API / COMPUTAÇÃO 3-LAYER / JOGADORES INDEXADOS / PATCH RIOT` + link `DOCUMENTAÇÃO API & CONSOLE`, footer.
- **Perfis demo:** o Stitch mostra 4 (fictícios). O app usa **1 perfil real** (`twmz#tower`) por decisão do dono — **manter** e não reintroduzir fictícios.
- Tarefas: alinhar rótulos/estrutura ao Stitch; adicionar o bloco de eficiência de tokens; usar tokens/hairline/sombra novos; conferir contraste.

### D.3 Console (`/console`)

- Já próximo. Ajustes: `Model: MiniMax-01` vs `MINIMAX-VAL-03` (escolher 1 e padronizar com o resto), payload/`console-data.ts` (hoje ainda cita `NEXUS#BR1` — ok como payload **simulado** rotulado; confirmar), tokens visuais novos.

**DoD Fase D:** shell + landing + console no Protocol Precision; navegação coerente; sem dados fabricados.

---

## 3. Inventário de arquivos afetados (resumo)

- Fundação: `src/app/globals.css`, `src/app/layout.tsx`, `DESIGN.md`, `src/app/design-system/showcase.tsx`.
- Partida: `src/app/matches/[matchId]/match-view.tsx`, `src/components/match/**`, `src/services/analytics/**`.
- Agentes/Mapas: `src/app/players/[region]/[name]/[tag]/profile-view.tsx`, `src/components/agents/**`, `src/components/ui/filter-bar/**`, `src/services/analytics/agent-map-profiles.ts`.
- Visão Geral: `.../profile-view.tsx`, `src/components/player/**`, `src/components/ui/{kpi-metric,stat-card,insight-list,coaching-tip}`, `src/components/charts/**`, `src/services/analytics/**`.
- Shell/Landing/Console: `src/components/layout/**`, `src/app/home-landing.tsx`, `src/components/home/**`, `src/app/console/**`.
- Primitivas novas prováveis: barras de benchmark (agentes), utilitários de sombra dura.

---

## 4. Regras de dados (obrigatório)

- **Nunca** fabricar números/estados. Campo sem suporte → **omitir** ou `—`.
- Todo cálculo/agregação mora em `src/services/analytics/**` (cobertura **100%**); componentes só renderizam.
- Conteúdo demonstrativo (chat sandbox, payload do console, perfis demo) **rotulado** como demo/simulado.
- Sem `.env`; secrets via Infisical (lembrar do pass-through no `docker-compose.yml` para var nova).

## 5. Definition of Done (por fase)

- [ ] `npm run typecheck` limpo.
- [ ] `npm test` verde (TDD: teste antes da implementação).
- [ ] `npm run test:coverage` com `src/services/analytics/**` em 100%.
- [ ] Verificação visual (Playwright) da rota contra o screenshot Stitch; sem erros no console.
- [ ] Sem dados fabricados; labels em PT-BR consistentes.
- [ ] Commit atômico com mensagem `feat(...)`/`style(...)`/`fix(...)`.

## 6. Trabalho futuro (cálculos reais) — backlog

Estes campos das telas Stitch ficam `—`/omitidos até existir cálculo/contrato, **planejados** pelo dono:
- Meios-placar ATK/DEF, split ATK/DEF por mapa, rating/ECON rating/KAST%/FK-FD/ECON por jogador.
- Tags econômicas por round (pistol/bônus/full-buy/eco), conversões, créditos poupados.
- Probabilidade de vitória (pré/pós-lance).
- Benchmark por elo (top %, médias), first-blood/util metrics por agente, peak rank.
- Narrativa de IA (diagnóstico de round, coaching).

## 7. Riscos / decisões em aberto

1. **Fonte Geist + build Docker:** `next/font/google` baixa no build; validar rede no container ou usar o pacote `geist` (self-hosted). JetBrains Mono/Space Grotesk idem.
2. **Troca global de tokens** afeta todas as páginas e o `/design-system`; pode quebrar contraste e alguns testes de texto — tratar na Fase 0 e revisar `tests/**`.
3. **Navegação do shell** (app público vs. dashboard de jogador único do Stitch) é decisão de produto — **confirmar com o dono** antes da Fase D.
4. **Sombra dura/hairline preta** em tabelas densas pode reduzir legibilidade; validar em telas pequenas (grid mobile do doc: gutters 0.5rem).
5. **Cobertura 100% analytics:** qualquer cálculo novo de Partida/Agentes precisa de testes exaustivos (branches, nulos).
6. **Imagens HTML de referência** em `/tmp/opencode/stitch-ref` são efêmeras — re-baixar via `tools.stitch.*` se necessário.
