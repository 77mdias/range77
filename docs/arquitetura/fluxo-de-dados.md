# Fluxo de dados

Da chamada externa até o pixel: como um dado da HenrikDev chega à tela sem
nunca ser inventado.

## Pipeline geral

```
HenrikDev API (v4/v2/v1)
        │  src/services/henrikdev/client.ts
        ▼
Payload cru  ──►  src/contracts/henrikdev.ts (espelho do formato externo)
        │
        │  src/services/henrikdev/normalize*.ts
        ▼
Contrato interno  ──►  src/contracts/tracker.ts (estável, vendor-independent)
        │
        │  src/services/analytics/** (cálculo puro, 100% coberto)
        ▼
Métricas derivadas  (KAST, Rating, ADR, halves, timeline, agregações...)
        │
        ├─ src/services/coaching/**  ──►  CoachInsight de 3 camadas (chatbot)
        ▼
Páginas / Route Handlers  ──►  componentes React (render-only)
```

## Etapas em detalhe

### 1. Integração externa — `src/services/henrikdev/client.ts`

`createHenrikDevClient({ apiKey, baseUrl?, timeoutMs?, fetchFn? })` expõe:

| Método | Endpoint |
| --- | --- |
| `fetchPlayerMatches` | `GET /valorant/v4/matches/{affinity}/{platform}/{name}/{tag}` |
| `fetchMatchById` | `GET /valorant/v4/match/{affinity}/{matchId}` |
| `fetchMmrHistory` | `GET /valorant/v2/mmr-history/{affinity}/{platform}/{name}/{tag}` |
| `fetchAccount` | `GET /valorant/v1/account/{name}/{tag}` |
| `fetchMmr` | `GET /valorant/v2/mmr/{affinity}/{platform}/{name}/{tag}` |

- Autenticação: header `Authorization: <apiKey>` (sem `Bearer`).
- Timeout de 15s via `AbortSignal.timeout` no mesmo `fetch` que consome o body.
- Sem retry. Falhas viram `HenrikDevApiError`; o **status é embutido no `name`**
  (`HenrikDevApiError:404`) porque a fronteira `'use cache'` do Next só
  preserva `name`/`message` e destrói `instanceof`.

### 2. Contratos

- `src/contracts/henrikdev.ts` — espelha o payload cru (extras tolerados).
- `src/contracts/tracker.ts` — forma normalizada estável consumida por
  analytics e páginas.
- `src/contracts/coach.ts` — `CoachInsight` + `ApiErrorBody`.

Ver [contratos](../dominio/contratos.md).

### 3. Normalização — `src/services/henrikdev/normalize*.ts`

- `normalize.ts` → `MatchCombatStats[]` (insumo da analytics de combate).
- `normalize-tracker.ts` → `MatchSummary`, `MatchScoreboardRow`,
  `MatchRound`, `RoundOutcome[]`, `KillEvent[]`, `MatchDetail`.
- Funções tolerantes a ausência: campos não computáveis viram `null`; partidas
  que não passam nos filtros (não competitivas, incompletas, jogador ausente)
  são silenciosamente omitidas.

### 4. Orquestração — `src/services/tracker/**`

- `buildPlayerOverview` — um único `fetchPlayerMatches` alimenta overview,
  agregações (agente/mapa/streak/tendência), snapshot de combate, histórico de
  RR, card e rank (estes três best-effort).
- `getMatchDetail` — cache durável Neon (TTL 24h) → miss: HenrikDev → grava e
  normaliza. Um hit **não** exige `HENRIKDEV_API_KEY`.
- `getPlayerCard` — best-effort (`null` quando indisponível).

### 5. Cálculo — `src/services/analytics/**`

Funções puras, sem I/O, cobrindo KAST, Rating ValCoach, ADR, entry,
consistência, evolução, agregações do tracker, timeline de rounds, halves,
agregações de armas etc. Fórmulas em [métricas](../dominio/metricas.md).

### 6. Coaching — `src/services/coaching/**`

Monta o envelope `CoachInsight` (combate e evolução) a partir das métricas.
A persistência de snapshots é **write-through best-effort**: falha de escrita
não derruba a resposta.

### 7. Apresentação

Páginas RSC leem via `src/lib/cache/tracker.ts` (`'use cache'`) e passam os
dados já mastigados para componentes. Componentes de chart usam as
transformações de `src/services/analytics/chart-transforms.ts` e **apenas
desenham**.

## Regra transversal

Nenhum número exibido é calculado em componente. Se um dado não existe ou não
é derivável, ele aparece como `—` ou é omitido — nunca preenchido com um valor
plausível. Ver [convenções](../desenvolvimento/convencoes.md).
