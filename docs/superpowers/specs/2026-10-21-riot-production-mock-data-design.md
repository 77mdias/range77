# Dados simulados no formato Riot + consentimento (RSO) — preparação para a Production API Key

- **Data:** 2026-10-21
- **Branch:** `feat/riot-production-data-plan`
- **Status:** rascunho para aprovação do dono
- **Legenda:** **[dono]** = decidido pelo dono na conversa; **[call]** = decisão
  do agente, revisável; **[a confirmar]** = fato externo ainda não verificado
  na documentação oficial.

## 1. Intenção (o porquê)

O ValCoach precisa da **Production API Key** da Riot para VALORANT. Sem ela não
há dado oficial: a Riot **não emite chave pessoal para VALORANT**, e o RSO
(login "Entrar com Riot") só é liberado **depois** da aprovação de produção.
Ou seja: o avaliador precisa ver um **protótipo funcionando** que prove (a) que
o produto entrega valor real com os dados que só a chave dá e (b) que ele
respeita a política da Riot — **nenhum dado pessoal sem opt-in do jogador**.

Hoje o app faz o contrário do que a política pede: busca **qualquer** Riot ID
e mostra o perfil completo via HenrikDev (API não oficial). Isso tem cara de
"scouting / perfil pessoal sem consentimento", proibido pela política de
lançamento da API de VALORANT.

Esta feature transforma o app num protótipo pronto para avaliação:

1. **Toda fonte de dados vira simulada** (mock), no **formato exato da API
   oficial** (VAL-MATCH-V1 e afins), passando pelo mesmo pipeline que os dados
   reais vão usar. Quando a chave chegar, troca-se só o "cliente" — telas,
   normalização, analytics e coaching ficam iguais. **[dono]**
2. **Modelo de acesso por consentimento**: login simulado com Riot (RSO) →
   cada jogador vê **a própria conta**; perfis só aparecem para outros se o
   dono tornar público. **[dono]**
3. **Dados novos que só a chave oficial dá**, já visíveis nas telas: posições
   no mapa por abate/plant/defuse e economia **round a round** por jogador.
   **[dono]**

### Sucesso

- O site, no subdomínio do dono, funciona de ponta a ponta **sem nenhuma
  chamada à HenrikDev**: landing → "Entrar com Riot" (simulado) → minha conta →
  overview / breakdown / partida (com mapa de abates e economia) → coach IA.
- Toda tela atual continua existindo, alimentada por mock. **[dono]**
- Existe uma camada única onde, no futuro, o cliente oficial da Riot substitui
  o mock — sem tocar telas nem analytics.
- O formulário de pedido da chave pode ser preenchido apontando para telas
  concretas (seção 9).

## 2. Objetivos, não-objetivos e anti-objetivos

### Objetivos
- Mock **determinístico** (mesma conta/partida → mesmos dados em todo reload)
  e **plausível** (números e posições que um jogador de VALORANT reconheça).
- Contrato cru `src/contracts/riot.ts` espelhando VAL-MATCH-V1 / ACCOUNT-V1 /
  ranked, e um normalizador `riot → tracker` que serve ao mock **e** à API real.
- Extensão do contrato interno (`src/contracts/tracker.ts`) com posições e
  economia por round, e telas que os exibem.
- Fluxo RSO simulado + consentimento + perfil público opt-in.
- Páginas de conformidade: Termos, Privacidade, aviso legal da Riot.

### Não-objetivos
- Integração real com a API da Riot ou RSO real (impossível antes da aprovação).
- Remover a HenrikDev do código **agora** — ela fica guardada, desligada. **[dono]**
- Novos modos de jogo além do competitivo.

### Anti-objetivos (falha mesmo que "funcione")
- **Mock que promete dado que a Riot não entrega.** Se a tela depender de um
  campo inexistente na API oficial, ela quebra justamente na troca. Ex.: a
  ordem/posição de cada uso de habilidade **não** vem na API (só contagem por
  round **[a confirmar]**) — não simular linha do tempo de habilidades.
- **Mock que finge ser dado real.** Toda tela com dado simulado mostra um selo
  claro ("DADOS SIMULADOS — protótipo aguardando Production Key"). Enganar o
  avaliador é o pior resultado possível.
- **Imitar a marca da Riot.** A tela de autorização simulada não usa logo,
  cores ou layout copiados da Riot; é "estilo OAuth genérico" com o nome
  "Riot Sign-On (simulado)".
- **Expor jogadores reais.** O mock só usa nomes/Riot IDs fictícios — nada de
  `twmz#tower` ou pros reais.
