# Dados simulados no formato Riot + consentimento (RSO) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O app inteiro passa a rodar sobre dados simulados no formato oficial da Riot (VAL-MATCH-V1), com telas novas de posição/economia e um modelo de acesso por consentimento (RSO simulado + perfil público opt-in), pronto para o pedido da Production API Key.

**Architecture:** Uma porta `TrackerSource` devolve dados já no contrato interno (`src/contracts/tracker.ts`). A implementação `mock` gera DTOs no formato Riot (`src/contracts/riot.ts`) e os passa pelo MESMO `normalize-riot.ts` que a API real usará; a implementação `henrikdev` embrulha o código atual (guardado, fora do caminho padrão). Acesso é decidido por uma política pura (`owner | public | demo | private`) aplicada em páginas e rotas.

**Tech Stack:** Next 16.4 (App Router, Cache Components, `src/proxy.ts`), React 19, TypeScript, Better Auth 1.7.7, Drizzle + Neon, Vitest 4 (cobertura 100% em `src/services/analytics/**`).

**Spec:** `docs/superpowers/specs/2026-10-21-riot-production-mock-data-design.md`

## Global Constraints

- Ler `AGENTS.md` inteiro antes de começar; todos os invariantes valem (Cache Components com `<Suspense>`, `export const instant = false` em páginas com params assíncronos, NavUser FAIL-SOFT, `<title>` com filho único, `next/navigation` mockado em testes).
- Antes de usar qualquer API do Next, ler o guia em `node_modules/next/dist/docs/`.
- Nenhum cálculo fora de `src/services/analytics/**`; essa pasta mantém **100%** de cobertura. Componentes de chart/mapa só renderizam.
- Mock é **determinístico**: mesma entrada (Riot ID em minúsculas / `matchId`) → saída idêntica byte a byte.
- Mock só usa nomes **fictícios**. Proibido usar Riot IDs reais (ex.: `twmz#tower`, pros) em mocks, fixtures novas ou na home.
- Toda tela com dado simulado mostra o selo com o texto exato `DADOS SIMULADOS` e o banner global com o texto exato `Protótipo aguardando a Production API Key da Riot — todos os dados de partida são simulados.`
- Nada de logo/cores/layout copiados da Riot na tela de autorização; o título exato é `Riot Sign-On (simulado)`.
- Campo marcado [a confirmar] no spec que **não** existir na referência oficial (Task 1) sai do escopo — remova-o das tasks seguintes em vez de simulá-lo. Nunca simular linha do tempo de habilidades.
- Variável nova `TRACKER_DATA_SOURCE` (`mock` | `riot` | `henrikdev`; default `mock`) percorre a cadeia do `AGENTS.md`: `src/config/env.ts` + `docker-compose.yml` (`- TRACKER_DATA_SOURCE`) + avisar o dono (Infisical/Vercel opcionais por causa do default). `henrikdev` existe só para o código guardado continuar testável; não é documentado como opção de produto.
- Migrações: sempre `npm run db:generate` gerando arquivo novo em `drizzle/`; nunca editar migração existente.
- Dependências novas: proibidas sem necessidade; se surgir, lockfile com `npx npm@10 install --package-lock-only` + `npx npm@10 ci --dry-run`.
- Commits pequenos por task, mensagem em português no estilo do repo (`feat(escopo): ...`), com a linha `Co-Authored-By` da sessão.
- Testes: `npx vitest run <caminho>`; cobertura: `npx vitest run --coverage`; tipos: `npx tsc --noEmit`.

## Review Focus

1. **Riot ID com espaço/acentos/caixa diferente** (`Next To Nothing#NOWAY` vs `next to nothing#noway`) → mesmo jogador simulado, mesmos dados, mesmo estado de acesso. Teste em Task 2 (`seedFromRiotId` case-insensitive) e Task 13.
2. **Perfil que ficou privado** enquanto está nos recentes, seguido no dashboard ou aberto em outra aba → estado neutro idêntico ao de conta inexistente; nenhuma rota/API vaza dados nem existência. Testes em Tasks 13, 14 e 17.
3. **Callback RSO com `state` ausente/diferente, `code` adulterado ou usuário deslogado** → nada é vinculado e o usuário vê erro claro. Teste em Task 15.
4. **Produção sem `TRACKER_DATA_SOURCE`** → mock (nunca crash); `riot` sem chave → `CONFIG_ERROR` tratado pelo estado de erro existente, não página branca. Teste em Task 4.
5. **Partidas com overtime (round 25+)** → economia, mapa de abates e lados (troca a cada round no OT) corretos; créditos nunca acima de 9000. Testes em Tasks 2, 7 e 9.

---

## Fase A — App inteiro sobre dados simulados

Ao fim da Fase A, todas as telas atuais funcionam com `TRACKER_DATA_SOURCE` ausente, sem nenhuma chamada à HenrikDev.

### Task 1: Contrato cru da Riot (`src/contracts/riot.ts`) congelado contra a referência oficial

**Files:**
- Create: `src/contracts/riot.ts`
- Create: `tests/fixtures/riot/match-v1.ts` (uma partida completa no formato oficial, nomes fictícios)
- Create: `docs/referencia/riot-val-match-v1.md` (tabela campo → tipo → existe? → fonte)
- Test: `tests/contracts/riot-fixture.test.ts`

