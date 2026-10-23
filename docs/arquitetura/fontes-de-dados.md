# Fontes de dados (`TrackerSource`)

Todas as telas e APIs leem dados de jogador e partida por **uma porta única**,
`TrackerSource` (`src/services/tracker/source.ts`). A fonte ativa é escolhida
por `TRACKER_DATA_SOURCE` e entrega os dados **já no contrato interno**
(`src/contracts/tracker.ts`) — nenhuma página conhece o formato externo.

| `TRACKER_DATA_SOURCE` | Implementação | Estado |
| --- | --- | --- |
| *(ausente)* / `mock` | `sources/mock-source.ts` | **padrão** — dados simulados no formato oficial da Riot |
| `riot` | — | reservado para a Production API Key; hoje lança `EnvironmentValidationError` |
| `henrikdev` | `sources/henrikdev-source.ts` | código **guardado e desligado**; existe só para manter a integração antiga testável. Será removido quando a fonte `riot` existir |

Valor desconhecido → `EnvironmentValidationError` (fail-fast em `loadAppEnv`).
O layout e as páginas usam `isSimulatedDataSource()`, que é **fail-safe**: env
inválido conta como simulado (mostra o selo em vez de afirmar dado real).

## A porta

```ts
interface TrackerSource {
  readonly kind: 'mock' | 'riot' | 'henrikdev';
  getPlayerSample(query: PlayerSampleQuery): Promise<PlayerSample>;
  getMatchDetail(region: string, matchId: string, focus?: MatchFocus): Promise<MatchDetail>;
  getPlayerCard(name: string, tag: string): Promise<string | null>;
}
```

- `PlayerSample` traz `matches`, `combat` (`MatchCombatStats[]`), `details`
  (`MatchDetail[]`, só na fonte simulada), `level`, `cardSrc`, `rank` e
  `rrHistory`.
- `focus` (`{ name, tag }`) é o jogador da perspectiva (`?player=`). A fonte
  simulada **exige** o foco: o `matchId` simulado deriva dele, e sem foco ou
  com partida fora do histórico do foco ela lança `TrackerNotFoundError`
  (mapeado para `MATCH_NOT_FOUND`).

## Fonte simulada — mesmo caminho dos dados reais

O mock **não** gera dados de tela: ele gera DTOs crus no formato oficial
**VAL-MATCH-V1** (`src/contracts/riot.ts`, conferido contra o portal da Riot
em [`referencia/riot-val-match-v1.md`](../referencia/riot-val-match-v1.md)) e
os passa pelo **mesmo normalizador** que a API real vai usar.

```
generate*() (src/services/riot/mock/)  ──►  DTO Riot (contracts/riot.ts)
                                              │  normalize-riot.ts + catalog.ts
                                              ▼
                                      contracts/tracker.ts  ──►  analytics  ──►  telas
```

No dia da chave, troca-se o gerador por `fetch` na API oficial; normalizador,
analytics e telas ficam iguais.

### Gerador (`src/services/riot/mock/`)

| Arquivo | Papel |
| --- | --- |
| `rng.ts` | `seedFromRiotId` (FNV-1a sobre o Riot ID em minúsculas) + `createRng` (mulberry32) |
| `roster.ts` | elenco **fictício** (nunca Riot IDs reais) |
| `generate-account.ts` | conta, histórico de partidas (`matchId` UUID derivado do foco), rank/RR simulados, `DEMO_ACCOUNT` (`ValCoachDemo#DEMO`, br) |
| `match-plan.ts` | roteiro barato da partida (placar, lados, overtime) |
| `generate-match.ts` | partida completa: abates com posições, plant/defuse, dano, economia |
| `economy.ts` | créditos, bônus de derrota, tipo de compra, loadout |
| `map-zones.ts` | zonas jogáveis por mapa (`MOCK_MAPS`), construídas a partir dos callouts oficiais |

Regras garantidas por teste: **determinismo** (mesma entrada → saída idêntica,
sem `Date.now`/`Math.random`), placar fechando em 13 ou overtime, KDA batendo
com a timeline, créditos ≤ 9000, posições dentro das zonas, posição estável
no round, dano só entre jogadores vivos, defuse ≥ 7 s após o plant, perdedor
do pistol fazendo eco.

### O que a API oficial **não** tem (e o mock não inventa)

- **Habilidades por round**: só contagem por partida (`abilityCasts`). Nada de
  linha do tempo de habilidades.
- **Rank/RR atuais**: não há endpoint oficial. `MockRankSnapshot`/`MockRrPoint`
  existem só no mock e somem quando a chave chegar.

## Fonte HenrikDev (guardada)

`henrikdev-source.ts` embrulha o código antigo (`src/services/henrikdev/**`,
cache por recurso e cache durável `match_cache`). Fica fora do caminho
padrão; nenhuma tela cita a HenrikDev.

Ver [fluxo de dados](./fluxo-de-dados.md), [cache](./cache-e-revalidacao.md)
e [variáveis de ambiente](../desenvolvimento/variaveis-de-ambiente.md).