- **Perder a HenrikDev.** O código dela continua compilando e testado; só não
  é chamado.

## 3. Restrições

- Invariantes do `AGENTS.md` continuam valendo (Cache Components com
  `<Suspense>`, NavUser fail-soft, `src/proxy.ts`, cobertura 100% em
  `src/services/analytics/**`, nenhum cálculo fora de analytics, lockfile npm 10).
- **Variável de ambiente nova** segue a cadeia completa (Infisical → `env.ts`
  → `docker-compose.yml` → Vercel). Ver seção 6.4.
- Next 16 / React 19: ler `node_modules/next/dist/docs/` antes de usar APIs.
- Hospedagem: Vercel, num **subdomínio de domínio próprio do dono** **[dono]**
  (exigência da Riot: verificação de propriedade com um texto publicado no site).

## 4. Fatos externos que embasam o design

| Fato | Status |
| --- | --- |
| Não existe chave pessoal para VALORANT; só produção | confirmado (Riot DevRel) |
| RSO é obrigatório para apps de VALORANT e só sai após aprovação de produção | confirmado (Riot DevRel / OAuth docs) |
| Política: sem perfis pessoais / scouting / dado personalizado **sem opt-in** | confirmado (VALORANT API Launch and Policies) |
| Verificação de domínio via texto publicado no site | confirmado (Verification for Production Applications) |
| VAL-MATCH-V1: `roundResults[]` com `playerStats[]` por round contendo `kills[]`, `damage[]`, `economy`, `ability` | confirmado em docs comunitários; **[a confirmar]** nomes exatos no portal oficial |
| Abate traz `victimLocation` + `playerLocations[]` (posição + `viewRadians` de todos no instante) | **[a confirmar]** |
| Round traz `plantLocation`/`defuseLocation` + `plantPlayerLocations`/`defusePlayerLocations` | confirmado em docs comunitários |
| `economy` por round: `loadoutValue`, `weapon`, `armor`, `remaining`, `spent` | **[a confirmar]** |
| Habilidades: só **contagem** por round (`grenadeEffects`/`ability1Effects`/… ou `abilityCasts`), sem timeline | **[a confirmar]** — se vier timeline, vira melhoria futura |

**Primeira tarefa do plano:** abrir a referência oficial
(`developer.riotgames.com/apis#val-match-v1`) e congelar `src/contracts/riot.ts`
campo a campo. Tudo marcado [a confirmar] que **não** existir sai do escopo.

## 5. Modelo de acesso (consentimento)

**[dono]** O app passa a ser "a sua própria conta", com perfil público opt-in.

| Quem | Vê |
| --- | --- |
| Visitante sem login | Landing + **perfil de demonstração** de um jogador fictício (todas as telas navegáveis, com selo de simulado). Não busca ninguém. |
| Logado sem Riot vinculado | Convite "Entrar com Riot" (RSO simulado). |
| Logado com Riot vinculado | A própria conta: overview, breakdown, partidas, coach IA. Toggle **"Tornar meu perfil público"**. |
| Qualquer pessoa, perfil de terceiro | Só se o dono marcou público. Senão: estado "Este jogador não tornou o perfil público." |

- **[call]** O toggle começa **desligado** e pode ser desligado a qualquer
  momento (efeito imediato; páginas públicas deixam de responder).
- **[call]** A busca da home e do header passa a encontrar **só perfis
  públicos**. Riot ID não público → mesmo estado neutro (não revela se a conta
  existe).
- **[call]** "Seguir jogador" (dashboard) só funciona para perfis públicos; se
  o dono do perfil tornar privado, o card no dashboard mostra o estado neutro.
- **[call]** Os perfis recentes da home (localStorage) seguem a mesma regra:
  perfil que ficou privado mostra estado neutro e não busca rank.
- **[call]** O vínculo atual "digitar Riot ID em Configurações" e o Riot ID
  opcional do cadastro **são substituídos** pelo RSO simulado: o vínculo só
  nasce do fluxo de autorização (é o que a Riot exige no mundo real).
- **[call]** Vínculos antigos (Riot ID digitado, dados da HenrikDev) **não**
  valem como consentimento: a migração os marca como legados, o usuário vê
  "Reconecte com Riot" e o vínculo antigo não dá acesso a nada.
- **[call]** Perfil de demonstração do visitante: uma conta fictícia fixa,
  sempre pública, em `/players/br/ValCoachDemo/DEMO` (rotas atuais mantidas).
- **[call]** O coach IA (MiniMax) continua **real**, rodando sobre os dados
  simulados — é o produto que o avaliador precisa ver funcionando.
