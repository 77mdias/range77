# Rotas de página (App Router)

Todas as páginas são **Server Components**. `export const instant = false`
aparece nas rotas com `params`/`searchParams` assíncronos ou conteúdo dinâmico.

| Rota | Arquivo | Papel |
| --- | --- | --- |
| `/` | `src/app/page.tsx` + `home-landing.tsx` | landing/busca (landing é ilha client) |
| `/login` | `src/app/login/page.tsx` | login social + email/senha (`instant = false`) |
| `/signup` | `src/app/signup/page.tsx` | cadastro (`instant = false`) |
| `/dashboard` | `src/app/dashboard/page.tsx` | jogadores seguidos (protegida, `<Suspense>`, `instant = false`) |
| `/dashboard/settings` | `src/app/dashboard/settings/page.tsx` | perfil + Riot ID + logout |
| `/console` | `src/app/console/page.tsx` + `console-view.tsx` | console API & IA (ilha client) |
| `/design-system` | `src/app/design-system/page.tsx` | styleguide (404 em prod) |
| `/matches/[matchId]` | `src/app/matches/[matchId]/page.tsx` + `match-view.tsx` | detalhe de partida (`?region=`, `?player=`) |
| `/players/[region]/[name]/[tag]` | `.../page.tsx` + `profile-view.tsx` | Visão Geral do jogador |
| `/players/[region]/[name]/[tag]/breakdown` | `.../breakdown/page.tsx` + `breakdown-view.tsx` | Partidas & Breakdown (amostra por ato, até 30) |

## Detalhes por rota

### `/` — landing

Ilha client `HomeLanding` (hero de busca, modal de ingestão 3-layer, pipeline,
módulos, status). Navega via `router.push` para `/players/...`. Perfis demo
ficam como conteúdo rotulado.

### `/login` e `/signup`

`searchParams: Promise<{ next? }>`. Formulários validados com
`src/lib/validation/credentials.ts` e `authClient`.

### `/dashboard` e `/dashboard/settings`

O `proxy` faz a checagem otimista de cookie; as páginas revalidam com
`getSession()` e `redirect('/login?next=...')`. O conteúdo dinâmico é exportado
como função (`DashboardContent`/`SettingsContent`) e envolvido em `<Suspense>`
(fallback skeleton) — os testes chamam a função diretamente.

### `/matches/[matchId]`

`params: Promise<{ matchId }>`, `searchParams: Promise<{ region?, player? }>`,
`instant = false`, `<Suspense>` (`MatchSkeleton`). `match-view.tsx` é
Server/pura e compõe scoreboard, timeline, halves, arsenal e MVP.

### `/players/[region]/[name]/[tag]`

`params: Promise<{ region, name, tag }>`, `instant = false`, `<Suspense>`
(`ProfileSkeleton`). Views: `profile-view.tsx` (overview + AI sandbox),
`agents-maps-explorer.tsx` (client, filtros reais), `agents-maps-sections.tsx`
(seções puras), `follow-button.tsx` (Server Actions). `breakdown/` usa a amostra
**por ato** (até 30; fallback 15 do ato anterior) — a Visão Geral usa 5. Ver
[serviços](../dominio/servicos.md).

### `/console` e `/design-system`

Ambas são ilhas client com dados locais. `/design-system` chama `notFound()`
quando `APP_ENV === 'prod'`.

## Navegação contextual

`AppTopNav` decide pelos `usePathname`:

- dentro de `/players/{region}/{name}/{tag}`: **Visão Geral** ·
  **Partidas & Breakdown** · **Agentes & Mapas** · **Console API & IA**;
- fora: **Busca** e **Console API & IA** (nunca inventa "player conectado").

O chip do jogador conectado (`NavUser`) só aparece se houver sessão + Riot ID
vinculado.