**Interfaces:**
- Produces (nomes seguem a referência oficial; ajuste à grafia oficial se divergir e registre no `.md`):
  `RiotAccountDto { puuid; gameName; tagLine }`,
  `RiotMatchlistDto { puuid; history: { matchId; gameStartTimeMillis; queueId }[] }`,
  `RiotMatchDto { matchInfo; players; teams; roundResults }`,
  `RiotMatchInfoDto { matchId; mapId; gameLengthMillis; gameStartMillis; isCompleted; queueId; seasonId; ... }`,
  `RiotPlayerDto { puuid; gameName; tagLine; teamId; characterId; competitiveTier; stats: RiotPlayerStatsDto | null }`,
  `RiotRoundResultDto { roundNum; winningTeam; roundResult; bombPlanter?; bombDefuser?; plantRoundTime?; plantSite?; plantLocation?; plantPlayerLocations?; defuseRoundTime?; defuseLocation?; defusePlayerLocations?; playerStats: RiotPlayerRoundStatsDto[] }`,
  `RiotPlayerRoundStatsDto { puuid; kills: RiotKillDto[]; damage: RiotDamageDto[]; score; economy: RiotEconomyDto | null; ability: RiotAbilityDto | null }`,
  `RiotKillDto { timeSinceGameStartMillis; timeSinceRoundStartMillis; killer; victim; victimLocation: RiotLocationDto; assistants: string[]; playerLocations: RiotPlayerLocationsDto[]; finishingDamage }`,
  `RiotLocationDto { x: number; y: number }`, `RiotPlayerLocationsDto { puuid; viewRadians; location }`,
  `RiotEconomyDto { loadoutValue; weapon; armor; remaining; spent }`,
  `RiotRankedDto` / `RiotMmrHistoryPointDto` — **só** se existir endpoint oficial equivalente; senão o mock expõe rank/RR por um tipo próprio `MockRankSnapshot` documentado como "sem equivalente oficial — some quando a chave chegar".

- [ ] **Step 1: Verificar a referência oficial** — abrir `https://developer.riotgames.com/apis#val-match-v1` (e `account-v1`, `val-ranked-v1`) no navegador e preencher `docs/referencia/riot-val-match-v1.md`. Para cada linha [a confirmar] do spec §4, marcar `existe` / `não existe`. Se a página não puder ser lida, PARE e peça ao dono para colar a referência.
- [ ] **Step 2: Escrever o teste** `tests/contracts/riot-fixture.test.ts`: `it('fixture oficial tem 10 jogadores, rounds coerentes e localizações em todo abate')` — asserts: `players.length === 10`; todo `roundResults[i].roundNum === i`; todo kill tem `victimLocation` e `playerLocations.length >= 1`; `economy.spent <= 9000`.
- [ ] **Step 3:** rodar `npx vitest run tests/contracts/riot-fixture.test.ts` → FAIL (módulo inexistente).
- [ ] **Step 4:** escrever `src/contracts/riot.ts` (só tipos, comentário de cabeçalho citando a referência e a data) e a fixture.
- [ ] **Step 5:** rodar o teste → PASS; `npx tsc --noEmit` → sem erros.
- [ ] **Step 6:** commit `feat(riot): contrato cru VAL-MATCH-V1 congelado contra a referência oficial`.

### Task 2: Gerador determinístico de partidas simuladas

**Files:**
- Create: `src/services/riot/mock/rng.ts`, `roster.ts`, `map-zones.ts`, `economy.ts`, `generate-match.ts`, `generate-account.ts`, `index.ts`
- Test: `tests/services/riot/mock/*.test.ts`

**Interfaces:**
- Consumes: tipos de Task 1.
- Produces:
  - `seedFromRiotId(name: string, tag: string): number` (FNV-1a sobre `${name}#${tag}`.toLowerCase())
  - `createRng(seed: number): { next(): number; int(min: number, max: number): number; pick<T>(items: readonly T[]): T }` (mulberry32)
  - `MOCK_MAPS: readonly { mapId: string; name: string; zones: readonly MapZone[] }[]` com `MapZone { label: string; side: 'attack' | 'defense' | 'any'; polygon: readonly RiotLocationDto[] }` — pelo menos Ascent, Bind, Haven, Lotus, Sunset; coordenadas de mundo compatíveis com os multiplicadores da Task 8.
  - `generateAccount(name: string, tag: string): RiotAccountDto` (`puuid` = UUID v4-like derivado da seed)
  - `generateMatchlist(account: RiotAccountDto, count: number): RiotMatchlistDto`
  - `generateMatch(matchId: string, focus: RiotAccountDto): RiotMatchDto` (o `focus` está sempre entre os 10 jogadores)
  - `generateRankSnapshot(account: RiotAccountDto): MockRankSnapshot` e `generateRrHistory(account, count): MockRrPoint[]`
  - `DEMO_ACCOUNT = { gameName: 'ValCoachDemo', tagLine: 'DEMO', region: 'br' }`

