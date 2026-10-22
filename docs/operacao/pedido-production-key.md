# Pedido da Production API Key da Riot — roteiro

## Produto

ValCoach é um coach de desempenho para VALORANT: o jogador vincula a PRÓPRIA conta Riot, vê
partidas, breakdown por ato, economia e mapa dos abates, e recebe orientações de treino. Hoje é
um protótipo: todos os dados de partida são simulados (selo `DADOS SIMULADOS` + banner global) e
só passam a ser reais depois da aprovação da chave.

## Endpoints e por quê (ref.: `docs/referencia/riot-val-match-v1.md`)

| Endpoint | Para quê |
| --- | --- |
| `GET /riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}` e `/by-puuid/{puuid}` (ACCOUNT-V1) | resolver Riot ID <-> PUUID na busca |
| `GET /riot/account/v1/accounts/me` (token RSO) | identificar o dono da conta ao vincular |
| `GET /val/match/v1/matchlists/by-puuid/{puuid}` (VAL-MATCH-V1) | histórico recente do jogador |
| `GET /val/match/v1/matches/{matchId}` (VAL-MATCH-V1) | detalhe: rounds, abates, economia, posições |

Não existe endpoint oficial de tier/RR atual. Rank/RR é só mock hoje; a funcionalidade será
removida ou refeita a partir de `competitiveTier` das partidas. Habilidades por round não são
simuladas (a API só expõe agregado da partida).

## Por que RSO (modelo de consentimento)

O jogador só vincula a própria conta, via Riot Sign-On. O perfil nasce privado; torná-lo
público é opt-in explícito (Configurações). Pode desvincular a qualquer momento. Hoje o fluxo é
simulado (`Riot Sign-On (simulado)`).

## Estimativa de chamadas por minuto

Cache (`src/lib/cache/tracker.ts`): perfil/breakdown revalidam a cada 25 min (stale 5 min,
expire 6 h); partida e card a cada 1 h (expire 24 h). Cada perfil novo custa ~1 matchlist + até
N partidas (amostra de 10 a 30) + 1 account. Com cache, cada jogador gera no máximo ~1 rajada
por 25 min; ~100 usuários ativos distintos/hora dão ~ (100 x 31) / 60 = ~50 chamadas/min no
pior caso frio, e bem menos em regime (partidas cacheadas por 1 h). Estimativa a revalidar com
tráfego real; o cliente deve respeitar os limites da chave (hoje sem rate limiter próprio).

## Roteiro para o avaliador (caminhos relativos)

1. `/` — home com busca e demo
2. `/players/br/ValCoachDemo/DEMO` — perfil demo fictício
3. `/players/br/ValCoachDemo/DEMO/breakdown` — partidas e breakdown
4. uma partida a partir da lista do perfil (`/matches/<id>?region=br&player=ValCoachDemo%23DEMO`) — mapa + economia
5. `/login` -> `Entrar com Riot` -> `/rso/consent` — fluxo RSO simulado
6. `/dashboard/settings` — perfil público, desvincular
7. `/termos` e `/privacidade`; aviso legal da Riot no rodapé de todas as telas

## Verificação de domínio

1. Fazer o deploy em um subdomínio de domínio do dono na Vercel (ex.: `valcoach.<domínio>`).
2. A Riot fornece um texto/arquivo de verificação no portal (Product Registration).
3. Salvar o texto exato em `public/<nome-que-a-Riot-indicar>` (ex.: `public/riot.txt`) — servido na raiz.
4. Publicar, abrir `https://valcoach.<domínio>/riot.txt` e confirmar o conteúdo; então clicar em verificar no portal.
5. Definir o e-mail de contato real (placeholder `contato@<domínio>` em `src/lib/legal.ts`).

## Pré-requisitos antes de ligar dados reais

- [ ] 1. Acesso a partida deve verificar que a partida pertence ao histórico do jogador em foco
  (ruling R12). Hoje só o consentimento do perfil em foco é checado — seguro apenas com o mock.
- [ ] 2. Revalidar os ids de catálogo (armas, armaduras, mapas, temporadas) de memória.
- [ ] 3. Substituir rank/RR simulados (ver acima: sem endpoint oficial).
- [ ] 4. Coach de IA: o repositório não tem cliente MiniMax hoje; o terminal do coach é simulado.
- [ ] 5. Implementar a fonte `TRACKER_DATA_SOURCE=riot` e colocar a chave no Infisical (dev) e na Vercel (prod), seguindo a cadeia do `AGENTS.md` (`env.ts`, `docker-compose.yml`).
- [ ] 6. Rodar `npm run db:migrate` (migração `drizzle/0004`).
