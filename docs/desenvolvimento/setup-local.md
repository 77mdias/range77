# Setup local

O desenvolvimento local roda em **Docker** com os segredos injetados pelo
**Infisical** a partir da máquina hospedeira. Não existe (nem pode existir)
arquivo `.env`.

## Pré-requisitos (máquina hospedeira)

- Docker
- CLI do Infisical autenticada (workspace vinculado via `.infisical.json`)
- Node `>=20.9` (para typecheck/testes fora do container, quando desejado)

## Subir o ambiente

```bash
infisical run --env=dev -- docker compose up --build
```

Isso:
1. roda a CLI do Infisical no host e injeta as variáveis na sessão do Compose;
2. o Compose repassa as chaves de `services.web.environment` **sem valor**
   (o `infisical run` as preenche; as inexistentes são omitidas);
3. o container sobe o `next dev` em `localhost:3000`.

O `docker-compose.yml` monta `.:/app` (live reload), `node_modules` isolado e
`next_cache` persistente; o healthcheck chama `GET /api/health`.

## Comandos

| Comando | Efeito |
| --- | --- |
| `npm run dev` | `next dev` (Turbopack) |
| `npm run build` | build de produção |
| `npm run start` | serve o build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | `vitest run` |
| `npm run test:watch` | Vitest em watch |
| `npm run test:coverage` | cobertura (analytics 100%) |
| `npm run db:generate` | gera migração (drizzle-kit) |
| `npm run db:migrate` | aplica migrações |

## Ordem de validação antes de qualquer commit

```bash
npm run test:coverage   # suíte + thresholds
npm run typecheck       # tsc --noEmit
npm run build           # next build
```

## O que é do agente vs. do dono

- **Agente**: editar código, rodar `npm test`/`typecheck`/`build`, gerar
  migrações (`db:generate`), verificar telas (Playwright).
- **Dono (host)**: `infisical run --env=dev -- docker compose up --build` e
  `infisical run --env=dev -- npm run db:migrate` (comandos com credenciais).

> O agente **não** roda `infisical secrets*`/`export*` (bloqueado no host) e
> **nunca** imprime valores de segredos.

## Verificação visual

Screenshots do Playwright são gravados sob a raiz do repo (`.playwright-mcp/`,
gitignored). A verificação por fase compara a rota com o screenshot do Stitch
e exige **sem erros no console**.