- [ ] **Step 1: Testes de invariantes** (um arquivo por módulo). Nomes e asserts obrigatórios:
  - `seedFromRiotId ignora caixa`: `seedFromRiotId('Next To Nothing','NOWAY') === seedFromRiotId('next to nothing','noway')`.
  - `generateMatch é determinístico`: `JSON.stringify(generateMatch(id, acc)) === JSON.stringify(generateMatch(id, acc))`.
  - `placar fecha`: um time com 13 e outro ≤ 11, **ou** overtime com diferença de 2 e total ≥ 26 rounds.
  - `overtime existe na amostra`: em 200 `matchId`s gerados, ≥1 partida com `roundResults.length > 24`.
  - `KDA bate com a timeline`: para cada jogador, soma de kills nos `playerStats` == kills no `stats` agregado; idem mortes e assistências.
  - `economia plausível`: `spent <= 9000`, `remaining >= 0`, `spent + remaining <= 9000`, round 1 e 13 (pistol) com `loadoutValue <= 800`.
  - `posições dentro do mapa`: todo `victimLocation` está dentro de algum `polygon` do mapa da partida.
  - `foco presente`: `generateMatch(id, acc).players.some(p => p.puuid === acc.puuid)`.
  - `nenhum nome real`: nomes do `roster` não contêm `twmz`, `tower`, `NOWAY`.
- [ ] **Step 2:** `npx vitest run tests/services/riot/mock` → FAIL.
- [ ] **Step 3:** implementar. Regras que o teste não fixa: buy type do time decidido por créditos médios (≤ 2000 eco, ≤ 3900 force, senão full); bônus de derrota 1900/2400/2900; lados trocam no round 13 e a cada round no overtime; tempos de abate entre 5s e 100s, crescentes no round.
- [ ] **Step 4:** rodar → PASS.
- [ ] **Step 5:** commit `feat(riot): gerador determinístico de partidas simuladas no formato Riot`.

### Task 3: Normalizador `riot → tracker`

**Files:**
- Create: `src/services/riot/normalize-riot.ts`, `src/services/riot/catalog.ts` (`mapId`/`characterId`/`competitiveTier` → nomes, tabelas explícitas como `src/lib/valorant-assets.ts`)
- Test: `tests/services/riot/normalize-riot.test.ts`

**Interfaces:**
- Consumes: Task 1 (fixture) e Task 2 (gerador, para testes de volume).
- Produces:
  - `normalizeRiotMatchToSummary(match: RiotMatchDto, puuid: string, region: string): MatchSummary | null`
  - `normalizeRiotMatchToDetail(match: RiotMatchDto, region: string): MatchDetail`
  - `normalizeRiotMatchToCombat(match: RiotMatchDto, puuid: string): MatchCombatStats | null`
  - `normalizeRiotRank(snapshot: MockRankSnapshot | null): PlayerRankSummary | null` e `normalizeRiotRrHistory(points): RrHistoryPoint[]`

- [ ] **Step 1: Testes** contra a fixture da Task 1: `summary` com mapa/agente por nome (não UUID), `result` coerente com `winningTeam`, `firstBloods` derivado do menor `timeSinceRoundStartMillis` por round; `detail.kills` ordenados por `timeInMatchMs`; `detail.scoreboard.length === 10`; `kastPercentage` não nulo; partida `isCompleted: false` → `summary === null`; `queueId !== 'competitive'` → `null`. Teste de volume: 50 partidas geradas normalizam sem lançar.
- [ ] **Step 2:** rodar → FAIL. **Step 3:** implementar reaproveitando as funções puras de `src/services/analytics/**` (KAST, entry) — nada de cálculo novo aqui. **Step 4:** PASS.
- [ ] **Step 5:** commit `feat(riot): normalizador Riot → contratos do tracker`.

### Task 4: Porta `TrackerSource`, fontes `mock`/`henrikdev` e seleção por env

**Files:**
- Create: `src/services/tracker/source.ts`, `src/services/tracker/sources/mock-source.ts`, `src/services/tracker/sources/henrikdev-source.ts`, `src/services/tracker/sources/index.ts`
- Modify: `src/services/tracker/player-overview.ts`, `src/services/coaching/player-combat.ts`, `src/services/tracker/match-detail.ts`, `src/services/tracker/player-card.ts`, `src/lib/cache/tracker.ts`, `src/app/api/players/[region]/[name]/[tag]/route.ts`, `src/config/env.ts`, `docker-compose.yml`, `docs/desenvolvimento/variaveis-de-ambiente.md`
- Test: `tests/services/tracker/sources/*.test.ts`, `tests/config/env.test.ts` (estender); os testes existentes de overview/match-detail/combat continuam passando.

