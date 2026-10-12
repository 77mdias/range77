# Glossário

Termos de domínio (Valorant + analytics do app) e termos técnicos.

## Métricas

| Termo | Significado |
| --- | --- |
| **ACS** | Average Combat Score — `score / rounds`, inteiro |
| **ADR** | Average Damage per Round — `dano / rounds` |
| **KAST%** | % de rounds com Kill, Assist, Survived ou Traded |
| **K/D/A** | abates / mortes / assistências |
| **KDR** | `kills / deaths` (mortes 0 → `kills`) |
| **KPR / APR / DPR** | kills / assists / deaths por round |
| **HS%** | headshots / total de tiros × 100 |
| **FK / FD** | First Kill (first blood) / First Death por round |
| **Entry** | agressividade de abertura (`FK / (FK+FD)`) |
| **Rating ValCoach** | métrica composta normalizada (média = 1.00) |
| **Consistência** | variação do ACS entre partidas (coeficiente de variação) |
| **RR** | Rank Rating (pontos dentro do tier) |
| **MVP** | maior ACS da partida (desempate: kills, nome) |

## Valorant

| Termo | Significado |
| --- | --- |
| **Tier** | elo (Iron…Radiant), exibido via `formatRankChip` (`IMM 3`) |
| **Half / metade** | 12 rounds; troca de lado no round 13 |
| **DEF / ATK** | defesa / ataque — inferidos pelos **plants** |
| **Plant / Defuse / Retake** | tipos de encerramento do round |
| **Pistola** | round 1 e 13 (1º de cada half) |
| **Overtime (OT)** | >24 rounds — rótulo DEF/ATK omitido |
| **Affinity / região** | `eu, na, ap, kr, latam, br` |
| **Player card** | imagem in-game do jogador (v1 account, `card.large`) |

## Tipos e contratos

| Termo | Significado |
| --- | --- |
| **HenrikDev** | API externa pública de dados de Valorant (v4/v2/v1) |
| **Payload cru** | resposta da HenrikDev (`snake_case`) em `contracts/henrikdev.ts` |
| **Contrato interno** | forma normalizada (`camelCase`) em `contracts/tracker.ts` |
| **`CoachInsight`** | envelope de 3 camadas para o chatbot |
| **`raw_metrics`** | números exatos calculados |
| **`contextual_rating`** | classificação semântica (`Crítico`…`Excelente`) |
| **`coaching_hooks`** | strings pré-calculadas para guiar a IA |
| **`ApiErrorBody`** | envelope padrão de erro (`{ error: { code, message, hint? } }`) |
| **`MatchDetail` / `MatchSummary`** | detalhe / linha de histórico de partida |
| **`MatchScoreboardRow`** | linha por jogador no scoreboard |
| **`KillEvent`** | abate da timeline (tempos, killer/victim, arma) |
| **`RrHistoryPoint`** | ponto da trajetória de RR |
| **`GroupedStat`** | agregação por agente/mapa |

## Técnicos

| Termo | Significado |
| --- | --- |
| **RSC** | React Server Component |
| **Cache Components** | modelo de cache do Next 16 (`'use cache'` + `cacheLife` + `cacheTag`) |
| **`instant = false`** | opt-in ao render bloqueante em páginas com params assíncronos |
| **`connection()`** | marca request-time (substitui `dynamic = 'force-dynamic'`) |
| **`proxy`** | sucessor do middleware no Next 16 (`src/proxy.ts`) |
| **DIP** | Dependency Inversion Principle — dependências injetadas (client/store/getSession) |
| **Store** | porta de acesso ao banco (`create*Store(db)`) |
| **Best-effort** | operação opcional cujo erro não derruba a resposta |
| **Protocol Precision** | design system (Stitch) adotado pelo app |
| **font-display/hud/body** | papéis de fonte (Space Grotesk / JetBrains Mono / Geist) |
| **Breakdown** | tela `/players/.../breakdown` (amostra por ato, até 30) |
| **Snapshot** | registro de combate persistido (`player_combat_snapshots`) |
