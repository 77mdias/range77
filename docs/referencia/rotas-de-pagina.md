# Rotas de página (App Router)

Todas as páginas são **Server Components**. `export const instant = false`
aparece nas rotas com `params`/`searchParams` assíncronos ou conteúdo dinâmico.
Os route groups não compõem a URL: `(app)` usa o `AppShell` (top-nav +
`NavUser` + banner de dados simulados); `(auth)` tem chrome próprio.

| Rota | Arquivo | Papel |
| --- | --- | --- |
| `/` | `src/app/(app)/page.tsx` + `home-landing.tsx` | landing/busca; perfis recentes ou o perfil demo `ValCoachDemo#DEMO` |
| `/login` | `src/app/(auth)/login/page.tsx` | login social + email/senha (`instant = false`) |
| `/signup` | `src/app/(auth)/signup/page.tsx` | cadastro (sem Riot ID; `instant = false`) |
| `/rso/consent` | `src/app/(auth)/rso/consent/page.tsx` | **Riot Sign-On (simulado)** — autorizar/negar o vínculo |
| `/dashboard` | `src/app/(app)/dashboard/page.tsx` | jogadores seguidos; seguido privado vira card neutro |
| `/dashboard/settings` | `src/app/(app)/dashboard/settings/page.tsx` | perfil, Entrar com Riot, perfil público, desvincular, logout |
| `/console` | `src/app/(app)/console/page.tsx` + `console-view.tsx` | console API & IA (ilha client, dados locais) |
| `/design-system` | `src/app/(app)/design-system/page.tsx` | styleguide (404 em prod) |
| `/matches/[matchId]` | `src/app/(app)/matches/[matchId]/page.tsx` + `match-view.tsx` | detalhe de partida (`?region=`, **`?player=` obrigatório**) |
| `/players/[region]/[name]/[tag]` | `.../page.tsx` + `profile-view.tsx` | Visão Geral do jogador |
| `/players/[region]/[name]/[tag]/breakdown` | `.../breakdown/page.tsx` + `breakdown-view.tsx` | Partidas & Breakdown (amostra por ato, até 30) |
| `/termos` | `src/app/(app)/termos/page.tsx` | Termos de uso + aviso legal da Riot |
| `/privacidade` | `src/app/(app)/privacidade/page.tsx` | o que guardamos, retenção, como tornar privado/desvincular/apagar |

## Consentimento

Perfil, Breakdown e Partida checam `resolveProfileAccess` **antes** de chamar a
fonte, dentro do `<Suspense>` já existente. `private` →
`PrivateProfileState` (`Este jogador não tornou o perfil público.`), idêntico
para conta inexistente. Ver
[consentimento e RSO](../arquitetura/consentimento-e-rso.md).

## Detalhes por rota

### `/` — landing

Ilha client `HomeLanding` (hero de busca, modal de ingestão, pipeline,
módulos, status). Navega via `router.push` para `/players/...`.

- **Perfis recentes** (localStorage `valcoach.recent-players.v2`): no SSR a
  grade mostra placeholders; ao montar, cada recente é **revalidado** pela API
  de overview (falha ou perfil privado → card sem rank).
- Sem recentes, mostra só o perfil demo fictício.

### `/login`, `/signup` e `/rso/consent`

`searchParams: Promise<{ next? }>`. Formulários validados com
`src/lib/validation/credentials.ts` e `authClient`. O consentimento RSO lê a
sessão (`headers()` fora do try; falha → `?rso=error`, sem sessão →
`/login?next=…`).

### `/dashboard` e `/dashboard/settings`

O `proxy` faz a checagem otimista de cookie; as páginas revalidam com
`getSession()` e `redirect('/login?next=...')`. O conteúdo dinâmico é exportado
como função (`DashboardContent`/`SettingsContent`) e envolvido em `<Suspense>`
— os testes chamam a função diretamente. Settings lê `?rso=linked|denied|error`.

### `/matches/[matchId]`

`params: Promise<{ matchId }>`, `searchParams: Promise<{ region?, player? }>`,
`instant = false`, `<Suspense>`. Sem `?player=` ou com perfil privado →
estado neutro. `match-view.tsx` compõe scoreboard, timeline, halves, arsenal,
MVP, **mapa de abates** e **economia por round** (seletor de round em ilha
client). Botão **Voltar** volta no histórico ou cai no perfil do foco.

### `/players/[region]/[name]/[tag]`

`params: Promise<{ region, name, tag }>`, `instant = false`, `<Suspense>`.
Views: `profile-view.tsx` (overview + AI sandbox simulado),
`agents-maps-*.tsx`, `follow-button.tsx`, `recent-rank-sync.tsx` (grava o
rank do perfil nos recentes). `breakdown/` usa a amostra **por ato** e mostra
**disciplina econômica** e **heatmap de mortes** por mapa.

### `/console` e `/design-system`

Ilhas client com dados locais. `/design-system` chama `notFound()` quando
`APP_ENV === 'prod'`.

## Navegação contextual

`AppTopNav` decide pelo `usePathname`:

- dentro de `/players/{region}/{name}/{tag}`: **Visão Geral** ·
  **Partidas & Breakdown** · **Agentes & Mapas** · **Console API & IA**;
- fora: **Busca** e **Console API & IA**.

`NavUser`: **Entrar com Riot** sem vínculo, **Reconecte com Riot** para
vínculo legado, chip do jogador para vínculo RSO, **Conta indisponível** em
falha (fail-soft).