**Interfaces:**
- Produces:
  ```ts
  export interface PlayerSampleQuery { region: string; name: string; tag: string; size?: number; actSample?: ActSampleOptions }
  export interface PlayerSample {
    readonly matches: readonly MatchSummary[]; readonly combat: readonly MatchCombatStats[];
    readonly details: readonly MatchDetail[]; // Fase B usa; henrikdev devolve []
    readonly level: number | null; readonly cardSrc: string | null;
    readonly rank: PlayerRankSummary | null; readonly rrHistory: readonly RrHistoryPoint[];
  }
  export type TrackerSourceKind = 'mock' | 'riot' | 'henrikdev';
  export interface TrackerSource {
    readonly kind: TrackerSourceKind;
    getPlayerSample(query: PlayerSampleQuery): Promise<PlayerSample>;
    getMatchDetail(region: string, matchId: string): Promise<MatchDetail>;
    getPlayerCard(name: string, tag: string): Promise<string | null>;
  }
  export function getTrackerSource(env?: AppEnv): TrackerSource;      // sources/index.ts
  export function getTrackerSourceKind(env?: AppEnv): TrackerSourceKind;
  ```
  - `AppEnv.TRACKER_DATA_SOURCE: TrackerSourceKind` (parse com default `'mock'`; valor desconhecido → `EnvironmentValidationError`).
  - `buildPlayerOverview(params: { region; name; tag; size?; actSample?; source?: TrackerSource; snapshotStore? })` — mesmo retorno `PlayerOverview` de hoje.
  - `buildCombatInsightFromCombatStats(stats: readonly MatchCombatStats[], params: FinalizeCombatInsightParams): Promise<PlayerCombatInsight>` (extraído de `buildCombatInsightFromMatches`, que passa a delegar).
  - `riot` sem implementação ainda: `getTrackerSource` lança `EnvironmentValidationError('TRACKER_DATA_SOURCE=riot exige a Production API Key — ainda não disponível')`.
  - A `mock-source` resolve `matchId` gerado como `${puuidPrefix}-${index}` codificando o foco, para `getMatchDetail` regenerar a mesma partida sem estado.

- [ ] **Step 1: Testes**: `getTrackerSourceKind({...})` com ausente → `'mock'`; `'MOCK'` → `'mock'`; `'xpto'` → lança; `getTrackerSource` com `riot` → lança a mensagem acima. Mock source: `getPlayerSample` de `ValCoachDemo#DEMO` devolve `matches.length === size`, `rank !== null`; `getMatchDetail` de um `matchId` vindo de `matches[0]` devolve `detail.matchId` igual; Riot ID diferente na caixa → mesmas partidas. Henrik source: os testes atuais de `player-overview`/`match-detail` passam injetando `source: createHenrikDevSource(fakeClient)`.
- [ ] **Step 2:** FAIL. **Step 3:** implementar; o cache durável Neon (`match-cache-store`, `combat-snapshot-store`) só é usado pela henrik source; para `mock`, `snapshotStore` é `null`. `getCached*` em `src/lib/cache/tracker.ts` passam a chamar `getTrackerSource()` e incluem o `kind` na `cacheTag`. Registrar `TRACKER_DATA_SOURCE` em `env.ts` (`pickDefined`) e `docker-compose.yml`.
- [ ] **Step 4:** `npx vitest run` (suíte inteira) → PASS; `npx tsc --noEmit` → OK.
- [ ] **Step 5: Verificação manual:** com o dev server, abrir `/players/br/ValCoachDemo/DEMO`, `/players/br/ValCoachDemo/DEMO/breakdown` e uma partida do histórico; nenhuma requisição a `api.henrikdev.xyz` no log do servidor.
- [ ] **Step 6:** commit `feat(tracker): porta TrackerSource com fonte simulada padrão (HenrikDev guardada)`. Avisar o dono: `TRACKER_DATA_SOURCE` opcional no Infisical/Vercel.

### Task 5: Selo e banner de dados simulados

**Files:**
- Create: `src/components/ui/simulated-badge/simulated-badge.tsx` (+ `index.ts`), `src/components/layout/simulated-banner.tsx`
- Modify: `src/components/layout/app-shell.tsx`, `src/components/player/player-header.tsx` (ou o header equivalente), `src/app/(app)/matches/[matchId]/match-view.tsx`, `src/app/(app)/players/[region]/[name]/[tag]/breakdown-view.tsx`
- Test: `tests/components/ui/simulated-badge.test.tsx`, `tests/components/layout/app-shell.test.tsx`

**Interfaces:**
- Produces: `SimulatedBadge(): JSX` (texto exato `DADOS SIMULADOS`, `data-simulated-badge`); `SimulatedBanner({ visible }: { visible: boolean })`. `AppShell` recebe `simulated: boolean` vindo de `getTrackerSourceKind() === 'mock'` em `src/app/(app)/layout.tsx`.

- [ ] **Step 1: Testes**: badge renderiza o texto exato; `AppShell simulated` renderiza o texto exato do banner (Global Constraints); `simulated={false}` não renderiza.
- [ ] **Step 2:** FAIL. **Step 3:** implementar (estilo *Protocol Precision*: chip `font-hud text-label-xs uppercase`, borda `border-line`, fundo `bg-accent`). **Step 4:** PASS.
- [ ] **Step 5:** commit `feat(ui): selo e banner de dados simulados`.

## Fase B — Dados que só a Production Key dá

### Task 6: Contrato interno estendido (posições, plant/defuse, economia por round)

**Files:**
- Modify: `src/contracts/tracker.ts`, `src/services/riot/normalize-riot.ts`, `src/services/tracker/sources/mock-source.ts` (preencher `details`)
- Test: `tests/services/riot/normalize-riot.test.ts` (estender)

