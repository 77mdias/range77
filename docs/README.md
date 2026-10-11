# Documentação — ValCoach

> Índice central da documentação técnica do app **ValCoach** (tracker &
> coach estatístico de Valorant). Escrito para quem vai **ler, operar ou
> evoluir** o código.

Este diretório reúne, de forma organizada, o que antes estava espalhado por
`README.md`, `AGENTS.md`, `DESIGN.md` e `plan/`. As **fontes de verdade**
continuam sendo o código e os arquivos originais; a documentação aqui é a
porta de entrada e o mapa.

## Fontes de verdade

| Assunto | Fonte canônica |
| --- | --- |
| Comportamento do app | o próprio código em `src/**` |
| Design system (tokens, componentes, regras) | [`DESIGN.md`](../DESIGN.md) |
| Memória/invariantes do projeto | [`AGENTS.md`](../AGENTS.md) |
| Planos de execução (histórico) | [`plan/`](../plan) |
| Referências visuais Stitch | [`design-stitch/`](../design-stitch) |

## Como navegar

### 🏗️ [Arquitetura](./arquitetura/visao-geral.md)

Como o sistema é montado e por quê.

- [Visão geral](./arquitetura/visao-geral.md) — stack, camadas, princípios
- [Estrutura de pastas](./arquitetura/estrutura-de-pastas.md) — mapa de `src/` e `tests/`
- [Fluxo de dados](./arquitetura/fluxo-de-dados.md) — HenrikDev → normalização → analytics → UI
- [Banco de dados e migrações](./arquitetura/banco-de-dados-e-migracoes.md) — Drizzle + Neon
- [Cache e revalidação](./arquitetura/cache-e-revalidacao.md) — `use cache`, `cacheLife`, Neon
- [Autenticação](./arquitetura/autenticacao.md) — Better Auth, proxy, sessão
- [Decisões](./arquitetura/decisoes.md) — registro de decisões arquiteturais

### 🎯 [Domínio](./dominio/contratos.md)

As regras de negócio e os modelos de dados.

- [Contratos](./dominio/contratos.md) — `henrikdev.ts`, `tracker.ts`, `coach.ts`
- [Serviços](./dominio/servicos.md) — `henrikdev/`, `tracker/`, `coaching/`
- [Métricas derivadas](./dominio/metricas.md) — KAST, Rating, ADR, entry, consistência...
- [Partida e rounds](./dominio/partida-e-rounds.md) — timeline, halves, perspectiva

### 🎨 [Design](./design/design-system.md)

- [Design system](./design/design-system.md) — Protocol Precision + tokens
- [Componentes](./design/componentes.md) — catálogo por pasta
- [Telas Stitch](./design/telas-stitch.md) — mapa Stitch → rotas

### 🛠️ [Desenvolvimento](./desenvolvimento/setup-local.md)

- [Setup local](./desenvolvimento/setup-local.md) — Docker + Infisical
- [Variáveis de ambiente](./desenvolvimento/variaveis-de-ambiente.md) — a cadeia completa
- [Testes e cobertura](./desenvolvimento/testes-e-cobertura.md) — TDD, Vitest, 100%
- [Convenções](./desenvolvimento/convencoes.md) — código, Next 16, integridade de dados
- [Adicionar uma tela](./desenvolvimento/adicionar-uma-tela.md) — guia passo a passo

### ⚙️ [Operação](./operacao/deploy.md)

- [Deploy](./operacao/deploy.md) — Dockerfile e Vercel

### 📚 [Referência](./referencia/rotas-api.md)

- [Rotas de API](./referencia/rotas-api.md) — Route Handlers
- [Rotas de página](./referencia/rotas-de-pagina.md) — App Router
- [Glossário](./referencia/glossario.md) — termos e siglas

## Regras de ouro (leia antes de codar)

1. **Nunca fabricar dados.** Campo sem suporte → `—` ou omitido; conteúdo
   demo/simulado deve estar **rotulado**.
2. **Todo cálculo mora em `src/services/analytics/**`** — cobertura **100%**
   (statements, branches, functions, lines). Componentes apenas renderizam.
3. **Zero arquivos `.env`.** Segredos vêm do Infisical (dev) ou do painel da
   Vercel (prod). Variável nova exige registrar em **toda a cadeia** (ver
   [variáveis de ambiente](./desenvolvimento/variaveis-de-ambiente.md)).
4. **Next 16**: `params`/`searchParams`/`cookies()`/`headers()` são `Promise`;
   middleware chama-se **proxy** (`src/proxy.ts`); conteúdo dinâmico vive
   dentro de `<Suspense>`.
5. **TDD estrito**: teste antes da implementação; a suíte completa e o
   `typecheck` precisam passar antes de qualquer commit.