- Login do app (e-mail/Google/Discord via Better Auth) **continua**; o RSO é
  o vínculo da conta Riot dentro dele. **[call]** — no mundo real o RSO pode
  virar login primário; não é necessário agora.

### Fluxo RSO simulado

1. Botão "Entrar com Riot" → `/rso/authorize` (página do próprio app, rótulo
   "SIMULAÇÃO") mostrando os escopos pedidos (`openid`, `cpid`,
   `offline_access` — **[a confirmar]** escopos oficiais) e "Autorizar / Negar".
2. A página mostra a **conta fictícia do usuário**, gerada de forma
   determinística a partir do id do usuário (ex.: "Kairo4821#BR1"), com
   região escolhível. Cada usuário tem a sua — um `puuid` fictício pertence a
   um único usuário, como no RSO real. **[call]** (evita disputa por um pool
   fixo de contas e conflito no "perfil público").
3. "Autorizar" → callback `/rso/callback?code=...` que grava o vínculo
   (`puuid`, `gameName`, `tagLine`, região) do usuário, exatamente como o
   callback real gravaria após trocar o `code` por token.
4. "Negar" → volta com mensagem; nada é gravado.
5. Em Configurações: "Desvincular conta Riot" apaga o vínculo e torna o perfil
   privado.

**[call]** O fluxo é modelado como um OAuth de verdade (rotas
authorize/callback, `state` anti-CSRF) para que a troca pelo RSO real seja
trocar a URL do provedor e a troca de `code` por token.

## 6. Arquitetura de dados

### 6.1 Princípio

Simular **no nível do payload cru da Riot**, não no nível das telas. O mock gera
DTOs no formato VAL-MATCH-V1; eles passam pelo **mesmo** normalizador que a API
real vai usar. Assim, o dia da chave = trocar o gerador pelo `fetch` real.

```
            ┌── MockRiotSource (agora)   ── gera DTOs Riot determinísticos
RiotSource ─┼── RiotApiSource (futuro)   ── fetch na API oficial (prod key)
            └── (HenrikDev: guardada, fora desta interface)
                     │  DTOs Riot  (src/contracts/riot.ts)
                     ▼
            normalize-riot.ts  ──►  src/contracts/tracker.ts (estendido)
                     ▼
            services/analytics/** (puro, 100%)  ──►  telas / coach IA
```

### 6.2 Peças

- `src/contracts/riot.ts` — espelho do payload oficial (Match, RoundResult,
  PlayerRoundStats, Kill, Location, Economy, Damage, Account, ranked/MMR).
  **Congelado contra a referência oficial na tarefa 1.**
- `src/services/riot/source.ts` — interface `RiotSource` com o mínimo que as
  telas usam: `getAccountByPuuid`, `getMatchlist(puuid)`, `getMatch(matchId)`,
  rank atual e histórico de RR. **[call]** os nomes seguem os endpoints oficiais.
- `src/services/riot/mock/**` — gerador determinístico:
  - semente = hash de `puuid`/`matchId`; mesma entrada → mesma saída;
  - elenco fictício fixo (contas do RSO simulado + "jogadores de lobby");
  - partidas coerentes: 13 rounds para vencer (overtime possível), lados
    trocando no round 13, KDA ↔ abates ↔ assistências batendo com a timeline;
  - economia plausível (pistol round, eco/force/full buy, créditos
    respeitando o limite de 9000, bônus de derrota);
  - posições plausíveis por mapa: amostradas de zonas jogáveis (sites,
    mid, entradas) por mapa — **[call]** zonas desenhadas à mão como
    polígonos em coordenadas de mundo; precisão "parece real", não "é real".
- `src/services/riot/normalize-riot.ts` — DTO Riot → contratos tracker
  (substitui o papel de `normalize-tracker.ts` para esta fonte).
- `src/services/tracker/**` passa a depender de `RiotSource` (via injeção, como
  hoje o `client`). Os serviços HenrikDev continuam no repo, sem uso.
- `src/services/analytics/**` ganha os cálculos novos (seção 7) — 100%.

### 6.3 Extensões do contrato interno (`tracker.ts`)

- `MapPoint { x, y }` (coordenadas de mundo do jogo).
- `KillEvent` + `victimLocation: MapPoint | null` + `killerLocation:
  MapPoint | null` + `playerLocations: { puuid, location, viewRadians }[]`.
- `MatchRound` + `plant/defuse: { location, timeInRoundMs, playerPuuid } | null`.
- Novo `RoundEconomy { roundNumber, puuid, loadoutValue, weapon, armor,
  spent, remaining }` e `MatchDetail.economy: RoundEconomy[]`.
