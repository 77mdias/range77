# Telas de autenticação fiéis ao Stitch — Login (7) e Cadastro (8)

- **Data:** 2026-10-16
- **Status:** aprovado para planejamento
- **Fonte de verdade visual:** telas 7 (`3bb8ff118e7948be9211054ef15892db`, "Autenticação & Login") e 8
  (`6aa4ce44cbca4477b0f98a11a079f305`, "Cadastro & Novo Operador") do projeto Stitch
  `projects/10337952812821192130`, exportadas para `.stitch/login.html` e `.stitch/signup.html`
  (commitadas como referência de design — são a fonte de verdade do layout, não código de produção).
- **Design system:** *Protocol Precision* — já traduzido em `src/app/globals.css`.

## 1. Problema

`/login` e `/signup` existem e são funcionais (Better Auth 1.7.7, Google + Discord +
e-mail/senha), mas foram construídos como um formulário centralizado simples
(`max-w-md`), sem relação com as telas 7/8 do Stitch, que desenham um *terminal
tático de autenticação* em grid de 12 colunas com chrome próprio.

Além disso, as telas pedem capacidades funcionais que hoje não existem: sessão
persistente de 30 dias, confirmação de senha, medidor de força, aceite de termos
e captura inicial do Riot ID.

## 2. Escopo

### Dentro
- Reestruturação de rotas para dar chrome próprio às telas de auth.
- Chrome de autenticação (header `SYS_AUTH`, tabs, strip de telemetria, footer).
- Tela 7 (`/login`) e tela 8 (`/signup`) fiéis ao Stitch.
- `rememberMe` (30 dias), confirmação de senha, medidor de força, termos obrigatórios.
- Riot ID + região opcionais no cadastro, reusando o vínculo já existente.

### Fora (decidido com o dono)
- **Fluxo "Esqueceu a senha?"** — o repo não tem nenhuma infraestrutura de e-mail
  (zero `nodemailer`/`resend`/SMTP). Adicionar reset exigiria fornecedor externo
  novo e a cadeia de secrets em 4 pontos (Infisical → `env.ts` →
  `docker-compose.yml` → Vercel). Fica como fase própria.
- **Login por Riot ID** — o campo aceita apenas e-mail. Ver §6.
- Login oficial via Riot Sign-On (RSO) — o próprio Stitch desenha como "aguardando key".

## 3. Decisões

| Decisão | Escolha | Razão |
|---|---|---|
| Chrome das telas de auth | Route group `(auth)` + `(app)` | Fiel ao Stitch; e o `NavUser` hoje mostraria "Conta indisponível" antes do login |
| Identificador do login | Apenas e-mail | Evita caminho de auth customizado e enumeração de contas |
| Reset de senha | Fora de escopo | Sem infra de e-mail; exigiria provider + secrets |
| Riot ID no cadastro | Opcional, reusa `linkRiotAccountCore` | Schema, serviço, validação e UI em settings já existem |
| Ícones | Reusar `src/components/ui/icon` | Fonte Material Symbols é do Google; o container não tem rede no build |
| Medidor de força | `src/lib/validation/credentials.ts` | Cálculo puro compartilhado cliente/servidor |
| Sombras da tela 8 | Normalizar para hairline + `shadow-hard-*` | `signup.html` usa `shadow-sm` (blur), proibido pelo design system |

### Desvios conscientes do arquivo do Stitch
1. **Sombras da tela 8.** O arquivo usa `shadow-sm`/`shadow-md` (blur). O
   `designMd` diz explicitamente "rejects blurred ambient dropshadows". A tela 8
   é normalizada para a mesma linguagem da tela 7: hairline `1px solid #000000`
   + `shadow-hard-2`/`shadow-hard-3`.
2. **Copy enganosa do login.** O Stitch rotula "E-mail ou Riot ID associado"; como
   o campo aceita só e-mail, o label passa a "E-mail".
3. **Links sem destino.** Termos de Serviço, Política de Privacidade e Status do
   Sistema não existem como rotas. Ficam como `#` com TODO explícito.
4. **Tabs duplicadas.** O Stitch desenha o switcher Entrar/Cadastro duas vezes na
   tela 7 (header e dentro do card). Ambas são mantidas — é o que o design mostra.

## 4. Reestruturação de rotas (§1)

**Este passo é um commit isolado, sem mudança visual.** É onde mora o risco
conhecido: `AGENTS.md` registra que os slots dinâmicos do `NavUser` e o
`<Suspense>` do `layout.tsx` já regrediram 2×.

