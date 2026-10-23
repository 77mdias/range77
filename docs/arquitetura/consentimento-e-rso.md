# Consentimento e Riot Sign-On (RSO)

A política da Riot para VALORANT proíbe perfis pessoais, scouting e dado
personalizado **sem opt-in do jogador**. O ValCoach segue um modelo de
"a sua própria conta": dados de um jogador só aparecem para quem tem
consentimento dele.

## Quem vê o quê

| Quem | Vê |
| --- | --- |
| Visitante sem login | landing + **perfil demo fictício** `ValCoachDemo#DEMO` (br) |
| Logado sem conta Riot | convite **Entrar com Riot** |
| Logado com vínculo RSO | a própria conta (overview, breakdown, partidas) + toggle **Tornar meu perfil público** |
| Qualquer pessoa, perfil de terceiro | só se o dono tornou público; senão, o estado neutro `Este jogador não tornou o perfil público.` |

Perfil privado e perfil inexistente produzem **a mesma** resposta (página e
API) — nada revela se uma conta existe.

## Política — `src/services/access/profile-access.ts`

```ts
type ProfileAccess = 'owner' | 'public' | 'demo' | 'private';
decideProfileAccess({ viewerUserId, target, link })   // pura
resolveProfileAccess(viewerUserId, target, deps?)     // busca o vínculo e decide
```

Ordem: alvo = `DEMO_ACCOUNT` (case-insensitive, região `br`) → `demo`; sem
vínculo ou vínculo `legacy` → `private`; vínculo do próprio viewer → `owner`;
`profilePublic` → `public`; senão `private`. Falha do store → `private`
(fail-closed). `getByRiotId` já ignora vínculos `legacy`.

## Onde a política é aplicada

A checagem roda **antes** de qualquer chamada à fonte e **nunca** dentro de
`'use cache'` (depende do viewer):

- páginas `/players/[region]/[name]/[tag]`, `/breakdown` e `/matches/[matchId]`
  (o viewer vem de `getViewerUserId(await headers())`, que trata falha de
  auth como anônimo);
- APIs `/api/players/**` (combate, overview, history) e
  `/api/matches/[region]/[matchId]` → `404 PROFILE_NOT_PUBLIC`;
- **seguir** (`followPlayer` recusa perfil privado) e **dashboard** (seguido que
  ficou privado vira card neutro, com "Deixar de seguir" mantido);
- partida: exige `?player=` cujo acesso não seja `private`.

Constantes em `src/contracts/access.ts` (`PRIVATE_PROFILE_MESSAGE`,
`PROFILE_NOT_PUBLIC_CODE`) — fora do serviço para não puxar o banco para o
bundle do client.

> ⚠️ **Antes de ligar dados reais**: a partida só confere o consentimento do
> jogador do `?player=`, não se a partida pertence ao histórico dele. Com o mock
> isso é seguro (o `matchId` deriva do foco); com a fonte `riot` precisa ser
> verificado. Item do checklist em
> [pedido da Production Key](../operacao/pedido-production-key.md).

## Fluxo RSO simulado

Modelado como OAuth de verdade, para que o RSO real só troque a URL do
provedor e a troca de `code` por token.

1. **Configurações** → formulário GET para `/api/rso/authorize?region=<afinidade>`.
2. **`/api/rso/authorize`** exige sessão (senão `/login?next=…`), valida a
   região, grava o cookie `rso_state` (httpOnly, `sameSite=lax`, 10 min) e
   redireciona para `/rso/consent`.
3. **`/rso/consent`** (grupo `(auth)`, título `Riot Sign-On (simulado)`, sem
   marca da Riot): mostra os escopos (`RSO_SCOPES`, a confirmar no portal) e a
   conta fictícia do usuário (`fictitiousAccountForUser(userId, region)`,
   determinística e única por usuário).
4. **Autorizar** → Server Action `authorizeRso` **devolve** a URL do callback
   com um `code` assinado (HMAC-SHA256 com `BETTER_AUTH_SECRET`, expira em
   5 min) e o client navega com `window.location.assign`. **Negar** →
   `?rso=denied`.
5. **`/api/rso/callback`** confere `state` == cookie, verifica o `code`
   (comparação em tempo constante), exige `code.userId` == sessão e o mesmo
   `puuid`, grava o vínculo `linkedVia: 'rso_mock'`, apaga o cookie e volta para
   `/dashboard/settings?rso=linked`. Qualquer falha → `?rso=error`, nada
   gravado.

> **Por que não `redirect()` na Server Action?** No Next 16, um `redirect` de
> Server Action para um Route Handler é executado **no servidor**: o
> `Set-Cookie` do handler se perde (o `state` deixa de ser de uso único) e a
> URL com `code`/`state` fica no histórico. Por isso o navegador faz o GET.

## Configurações — `/dashboard/settings`

- sem vínculo ou vínculo `legacy`: botão **Entrar com Riot** + região;
- vinculado: conta, toggle **Tornar meu perfil público**
  (`setProfilePublic`, que lê a sessão no servidor e recusa vínculo legado) e
  **Desvincular conta Riot** (`unlinkRiotAccount`, apaga o vínculo — o perfil
  volta a privado na hora).

O `NavUser` mostra **Entrar com Riot** sem vínculo, **Reconecte com Riot**
para vínculo legado e o chip do jogador para vínculo RSO.

## Vínculos legados

O Riot ID digitado nas versões antigas (Configurações e cadastro) virou
`linked_via = 'legacy'` na migração `0004` e **não dá acesso a nada**. O
formulário de digitar Riot ID e o campo do cadastro foram removidos.

Ver [autenticação](./autenticacao.md) e
[banco de dados](./banco-de-dados-e-migracoes.md).