**Interfaces:**
- Produces (todos opcionais/anuláveis; HenrikDev continua compilando sem preenchê-los):
  ```ts
  export interface MapPoint { readonly x: number; readonly y: number }
  export interface PlayerPosition { readonly puuid: string; readonly location: MapPoint; readonly viewRadians: number }
  // KillEvent +
  readonly victimLocation?: MapPoint | null; readonly killerLocation?: MapPoint | null;
  readonly playerLocations?: readonly PlayerPosition[] | null;
  // MatchRound +
  readonly plant?: SpikeEvent | null; readonly defuse?: SpikeEvent | null;
  export interface SpikeEvent { readonly playerPuuid: string; readonly location: MapPoint; readonly timeInRoundMs: number; readonly site: string | null }
  export interface RoundEconomy { readonly roundNumber: number; readonly puuid: string; readonly teamId: string; readonly loadoutValue: number; readonly weapon: string | null; readonly armor: string | null; readonly spent: number; readonly remaining: number }
  // MatchDetail +
  readonly economy?: readonly RoundEconomy[] | null; readonly mapId?: string | null;
  readonly abilityCastsByRound?: readonly { roundNumber: number; puuid: string; casts: AbilityCastCounts }[] | null; // só se Task 1 confirmou
  ```
  `killerLocation` = posição do killer em `playerLocations` (não existe campo próprio na Riot).
- [ ] **Step 1: Testes**: todo kill da fixture normalizado tem `victimLocation` e `killerLocation`; `economy.length === rounds × 10`; round com plant tem `plant.site` e `plant.timeInRoundMs > 0`.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** commit `feat(tracker): posições, spike e economia por round no contrato interno`.

### Task 7: Analytics novas (100% de cobertura)

**Files:**
- Create: `src/services/analytics/map-projection.ts`, `src/services/analytics/buy-type.ts`, `src/services/analytics/economy-discipline.ts`, `src/services/analytics/death-heatmap.ts`, `src/services/analytics/tactical-vectors.ts`
- Test: `tests/services/analytics/{map-projection,buy-type,economy-discipline,death-heatmap,tactical-vectors}.test.ts`

**Interfaces:**
- Produces:
  - `projectToMinimap(point: MapPoint, t: MinimapTransform): { u: number; v: number }` com `MinimapTransform { xMultiplier; yMultiplier; xScalarToAdd; yScalarToAdd }` e fórmula `u = point.y * xMultiplier + xScalarToAdd`, `v = point.x * yMultiplier + yScalarToAdd` (u/v em 0..1, clamp).
  - `export type BuyType = 'pistol' | 'eco' | 'force' | 'full'` (em `buy-type.ts`).
  - `classifyBuy(loadoutValue: number, roundNumber: number): BuyType` — pistol nos rounds 1 e 13; eco `< 2000`; force `< 3900`; senão full.
  - `classifyTeamBuy(economy: readonly RoundEconomy[], teamId: string, roundNumber: number): BuyType` (média do time).
  - `export interface EconomyDiscipline { forcedWhileTeamSaved: number; savedWhileTeamBought: number; rounds: number; winRateByBuy: Record<BuyType, number | null> }`
  - `computeEconomyDiscipline(details: readonly MatchDetail[], puuid: string): EconomyDiscipline` (contagens absolutas + rounds avaliados; overtime incluído).
  - `computeDeathHeatmap(details: readonly MatchDetail[], puuid: string, mapId: string, gridSize = 16): number[][]` (contagem por célula em u/v).
  - `export interface TacticalVectors { topDeathZones: { label: string; deaths: number }[]; discipline: EconomyDiscipline }`
  - `buildTacticalVectors(details: readonly MatchDetail[], puuid: string, zonesByMap: Readonly<Record<string, readonly MapZone[]>>): TacticalVectors` (`label` = zona que contém o ponto; fora de todas → `'Outras áreas'`). `MapZone` é movido para `src/contracts/tracker.ts` (com `polygon: readonly MapPoint[]`) para analytics não importar o mock.
- [ ] **Step 1: Testes** com valores exatos: `classifyBuy(800, 1) === 'pistol'`, `classifyBuy(1999, 5) === 'eco'`, `classifyBuy(2000, 5) === 'force'`, `classifyBuy(3900, 5) === 'full'`; projeção de um ponto conhecido de Ascent com o transform da Task 8 cai em `u,v ∈ [0,1]`; clamp fora do mapa; partida com overtime conta rounds 25+; `rounds === 0` → `winRateByBuy` todo `null`.
- [ ] **Step 2–4:** FAIL → implementar → PASS; `npx vitest run --coverage` mostra 100% em `src/services/analytics/**`.
- [ ] **Step 5:** commit `feat(analytics): projeção de minimapa, tipo de compra, disciplina econômica e heatmap`.

### Task 8: Assets de minimapa

**Files:**
- Create: `public/assets/images/minimaps/<mapa>.png` (mapas do `MOCK_MAPS`), `src/lib/valorant-maps.ts`
- Test: `tests/lib/valorant-maps.test.ts`

