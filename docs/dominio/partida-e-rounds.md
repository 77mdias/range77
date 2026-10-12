# Partida e rounds

Modelo de partida, split DEF/ATK, timeline de rounds e a regra de perspectiva
que rege a tela `/matches/[matchId]`.

## Modelo

- `MatchDetail` (`src/contracts/tracker.ts`) agrega `teams` (`MatchTeamSummary`),
  `scoreboard` (`MatchScoreboardRow[]`), `rounds` (`MatchRound[]`) e
  `kills` (`KillEvent[]`).
- `MatchRound` é independente de jogador; `RoundOutcome` é relativo a um
  jogador (`won`, `playerTeamId`).
- Rounds são **1-based** no contrato interno (`round.id + 1` na normalização).

## DEF/ATK (metades) — `computeMatchHalves`

O payload v4 **não** traz o lado inicial. A inferência é feita pelos **plants**
(só o time atacante planta):

- rounds `1–12` = 1º half; `13–24` = 2º half (`REGULATION_HALF_ROUNDS = 12`);
- o atacante do 1º half vem de um `plantTeamId` de round `≤12`; o do 2º, de
  round `>12`; se um half não tem plant, usa o oponente do outro;
- `computeMatchHalves` retorna **`null`** quando não dá para inferir sem chutar:
  sem rounds, `<2` times, ou **overtime** (`>24` rounds) — o rótulo seria
  enganoso.

### Perspectiva do jogador buscado

A página recebe o Riot ID via `?player=Nome%23Tag`. O time do jogador é o
"aliado": daí saem DEF/ATK, W/L e a linha **"VOCÊ"** no scoreboard. Sem
`player`, a partida é **neutra** (nem DEF/ATK, nem W/L).

### No histórico (`MatchSummary.halves`)

O normalizador do histórico persiste o mesmo split em `MatchSummary.halves`
(ausente quando indeterminável). A aba "Agentes & Mapas" usa esses halves em
`buildMapSideStats` para exibir os splits DEF/ATK agregados por mapa.

## Timeline de rounds — `computeRoundTimeline`

Classifica cada round **na perspectiva do time do jogador** e monta a fita.

### Tipo de encerramento (`RoundWinKind`)

| Tipo | Regra (dados do payload) |
| --- | --- |
| `defuse` | o round teve `defused` (vitória da defesa) |
| `plant` | o time atacante venceu um round com plant |
| `retake` | a defesa venceu após o plant, sem defuse |
| `elim` | sem plant e o time derrotado foi **totalmente eliminado** |
| `time` | sem plant e o time derrotado **sobreviveu** (tempo esgotado) |

O lado (`RoundSide = attack | defense`) reusa a inferência de plants; sem base,
fica `null`. Pistolas = **R1 e R13** (1º round de cada half regulamentar).
O placar é acumulado **após** cada round.

### Resumo

- `winPercent = us / (us + them) * 100` (1 casa; `null` sem rounds);
- conversão de pistolas: `won/played * 100` (1 casa; `null` sem pistolas);
- rounds ganhos/perdidos e total.

## Segurança da timeline

A timeline **não** fabrica: ECON rating, tags econômicas por round
(`ELIM/PIST/SEMI/...`) nem probabilidade de vitória. O que não é derivável é
omitido.

## Card do jogador e chip de ranque

- O card in-game do MVP (v1 account, `card.large`) é buscado best-effort e
  exibido **quadrado** — nunca retrato circular de agente.
- `formatRankChip` abrevia o tier real (`"Immortal 3"` → `IMM 3`).
- A faixa de MMR do cabeçalho sai de `computeRankRange` (menor–maior tier do
  scoreboard); sem tier reconhecido, é omitida.

## Scoreboard alinhado

O `ScoreboardTable` usa `<colgroup>` + `table-fixed` com larguras fixas
idênticas entre os dois times (evita desalinhamento entre colunas), cabeçalho
telemétrico com badges e a faixa de MMR. Ver
[componentes](../design/componentes.md).