- `AbilityCastCounts` **por round** (`MatchDetail.abilityCastsByRound`) se a
  API confirmar contagem por round.

Todos os campos novos são **anuláveis/opcionais**, para que as telas atuais
continuem funcionando e a HenrikDev guardada continue compilando.

### 6.4 Seleção da fonte

**[call]** Variável `TRACKER_DATA_SOURCE` = `mock` | `riot` (default `mock`
quando ausente). `henrikdev` **não** é opção desta feature (guardada).
Como tem default, não é fail-fast; mesmo assim segue a cadeia: `env.ts`
(`pickDefined`), `docker-compose.yml` (`- TRACKER_DATA_SOURCE`), Infisical
(dono configura, opcional) e Vercel. `riot` sem chave → `CONFIG_ERROR`.

### 6.5 Cache e banco

- Mock é puro e barato: **sem** cache durável (Neon) para dados simulados.
  **[call]** `match-cache-store` / `combat-snapshot-store` ficam para a fonte
  real.
- Banco ganha: vínculo RSO (substitui/estende `user_riot_account` com
  `puuid` e `linked_via = 'rso_mock' | 'rso'`) e a flag `profile_public`.
  Migração nova, nunca editar migração existente.

## 7. Telas e dados novos

Todas as telas atuais permanecem, alimentadas pelo mock **[dono]**: home,
perfil (overview), breakdown, partida, dashboard, settings, console, coach IA.
Novidades:

1. **Partida → "Mapa de abates"**: minimapa do mapa com cada abate do round
   selecionado (killer → vítima), filtro por round e por jogador, plant/defuse
   marcados. Posições de todos no instante do abate ao passar o mouse.
   - Conversão mundo → minimapa usa os multiplicadores públicos por mapa
     (`xMultiplier`, `yMultiplier`, `xScalarToAdd`, `yScalarToAdd`) e a imagem
     do minimapa, **commitados em `public/assets`** como os demais assets.
     **[call]**
2. **Partida → "Economia por round"**: tabela/strip por round com tipo de
   compra do time (pistol / eco / force / full — classificação em
   `analytics`), loadout por jogador, gasto e sobra.
3. **Breakdown → "Disciplina econômica"**: % de rounds em que o jogador
   forçou quando o time economizou (e vice-versa), e win% por tipo de compra.
4. **Breakdown → "Mapa de calor de mortes"**: onde o jogador mais morre por
   mapa/lado (agregado de `victimLocation`).
5. **Coach IA**: o resumo de 3 camadas passa a receber os vetores novos
   (zonas de morte frequentes, disciplina econômica). O prompt continua sem
   receber dado cru.
6. **Selo "DADOS SIMULADOS"** em toda tela com dado mock, e um banner global
   discreto explicando o protótipo.

**[call]** Ordem de valor: 1 e 2 primeiro (mostram o "só com a chave" mais
claramente), depois 3, 4, 5.

## 8. Testes

- Gerador mock: determinismo (mesma semente → saída idêntica), invariantes
  (placar fecha em 13 ou overtime, créditos ≤ 9000, KDA = timeline, posições
  dentro dos limites do mapa).
- `normalize-riot`: fixtures **no formato oficial** (inclusive um payload real
  anonimizado da documentação, se existir) → contratos tracker.
- Analytics novas: 100% de cobertura (regra do projeto).
- Acesso: privado → estado neutro; público → visível; toggle desliga na hora;
  busca não revela existência.
- RSO simulado: `state` inválido rejeitado; negar não grava; desvincular apaga.

## 9. Prontidão para o pedido da chave (fora do código, mas parte do plano)

- Subdomínio próprio apontando para a Vercel **[dono]**; espaço para publicar
  o texto de verificação da Riot (arquivo estático em `public/`).
- Páginas `/termos` e `/privacidade` (o que coletamos, por quanto tempo,
  como apagar, como tornar privado).
- Rodapé com o aviso legal exigido pela Riot ("ValCoach isn't endorsed by
  Riot Games…" — texto exato **[a confirmar]** no portal).
- Texto do pedido: descrição do produto, uso de cada endpoint, por que RSO,
  volumes estimados de chamada. **[call]** rascunho em
  `docs/operacao/pedido-production-key.md`.

## 10. Deixado para quem for construir

- Layout fino das telas novas (seguir *Protocol Precision* e o Stitch quando
  houver tela correspondente).
- Elenco fictício (nomes, agentes favoritos, elos) e zonas por mapa.
- Como quebrar em fases/PRs, desde que cada fase deixe o app funcionando.