**Interfaces:**
- Produces: `minimapFor(mapIdOrName: string): { src: string; transform: MinimapTransform } | null` (tabela explícita, mesmo padrão de `valorant-assets.ts`; nome/UUID fora da tabela → `null`).
- [ ] **Step 1:** baixar uma vez as imagens `displayIcon` e os multiplicadores de `https://valorant-api.com/v1/maps` para o repo (assets estáticos commitados; o app nunca chama esse host em runtime). Registrar a origem no cabeçalho de `valorant-maps.ts`.
- [ ] **Step 2: Teste**: todo mapa de `MOCK_MAPS` tem entrada; nome e UUID resolvem para o mesmo resultado; desconhecido → `null`; os arquivos referenciados existem em `public/`.
- [ ] **Step 3–4:** implementar → PASS. Ajustar os polígonos de `map-zones.ts` (Task 2) até o teste "posições dentro do mapa" e uma inspeção visual na Task 9 concordarem.
- [ ] **Step 5:** commit `feat(assets): minimapas e transformações por mapa`.

### Task 9: Tela da partida — mapa de abates e economia por round

**Files:**
- Create: `src/components/match/kill-map.tsx`, `src/components/match/round-economy.tsx`, `src/app/(app)/matches/[matchId]/round-selector.tsx` (ilha client)
- Modify: `src/app/(app)/matches/[matchId]/match-view.tsx`
- Test: `tests/components/match/kill-map.test.tsx`, `tests/components/match/round-economy.test.tsx`, `tests/app/matches/match-view.test.tsx`

**Interfaces:**
- Consumes: Tasks 6, 7, 8.
- Produces: `KillMap({ detail, roundNumber, focusPuuid? })` — SVG sobre a imagem do minimapa; abate = linha killer→vítima com marcador `data-kill`; plant/defuse com `data-spike="plant|defuse"`; posições de todos no `title` do marcador (filho único, template string). `RoundEconomy({ detail, teamId })` — tabela por round com `data-buy-type`, loadout/gasto/sobra por jogador.
- [ ] **Step 1: Testes**: round com 3 abates → 3 `data-kill`; round com plant → `data-spike="plant"`; `detail.economy` nulo → seção não renderiza (sem placeholder inventado); round 25 renderiza; `<title>` com string única.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5: Verificação visual** no dev server (desktop 1440 e mobile 390): marcadores caem em áreas jogáveis do minimapa.
- [ ] **Step 6:** commit `feat(match): mapa de abates e economia por round`.

### Task 10: Breakdown — disciplina econômica e heatmap de mortes

**Files:**
- Create: `src/components/charts/death-heatmap.tsx`, `src/components/player/economy-discipline-card.tsx`
- Modify: `src/app/(app)/players/[region]/[name]/[tag]/breakdown-view.tsx`, `src/services/tracker/player-overview.ts` (expor `details` e `tactical` no `PlayerOverview`)
- Test: `tests/components/charts/death-heatmap.test.tsx`, `tests/components/player/economy-discipline-card.test.tsx`, teste existente do breakdown

**Interfaces:**
- Produces: `PlayerOverview.tactical: TacticalVectors | null` (`null` na henrik source). Componentes recebem o resultado pronto de `computeDeathHeatmap` / `computeEconomyDiscipline`.
- [ ] **Step 1: Testes**: card mostra contagens absolutas (`forcedWhileTeamSaved`) e win% por tipo; heatmap com grid 16×16 renderiza 256 células com intensidade proporcional; `tactical === null` → seções omitidas.
- [ ] **Step 2–4:** FAIL → implementar → PASS. **Step 5:** commit `feat(breakdown): disciplina econômica e heatmap de mortes`.

### Task 11: Coach IA recebe os vetores táticos

**Files:**
- Modify: o ponto onde o prompt/envelope do MiniMax é montado (localizar a partir de `src/app/(app)/players/[region]/[name]/[tag]/ai-sandbox.tsx` e `src/contracts/coach.ts`), `src/services/coaching/player-combat.ts`
- Test: o teste existente do envelope/prompt

**Interfaces:**
- Consumes: `PlayerOverview.tactical`.
- Produces: o payload enviado ao LLM ganha `tactical: { topDeathZones; discipline }` (só números/rótulos, nunca o DTO cru); sem `tactical`, o payload é idêntico ao de hoje.
- [ ] **Step 1: Teste**: com `tactical` presente, o payload contém `topDeathZones[0].label`; sem, o snapshot do payload é igual ao atual.
- [ ] **Step 2–4:** FAIL → implementar → PASS. **Step 5:** commit `feat(coach): vetores táticos de posição e economia no coaching`.

## Fase C — Consentimento (RSO simulado + perfil público)

### Task 12: Banco — vínculo RSO e perfil público

**Files:**
- Modify: `src/lib/db/schema.ts` (`userRiotAccounts`), `src/lib/db/user-riot-store.ts`
- Create: migração nova via `npm run db:generate` em `drizzle/`
- Test: `tests/lib/db/user-riot-store.test.ts` (estender, mesmo padrão de fake do repo)

**Interfaces:**
- Produces: colunas `puuid text` (unique, nullable para legados), `linked_via text not null default 'legacy'` (`'legacy' | 'rso_mock' | 'rso'`), `profile_public boolean not null default false`. A migração marca linhas existentes como `legacy`.
  `UserRiotStore` ganha: `getByRiotId(region: string, nameKey: string, tagKey: string): Promise<UserRiotAccountRow | null>`, `setProfilePublic(userId: string, value: boolean): Promise<void>`; `upsert` aceita `puuid` e `linkedVia`; `upsert` com `linkedVia !== 'legacy'` zera `profilePublic` para `false` quando o `puuid` muda.
