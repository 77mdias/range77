# Adicionar uma tela (guia passo a passo)

Receita para levar uma nova tela (ou um bloco de dados) do zero ao commit,
respeitando as regras do projeto.

## 1. Definir o contrato

- Se o dado vem da fonte de partidas, confira se ele existe no formato
  oficial (`src/contracts/riot.ts` e
  [`riot-val-match-v1.md`](../referencia/riot-val-match-v1.md)) — dado que a
  API oficial não entrega **não** é simulado. Adicione a forma normalizada em
  `src/contracts/tracker.ts` (campo opcional), o mapeamento em
  `src/services/riot/normalize-riot.ts` e a geração no mock
  (`src/services/riot/mock/`).
- Se a tela mostra dado de jogador, ela passa pela checagem de consentimento
  (`resolveProfileAccess`) antes de buscar — ver
  [consentimento e RSO](../arquitetura/consentimento-e-rso.md).
- Se é saída para o chatbot, estenda o envelope em `src/contracts/coach.ts`.

## 2. Escrever o teste primeiro (RED)

- Coloque o teste em `tests/` espelhando o caminho de `src/`.
- Cubra: sucesso, erro do serviço externo e **dados nulos/ausentes**.
- Se for cálculo, o teste vai em `tests/services/analytics/*.test.ts` (o
  threshold de 100% será cobrado).

## 3. Implementar o cálculo

- Todo cálculo/agregação vai para `src/services/analytics/**` (função pura).
- Trate divisão por zero e listas vazias retornando `null`/valor finito.
- Para charts, produza os pontos/domínios em `chart-transforms.ts`.

## 4. Orquestrar (se houver I/O)

- Serviço em `src/services/tracker/**` ou `coaching/**`, com **DIP**
  (`client?`, `store?`, `getSession`).
- Persistência é sempre **best-effort** (não derruba a resposta).
- Se o dado deve ser cacheado, adicione um helper em
  `src/lib/cache/tracker.ts` com `'use cache'` + `cacheLife` + `cacheTag`
  (chave incluindo o `size` quando a amostra variar).

## 5. Criar a página / rota

- Página em `src/app/**/page.tsx` como **Server Component**.
- `params`/`searchParams` são `Promise` — `await`.
- Conteúdo dinâmico (DB/auth) dentro de `<Suspense>`; página com params
  assíncronos usa `export const instant = false`.
- Erros viram `ErrorState` com o envelope `ApiErrorBody`.
- A apresentação fica numa view separada (`*-view.tsx`) que **não** calcula.

## 6. Montar a UI

- Reaproveite primitivas de `src/components/ui/**`; componentes de domínio em
  `match/`, `player/`, `agents/`, `ai/`, `charts/`.
- Use **apenas** tokens semânticos (`bg-surface`, `text-text-primary`,
  `border-line`, `bg-accent`...) e fontes por papel.
- Nada de valor inventado: ausente → `—`/omitido.

## 7. Expor API (quando fizer sentido)

- Route Handler em `src/app/api/**/route.ts`.
- Mapeie erros com `mapUpstreamError`/`errorResponse`
  (`src/lib/http/api-error.ts`); nunca vaze stack.
- Use os helpers de cache compartilhados.

## 8. Documentar

- Se for uma tela do Stitch, atualize
  [`design/telas-stitch.md`](../design/telas-stitch.md).
- Se for uma métrica, documente a fórmula em
  [`dominio/metricas.md`](../dominio/metricas.md).
- Se for um invariante novo, registre em
  [`arquitetura/decisoes.md`](../arquitetura/decisoes.md).

## 9. Validar e commitar

```bash
npm run test:coverage
npm run typecheck
npm run build
```

- Verificação visual (Playwright) da rota, sem erros no console.
- Commit atômico `feat(...)`; avise o dono sobre nova env var (Infisical) ou
  migração a aplicar.
