<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Memória do projeto — ValCoach

## Nova variável de ambiente/secret: registrar em TODOS os pontos da cadeia

`infisical run` injeta os secrets **no shell do host**, não no container. Uma
variável nova só chega ao Node se percorrer TODOS estes pontos:

1. **Infisical (`dev`)** — o dono configura no painel/CLI (agente NÃO roda
   `infisical secrets*`/`export*`: bloqueado no host). Avisar o dono.
2. **`src/config/env.ts`** — adicionar ao snapshot `AppEnv`
   (`pickDefined(source['VAR'])`) e, se for fail-fast, ao tipo
   `RequiredEnvVar` (usar `requireEnv` no ponto de uso).
3. **`docker-compose.yml` → `services.web.environment`** — adicionar a
   entrada pass-through SEM valor (`- MINHA_VAR`). **Esquecer este ponto
   produz `CONFIG_ERROR` no container mesmo com o Infisical injetando.**
4. **Vercel (prod)** — painel manual, quando a fase entrar em produção.

Nunca criar arquivos `.env` (regra do projeto).

## Outros invariantes caros (já mordemos cada um deles)

- **Cache Components**: conteúdo dinâmico (DB/auth) só dentro de
  `<Suspense>`; páginas com `params`/`searchParams` assíncronos usam
  `export const instant = false`. Sessão: `headers()` ANTES de tocar o DB
  (`src/lib/session.ts`).
- **Slots dinâmicos do layout raiz são FAIL-SOFT**: `NavUser` (auth/env/DB)
  roda dentro do `<Suspense>` do `layout.tsx`. Uma exceção NÃO capturada ali
  vira página de erro do Next e, em dev, cada mensagem de HMR dispara
  `window.location.reload()` (`hot-reloader-app.js`) → loop de `GET /`. Regra:
  `headers()` FORA do try/catch (sinal de dinâmico não pode ser capturado) e
  `getSessionFromHeaders()` + store DENTRO do catch, degradando para o chip
  neutro "Conta indisponível". Já regrediu 2x (commits `ccaa6b3` e NavUser).
- **Next 16**: middleware virou **proxy** — é `src/proxy.ts` com
  `export function proxy` (não `middleware.ts`).
- **React 19**: `<title>` (inclusive em SVG) exige FILHO ÚNICO em template
  string; filhos JSX múltiplos renderizam vazio.
- **Cobertura**: `src/services/analytics/**` exige 100% — nenhum cálculo
  fora de lá; componentes de chart apenas renderizam.
- **Lockfile com paridade de npm do CI**: o `npm ci` do CI roda com o npm 10
  (Node 20), que rejeita locks escritos pelo npm 11+ do host quando há
  overrides (`Missing: X from lock file` mesmo com versões corretas). Após
  mudar dependências: `npx npm@10 install --package-lock-only` + validar com
  `npx npm@10 ci --dry-run` antes de commitar.
- **Testes**: `next/navigation` mockado em testes de páginas Client
  (`useRouter`) e redirects espelhados lançando `NEXT_REDIRECT: <url>`.

- **Route groups `(app)`/`(auth)`**: o `AppShell` + `<Suspense>`/`NavUser` vivem em
  `src/app/(app)/layout.tsx`; as telas de auth têm chrome próprio em
  `src/app/(auth)/layout.tsx`. `src/app/layout.tsx` contém SÓ html/body/fontes —
  não devolver o shell para lá. `src/app/fonts/` e `globals.css` ficam na raiz de
  `src/app/` porque os paths de `next/font/local` e o import de CSS são relativos.
- **Better Auth redireciona sozinho**: o cliente traz `redirectPlugin` ligado por
  padrão. Passar `callbackURL` (ou o equivalente de sucesso) para uma chamada
  seguida de trabalho no cliente faz o navegador sair ANTES do trabalho terminar.
  `signUp.email` do cadastro é chamado SEM `callbackURL`; a navegação é explícita
  no fim de `submit()`.
- **Dados de jogador só com consentimento**: toda página/API/ação que mostra
  dado de jogador chama `resolveProfileAccess` (`src/services/access/`) ANTES
  da fonte e FORA de `'use cache'` (depende do viewer). Privado e inexistente
  respondem igual (`PROFILE_NOT_PUBLIC`). Ver `docs/arquitetura/consentimento-e-rso.md`.
- **Fonte de dados = `TrackerSource`** (`TRACKER_DATA_SOURCE`, default `mock`):
  o mock gera DTOs no formato oficial Riot e passa pelo MESMO
  `normalize-riot.ts` da API real. Nunca simular o que a API oficial não
  entrega; nunca usar Riot ID real em mock/fixture/tela. Os `details` brutos
  (~5 MB) não atravessam `'use cache'`/RSC — calcule no serviço.
- **Server Action → Route Handler**: `redirect('/api/...')` dentro de uma
  Server Action executa o handler NO SERVIDOR (o `Set-Cookie` se perde). Para
  o navegador executar o handler (callback OAuth/RSO), devolva a URL e use
  `window.location.assign`.
- **Senha fora do Stitch**: força e confirmação são validação de UX em
  `src/lib/validation/credentials.ts`. O servidor só conhece
  `PASSWORD_MIN_LENGTH`/`PASSWORD_MAX_LENGTH`. A promessa de "30 dias" sai de
  `src/lib/session-policy.ts`, a mesma constante que configura o `createAuth`.