- [ ] **Step 1–4:** testes (getByRiotId case-insensitive via keys; setProfilePublic; revincular outro puuid volta a privado) → FAIL → implementar + `npm run db:generate` → PASS.
- [ ] **Step 5:** commit `feat(db): vínculo RSO com puuid e perfil público opt-in`. Avisar o dono para rodar `npm run db:migrate` no Neon de dev/prod.

### Task 13: Política de acesso a perfis

**Files:**
- Create: `src/services/access/profile-access.ts`
- Test: `tests/services/access/profile-access.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type ProfileAccess = 'owner' | 'public' | 'demo' | 'private';
  export function decideProfileAccess(input: { viewerUserId: string | null; target: { region: string; name: string; tag: string }; link: UserRiotAccountRow | null }): ProfileAccess;
  export async function resolveProfileAccess(viewerUserId: string | null, target: {...}, deps?: { store?: UserRiotStore }): Promise<ProfileAccess>;
  ```
  Regras: alvo == `DEMO_ACCOUNT` (case-insensitive) → `demo`; sem vínculo, vínculo `legacy` → `private`; vínculo do próprio viewer → `owner`; `profilePublic` → `public`; senão `private`. Falha do store → `private` (fail-closed) com `console.error`.
- [ ] **Step 1–4:** tabela de casos (incl. caixa diferente, legacy do próprio usuário → `private`, store lançando) → FAIL → implementar → PASS.
- [ ] **Step 5:** commit `feat(access): política de acesso a perfis por consentimento`.

### Task 14: Aplicar a política em páginas e APIs

**Files:**
- Create: `src/components/ui/states/private-profile-state.tsx`
- Modify: `src/app/(app)/players/[region]/[name]/[tag]/page.tsx`, `.../breakdown/page.tsx`, `src/app/(app)/matches/[matchId]/page.tsx`, `src/app/api/players/[region]/[name]/[tag]/route.ts`, `.../overview/route.ts`, `.../history/route.ts`, `src/app/api/matches/[region]/[matchId]/route.ts`
- Test: testes existentes dessas páginas/rotas (estender)

**Interfaces:**
- Consumes: Task 13.
- Produces: `PrivateProfileState()` com o texto exato `Este jogador não tornou o perfil público.`; APIs respondem `404` com código `PROFILE_NOT_PUBLIC` e a mesma mensagem (idêntico ao de conta inexistente — não revela existência). A partida exige `?player=` cujo acesso não seja `private`; sem `player` → mesmo estado neutro. A sessão é lida com `headers()` antes do DB (`src/lib/session.ts`) e o trabalho dinâmico fica dentro do `<Suspense>` já existente.
- [ ] **Step 1: Testes**: perfil privado → página com o texto exato e **sem** chamar a fonte (spy em `getTrackerSource`); API → 404 `PROFILE_NOT_PUBLIC`; demo → renderiza; owner → renderiza; partida sem `player` → estado neutro.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** commit `feat(access): perfis, partidas e APIs só com consentimento`.

### Task 15: Fluxo RSO simulado (authorize → consent → callback)

**Files:**
- Create: `src/lib/rso/mock-provider.ts`, `src/app/api/rso/authorize/route.ts`, `src/app/(auth)/rso/consent/page.tsx` (+ `consent-form.tsx` client), `src/app/api/rso/callback/route.ts`, `src/app/actions/rso.ts`
- Test: `tests/lib/rso/mock-provider.test.ts`, `tests/app/api/rso/*.test.ts`

**Interfaces:**
- Produces:
  - `fictitiousAccountForUser(userId: string, region: string): RiotAccountDto` (nome = prefixo do roster + 4 dígitos da seed do `userId`, tag `region.toUpperCase()+'1'`; determinístico).
  - `signRsoCode(payload: { userId: string; puuid: string; region: string; exp: number }, secret: string): string` / `verifyRsoCode(code: string, secret: string, now: number): payload | null` (HMAC-SHA256 com `BETTER_AUTH_SECRET`, `exp` = 5 min).
  - `GET /api/rso/authorize?region=br` → exige sessão (senão redirect `/login?next=...`), grava cookie `rso_state` (httpOnly, sameSite=lax, 10 min), redirect `/rso/consent?state=...&region=...`.
  - Página de consentimento: título exato `Riot Sign-On (simulado)`, escopos listados como na Task 1, conta fictícia exibida, botões `Autorizar` e `Negar`.
  - Server Action `authorizeRso(state, region)` → redirect `/api/rso/callback?code=...&state=...`; `denyRso()` → redirect `/dashboard/settings?rso=denied`.
  - `GET /api/rso/callback` → valida `state` == cookie, `verifyRsoCode`, `code.userId === sessão`; sucesso: `upsert({ linkedVia: 'rso_mock', puuid, ... })`, apaga cookie, redirect `/dashboard/settings?rso=linked`; qualquer falha: nada gravado, redirect `/dashboard/settings?rso=error`.
