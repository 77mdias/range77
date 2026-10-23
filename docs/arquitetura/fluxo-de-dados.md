# Fluxo de dados

Da fonte até o pixel: como um dado de partida chega à tela sem nunca ser
inventado.

## Pipeline geral

```
Pedido (página / Route Handler)
        │  src/services/access/profile-access.ts   ← consentimento ANTES de tudo
        ▼
src/lib/cache/tracker.ts ('use cache', fonte na tag)
        │
        ▼
TrackerSource ativa (TRACKER_DATA_SOURCE) — src/services/tracker/sources/
        │
        │  mock (padrão): generate*() → DTO Riot (contracts/riot.ts)
        │                 → normalize-riot.ts + catalog.ts
        ▼
Contrato interno  ──►  src/contracts/tracker.ts (estável, vendor-independent)
        │
        │  src/services/analytics/** (cálculo puro, 100% coberto)
        ▼
Métricas derivadas  (KAST, Rating, ADR, halves, timeline, economia, posições...)
        │
        ├─ src/services/coaching/**  ──►  CoachInsight de 3 camadas (+ vetores táticos)
        ▼
Páginas / Route Handlers  ──►  componentes React (render-only)
```

## Etapas em detalhe

### 1. Consentimento — `src/services/access/`

Toda superfície de dado de jogador chama `resolveProfileAccess` com o viewer
da sessão **antes** de qualquer cache ou fonte. `private` → estado neutro /
`404 PROFILE_NOT_PUBLIC`, sem tocar a fonte. Ver
[consentimento e RSO](./consentimento-e-rso.md).

### 2. Fonte — `TrackerSource`

`getTrackerSource()` devolve a fonte ativa. A padrão é a **simulada**, que
gera DTOs no formato oficial VAL-MATCH-V1 e os normaliza pelo mesmo caminho
que a API real vai usar. Detalhes em [fontes de dados](./fontes-de-dados.md).

### 3. Contratos

- `src/contracts/riot.ts` — espelho do payload oficial da Riot (+ tipos
  `Mock*` sem equivalente oficial).
- `src/contracts/tracker.ts` — forma normalizada estável consumida por
  analytics e páginas (inclui posições, spike e economia por round).
- `src/contracts/access.ts` — copy/código do estado neutro.
- `src/contracts/coach.ts` — `CoachInsight` + `ApiErrorBody`.
- `src/contracts/henrikdev.ts` — espelho da HenrikDev (fonte guardada) e
  `MatchCombatStats`.

Ver [contratos](../dominio/contratos.md).

### 4. Normalização — `src/services/riot/normalize-riot.ts`

- `normalizeRiotMatchToSummary` / `ToDetail` / `ToCombat`, `normalizeRiotEconomy`,
  `normalizeRiotRank`, `normalizeRiotRrHistory`.
- `roundNum` cru (0-based) → `roundNumber` 1-based; `killerLocation` = entrada
  do killer em `playerLocations`; partidas não competitivas ou incompletas
  viram `null`.
- `catalog.ts` resolve ids de mapa/agente/arma/armadura/tier/temporada por
  tabela explícita (id desconhecido → `null`).

### 5. Orquestração — `src/services/tracker/**`

- `buildPlayerOverview` — `source.getPlayerSample` alimenta overview,
  agregações (agente/mapa/streak/tendência), envelope de combate, RR, card e
  rank. Na fonte simulada também calcula, **no servidor**, `tactical`
  (zonas de morte + disciplina econômica) e `deathHeatmaps`; os `details`
  brutos (~5 MB) **nunca** saem do serviço nem atravessam o `'use cache'`.
- `source.getMatchDetail(region, matchId, focus)` — detalhe da partida na
  perspectiva do jogador do `?player=`.

### 6. Cálculo — `src/services/analytics/**`

Funções puras, sem I/O: KAST, Rating ValCoach, ADR, entry, consistência,
evolução, agregações, timeline, halves, armas, estatísticas Riot por round,
projeção de minimapa, tipo de compra, disciplina econômica, heatmap de mortes
e vetores táticos. Fórmulas em [métricas](../dominio/metricas.md).

### 7. Coaching — `src/services/coaching/**`

Monta o envelope `CoachInsight` a partir das métricas; com dados simulados o
envelope ganha `tactical` (só rótulos e números). O terminal de coach da tela
é **simulado**: o repositório ainda não tem cliente de LLM.

### 8. Apresentação

Páginas RSC leem via `src/lib/cache/tracker.ts` e passam dados já mastigados
para componentes, que **apenas desenham** (mapa de abates, economia por
round, heatmap). Toda tela com dado simulado mostra o selo `DADOS SIMULADOS`
e o banner global.

## Regra transversal

Nenhum número exibido é calculado em componente. Se um dado não existe ou não
é derivável, ele aparece como `—` ou é omitido — nunca preenchido com um valor
plausível. Ver [convenções](../desenvolvimento/convencoes.md).