```
src/app/layout.tsx          → apenas html/body/fontes  (hoje: + AppShell)
src/app/(app)/layout.tsx    → AppShell + NavUser, movidos verbatim
src/app/(app)/{page,dashboard,console,design-system,matches,players,repro-tmp}
src/app/(auth)/layout.tsx   → AuthHeader + children + AuthFooter
src/app/(auth)/{login,signup}
```

- `api/` e `actions/` permanecem na raiz (não são afetados por layout).
- URLs não mudam: route group não compõe o path.
- `repro-tmp` vai para `(app)` para não perder o shell.
- `src/app/fonts/` fica junto do root layout, preservando os paths relativos de `next/font/local`.

## 5. Componentes (§2 e §3)

Escopo em `src/components/auth/` — `ui/` continua significando "design system
genérico", `auth/` significa "só as telas de auth".

**Chrome:** `AuthHeader` (marca + wordmark + badge `SYS_AUTH` + telemetria + tabs),
`AuthTabs` (client, `usePathname`), `AuthFooter`, `TelemetryStrip`.

**Conteúdo:** `AuthTerminal` (card com linha de protocolo e badge),
`TelemetryPanel` (eyebrow + corpo), `StatStrip` (linha de 3 métricas),
`InfoRow` (ícone + título + descrição), `Field` (label + hint + input com ícone),
`PasswordField` (toggle de visibilidade + medidor opcional), `CheckboxRow`,
`SubmitButton`, `AuthDivider`, `SsoButtons`, `RiotCallout` (2 variantes).

**Reuso obrigatório do que já existe:** `Sparkline` (gráfico da tela 8),
`InfoCallout` (callout da Riot), `TagLabel` (micro-chips), `StatusDot`
(indicadores pulsantes), `Button`/`Card`, `Icon`.

## 6. Mudanças funcionais (§5)

- **`rememberMe`** — passado do checkbox para `authClient.signIn.email`; default
  marcado; `session.expiresIn` em 30 dias no `createAuth`.
- **Confirmação de senha** — validação pura nova em `credentials.ts`, reusada no
  cliente e no servidor (mesma fonte única dos limites atuais).
- **Medidor de força** — derivado dos limites já existentes; apenas apresentação
  (não substitui a validação do servidor).
- **Termos** — checkbox obrigatório; sem efeito no backend nesta fase.
- **Riot ID + região no cadastro** — opcionais. Vinculados **depois** de
  `signUp.email` (que já estabelece sessão), via `linkRiotAccountCore`.
- **Login** — `signIn.email` puro, sem alteração de contrato.

## 7. Testes

- Atualizar `tests/app/login/login-page.test.tsx`,
  `tests/app/login/email-auth-forms.test.tsx`, `tests/app/signup/signup-page.test.tsx`.
- **Preservar os hooks existentes**: `data-login-page`, `data-signup-page`,
  `data-email-login`, `data-signup-form`.
- Novos testes unitários para as primitivas de `src/components/auth/`.
- `AuthTabs` exige `next/navigation` mockado (padrão já usado nos testes de páginas client).
- `src/services/analytics/**` permanece intocado — a regra de 100% de cobertura
  não é afetada.

## 8. Ordem de trabalho

1. **Reestruturação de rotas** → suíte verde, zero mudança visual → **commit próprio**.
2. Chrome de auth (`(auth)` layout + componentes de §5).
3. Tela 7 (`/login`).
4. Tela 8 (`/signup`) + Riot ID + `rememberMe` + força + termos.
5. Testes e cobertura.

Antes de escrever qualquer código: ler `node_modules/next/dist/docs/` conforme o
`AGENTS.md` (a versão de Next do projeto tem diferenças de API e convenção).

## 9. Riscos

| Risco | Mitigação |
|---|---|
| Mover `AppShell` regride o `NavUser` (já ocorreu 2×) | Passo 1 isolado, suíte verde antes de seguir |
| Fontes/ícones quebrando o build offline | Não introduzir fonte hospedada; reusar `Icon` |
| Divergência entre telas 7 e 8 | Linguagem visual única (`Protocol Precision`), tela 7 como referência |
| Escopo crescer para o reset de senha | Explicitamente fora; vira fase própria |

## 10. Pendências registradas

- Fluxo de reset de senha com provider de e-mail (fase própria).
- Páginas de Termos de Serviço, Política de Privacidade e Status do Sistema.
- Login oficial via Riot Sign-On, quando a key de produção sair.