- [ ] **Step 1: Testes** (Review Focus 3): `state` ausente/diferente → `rso=error` e `upsert` não chamado; `code` adulterado/expirado → idem; usuário da sessão ≠ `code.userId` → idem; sem sessão no authorize → redirect para login; caminho feliz → `upsert` com `linkedVia: 'rso_mock'`. `fictitiousAccountForUser` determinístico e diferente para usuários diferentes.
- [ ] **Step 2–4:** FAIL → implementar (ler `node_modules/next/dist/docs/` sobre cookies em Route Handlers e Server Actions) → PASS.
- [ ] **Step 5:** commit `feat(rso): fluxo Riot Sign-On simulado com state e código assinado`.

### Task 16: Configurações, NavUser e cadastro sobre o RSO

**Files:**
- Modify: `src/app/(app)/dashboard/settings/page.tsx` (e formulário de vínculo atual), `src/app/actions/user-riot.ts`, `src/services/tracker/user-riot-service.ts`, `src/components/layout/nav-user.tsx`, `src/app/(auth)/signup/signup-form.tsx` e `page.tsx`
- Test: testes existentes de settings, nav-user, signup (atualizar)

**Interfaces:**
- Produces: Settings mostra (a) sem vínculo ou `legacy`: botão `Entrar com Riot` → `/api/rso/authorize?region=<select>`; (b) vinculado: conta, toggle `Tornar meu perfil público` (Server Action `setProfilePublic(value: boolean)`), botão `Desvincular conta Riot` (remove e volta a privado). Mensagens para `?rso=linked|denied|error`. O formulário de digitar Riot ID é removido. NavUser: `legacy` → chip `Reconecte com Riot` linkando settings (mantendo o FAIL-SOFT do `AGENTS.md`). Cadastro: campos de Riot ID/região removidos; o texto de apoio aponta para conectar depois em Configurações.
- [ ] **Step 1–4:** testes (toggle chama a action; legacy mostra o chip; signup não renderiza input de Riot ID) → FAIL → implementar → PASS.
- [ ] **Step 5:** commit `feat(settings): vínculo via RSO simulado, perfil público e desvincular`.

### Task 17: Busca, recentes, seguir e perfil demo da home

**Files:**
- Modify: `src/app/(app)/home-landing.tsx`, `src/components/layout/nav-search.tsx`, `src/app/(app)/dashboard/page.tsx`, `src/app/(app)/players/[region]/[name]/[tag]/follow-button.tsx`, `src/services/tracker/tracked-players-service.ts`
- Test: `tests/app/home-page.test.tsx`, `tests/components/layout/nav-search.test.tsx`, testes do dashboard/follow

**Interfaces:**
- Produces: `FALLBACK_PROFILES` da home = só `ValCoachDemo#DEMO` (sem `twmz#tower`, sem `next to nothing#NOWAY`); a busca continua navegando para o perfil (a Task 14 decide o que aparece). Recentes cujo backfill recebe 404 ficam sem rank (já fail-soft). Seguir: `follow` recusa alvo cujo acesso seja `private` (erro `PROFILE_NOT_PUBLIC`); dashboard mostra card neutro para seguido que ficou privado.
- [ ] **Step 1: Testes**: home não contém `twmz#tower` nem `NOWAY`; contém `ValCoachDemo#DEMO`; `follow` em privado → erro; dashboard com seguido privado → texto exato da Task 14.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** commit `feat(home): perfil demo fictício e busca/seguir só com consentimento`.

## Fase D — Prontidão para o pedido

### Task 18: Termos, privacidade, aviso legal e verificação de domínio

**Files:**
- Create: `src/app/(app)/termos/page.tsx`, `src/app/(app)/privacidade/page.tsx`, `docs/operacao/pedido-production-key.md`
- Modify: `src/components/layout/app-footer.tsx`, `src/components/auth/auth-footer.tsx`
- Test: `tests/app/legal-pages.test.tsx`, testes dos footers

**Interfaces:**
- Produces: footers com links `Termos` e `Privacidade` e o aviso legal da Riot **copiado literalmente** da página "Legal" do portal Riot (confirmar o texto na Task 1/portal; não parafrasear). Privacidade descreve: dados coletados (conta do app, vínculo RSO, flag pública), retenção, como desvincular/apagar, como tornar privado. `docs/operacao/pedido-production-key.md`: descrição do produto, endpoints usados e por quê (da Task 1), justificativa do RSO, estimativa de chamadas/minuto, URLs das telas para o avaliador, passo a passo da verificação de domínio (arquivo estático em `public/` com o texto que a Riot fornecer).
- [ ] **Step 1–4:** testes (páginas renderizam títulos; footers contêm o aviso exato e os links) → FAIL → implementar → PASS.
- [ ] **Step 5: Verificação final:** `npx vitest run --coverage` (100% em analytics), `npx tsc --noEmit`, navegação completa no dev server: visitante → demo → login → `Entrar com Riot` → consentimento → minha conta → partida (mapa + economia) → coach IA → tornar público → abrir em aba anônima.
- [ ] **Step 6:** commit `feat(legal): termos, privacidade, aviso Riot e roteiro do pedido`.
