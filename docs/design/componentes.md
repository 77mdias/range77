# Componentes

Catálogo por pasta (`src/components/`). Cada pasta expõe um `index.ts`
(barrel); `layout/` é a exceção. Componentes são **render-only** — nenhum
cálculo mora aqui.

## `ui/` — primitivas do design system

| Componente | Papel |
| --- | --- |
| `button/` | `primary`/`secondary`/`ghost`, sizes, `loading` |
| `badge/` | rótulo `win`/`loss`/`accent`/`neutral` |
| `card/` | superfície com header + slot de ação |
| `icon/` | 16 glifos SVG inline (server-safe) |
| `status-dot/` | `live`/`idle`/`square`/`square-accent` |
| `tag-label/` | rótulo mono com prefixo `//` |
| `coaching-tip/` | callout com borda esquerda acento + prioridade |
| `filter-bar/` | `FilterBar`/`FilterLabel`/`FilterSelect`/`FilterCheckbox` (client) |
| `info-callout/` | nota explicativa com ícone |
| `insight-list/` | pontos fortes/fracos |
| `kpi-metric/` / `kpi-tile/` | número de destaque / célula do strip |
| `match-row/` | linha de partida |
| `progress-bar/` | barra 0–100 com marcador de benchmark |
| `search-bar/` | select de região + `Nome#Tag` com validação (client) |
| `section-header/` | título com marcador e anotação `//` |
| `skeleton/` | bloco pulsante |
| `sparkline/` (+ `geometry.ts`) | SVG puro com cor por tendência |
| `stat-card/` | número + delta + slot sparkline |
| `states/` | `EmptyState` / `ErrorState` (consome `ApiErrorBody`) |
| `table/` | `Table`/`TableHead`/`TableBody`/`TableRow`/células |
| `tabs/` (+ `tabs.logic.ts`) | tabs acessíveis com `ViewTransition`/`Activity` |
| `win-probability-bar/` | comparação pré/pós |

## `layout/` — shell global

- `app-shell.tsx` (Server) — `AppTopNav` + `<main>` + `AppFooter`.
- `app-top-nav.tsx` (Client) — resolve a **nav contextual** por `usePathname`.
  Dentro de `/players/{region}/{name}/{tag}`: Visão Geral · Partidas &
  Breakdown · Agentes & Mapas · Console. Fora: apenas Busca e Console.
  Helpers exportados: `resolveNavItems`, `resolveActiveHref` (prefixo mais
  longo vence, hash ignorado).
- `top-nav.tsx` (Server) — header sticky; `nav-user.tsx` (Server async) — chip
  do jogador conectado (sempre em `<Suspense>` no layout).
- `system-status-bar.tsx` / `app-footer.tsx` — faixas de status/rodapé.

## `home/` — landing

`search-console`, `search-ingestion-modal`, `demo-profile-grid`,
`feature-module-card`, `live-status-strip`.

## `match/` — tela de partida

| Componente | Papel |
| --- | --- |
| `scoreboard-table.tsx` | tabela telemétrica: `<colgroup>` + `table-fixed`, cabeçalho por time, faixa de MMR, linha "VOCÊ". Props: `teams`, `rankRange?`, `ariaLabel?` |
| `round-timeline.tsx` | fita de rounds (kind, lado, PIST, separador do 2º half, placar, resumo) |
| `match-meta-bar.tsx` | fila/mapa/duração/região/match id + chip ΔRR |
| `mvp-callout.tsx` | destaque do MVP com card quadrado + Rating/KDA/First Kills |
| `round-diagnosis.tsx` | telemetria de um lance (veredito + win-prob) |
| `round-selector.tsx` (client) | tabs de rounds para diagnóstico |
| `score-banner.tsx` | resultado final + halves + thumbnail do mapa |
| `tactical-map.tsx` (client) | overlay SVG do mapa (zonas/rota/kills) |
| `weapon-card.tsx` | eficiência de arma (`meter` opcional) |

`src/app/matches/[matchId]/match-view.tsx` compõe a tela e delega a matemática
a `src/services/analytics/**`.

## `player/`

`player-header.tsx` (identidade, rank, ações) e `match-history-table.tsx`.

## `agents/`

`agent-card.tsx` (tier main/solid/bottleneck), `map-card.tsx`
(best/good/stable/neutral/unfavorable/worst + splits DEF/ATK), `benchmark-bar.tsx`
(jogador × elo).

## `ai/`

`ai-coach-terminal`, `ai-query-form` (client), `ai-callout`, `chat-message`,
`chat-input-bar` (client), `code-viewer` (client + `highlight.ts`),
`layer-tabs` (client), `pipeline-flow`, `pipeline-step-card`.

## `charts/` — apenas desenham

`rr-trend-chart.tsx` (+ `rr-trend-geometry.ts` puro), `round-heatmap.tsx`
(visx), `agent-radar.tsx` (visx), `map-winrate-bars.tsx` (visx),
`trend-line.tsx` (visx). Toda transformação vem de
`src/services/analytics/chart-transforms.ts`.
