# Autenticação

Autenticação via **Better Auth** com Google, Discord e email/senha.
Duas conexões de banco coexistem: a do app (`neon-http`) e a do auth
(`neon-serverless` com WebSocket, necessária para transações).

## Servidor — `src/lib/auth.ts`

- `resolveAuthEnv(source)` exige `BETTER_AUTH_SECRET` e `BETTER_AUTH_URL`
  (`requireEnv`) e monta `google`/`discord` **condicionalmente**: um provedor
  social só é ativado se **ambas** as credenciais existirem (`socialProvider`).
- `createAuth(db, authEnv)` é puro/injetável:
  `betterAuth({ database: drizzleAdapter(db, { provider: 'pg', schema }),
  socialProviders, emailAndPassword: { enabled: true,
  minPasswordLength: PASSWORD_MIN_LENGTH, maxPasswordLength: PASSWORD_MAX_LENGTH,
  requireNameAndEmail: true }, plugins: [nextCookies()] })`.
  - `nextCookies()` deve ser o **último** plugin.
- `getAuth()` é um singleton **lazy** — resolve env/DB no primeiro uso, para
  que o build não exija credenciais.

## Cliente — `src/lib/auth-client.ts`

`'use client'`; `export const authClient = createAuthClient()`
(Better Auth React). Fala com `/api/auth/*` e expõe `useSession`.

## Sessão server-side — `src/lib/session.ts`

```ts
getSession(): Promise<SessionView | null>
```

Chama `await headers()` **primeiro** — em prerender lança o sinal de dinâmico
do Cache Components **antes** de qualquer custo de banco — e só então
`getAuth()` + `auth.api.getSession({ headers })`. Achata o usuário
(`email`/`image` nulos → `null`).

## Proteção de rotas — `src/proxy.ts` (sucessor do middleware)

```ts
export function proxy(request: NextRequest) { ... }
export const config = { matcher: ['/dashboard/:path*'] };
```

- Checagem **otimista** de presença do cookie
  (`better-auth.session_token` / `__Secure-better-auth.session_token`), sem DB.
- Sem cookie → `redirect('/login?next=<pathname>')`.
- **Cookie presente ≠ sessão válida**: a validação real acontece nas páginas e
  Server Actions via `getSession()`.

## Fluxo de login

1. `/login` e `/signup` (Server, `instant = false`, `searchParams.next`)
   renderizam `SocialLoginButtons` e `EmailLoginForm`.
2. O formulário valida com `src/lib/validation/credentials.ts` e chama
   `authClient.signIn.email` / `signUp.email` (email normalizado em minúsculas).
3. O handler Better Auth (`src/app/api/auth/[...all]/route.ts`) processa e
   seta o cookie.
4. `/dashboard` passa pelo `proxy` (cookie) e revalida a sessão com
   `getSession()`; sem sessão → `redirect('/login?next=...')`.

## Domínio autenticado

- **Seguir jogador** — `tracked_players`; Server Actions `followPlayer` /
  `unfollowPlayer` (`src/app/actions/tracked-players.ts`), com
  `revalidatePath('/dashboard')`.
- **Vincular Riot ID** — `user_riot_account`; Server Actions
  `linkRiotAccount` / `unlinkRiotAccount`
  (`src/app/actions/user-riot.ts`), com `revalidatePath('/dashboard/settings')`.
  O `NavUser` mostra o chip do jogador conectado (Riot ID vinculado).

## Variáveis

`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (obrigatórias no boot do primeiro
uso), `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`,
`DISCORD_CLIENT_ID`/`DISCORD_CLIENT_SECRET` e o opcional `AUTH_DATABASE_URL`.
Ver [variáveis de ambiente](../desenvolvimento/variaveis-de-ambiente.md).

## Pegadinha

O `email` do Better Auth é **nullable com índice único** porque o Discord pode
retornar `email: null` (contas só-celular); o Postgres aceita múltiplos NULLs
em índice único.
