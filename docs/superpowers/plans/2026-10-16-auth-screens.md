# Telas de autenticação fiéis ao Stitch — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconstruir `/login` e `/signup` fiéis às telas 7 e 8 do Stitch, com chrome de autenticação próprio, sessão persistente de 30 dias, confirmação de senha, medidor de força, aceite de termos e captura opcional de Riot ID.

**Architecture:** Um route group `(auth)` ganha layout próprio (`AuthHeader` + `children` + `AuthFooter`), separando as telas de auth do `AppShell` da app. As telas passam a ser Server Components que compõem primitivas de `src/components/auth/`; os formulários continuam Client Components que falam com o Better Auth via `authClient`. Toda a validação de credenciais permanece em `src/lib/validation/credentials.ts` (fonte única cliente/servidor).

**Tech Stack:** Next.js 16.4 (App Router, `cacheComponents: true`, Turbopack), React 19, TypeScript, Tailwind v4 (`@theme` em `src/app/globals.css`), Better Auth 1.7.7, Vitest 3 + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-16-auth-screens-design.md`

## Global Constraints

- **Fonte de verdade visual:** `.stitch/login.html` (tela 7) e `.stitch/signup.html` (tela 8). São referência de design, não código de produção.
- **Design system:** *Protocol Precision*. Tokens semânticos de `src/app/globals.css`: `bg-surface` (#fff), `bg-surface-raised` (#f9fafb), `bg-surface-recessed` (#f3f3f4), `bg-surface-pressed` (#e2e2e2), `bg-accent` (#f5f841), `text-on-accent`, `text-text-primary` (#000), `text-text-secondary` (#797861), `text-loss`, `border-line` (hairline preta 1px), `shadow-hard-1|-2|-3|-4|-6`, `rounded-xs`(1px)/`-sm`(2px)/`-md`(3px), `font-display`/`font-hud`/`font-body`, `duration-[var(--duration-fast)]`, `ease-out-expo`.
- **Proibido:** sombra com blur (`shadow-sm`/`shadow-md`), fonte hospedada (`next/font/google` — o build roda offline), novo provedor de e-mail, `#f5f841` em corpo de texto ou fill de container grande, cores cromáticas novas fora de `text-loss`.
- **Nunca** criar arquivos `.env`.
- `export const instant = false` permanece em `/login` e `/signup` (consomem `searchParams`).
- Hooks `data-*` preservados: `data-login-page`, `data-signup-page`, `data-email-login`, `data-signup-form`, `data-social-login`.
- Preço de paridade do lockfile: se `package.json` mudar, `npx npm@10 install --package-lock-only` + `npx npm@10 ci --dry-run`. **Este plano não adiciona dependências.**
- Não tocar em `src/services/analytics/**` (exige 100% de cobertura) nem em `src/components/layout/app-shell.tsx`.

## Desvios conscientes do arquivo do Stitch

Já decididos no spec (§3): sombras da tela 8 normalizadas para hairline + `shadow-hard-*`; label do login vira "E-mail"; links sem destino usam `#` + TODO; tabs duplicadas são mantidas.

Adicionais, decididos neste plano (avisar o dono):

1. **Wordmark.** Stitch escreve `VALORANT.COACH`; mantido — é o literal que `src/components/layout/top-nav.tsx:69` já usa em produção. Não há divergência de marca a introduzir.
2. **Rodapé.** Stitch escreve `© 2024 VALORANT.COACH TELEMETRY SYSTEMS. RIOT GAMES AFFILIATE PROTOCOL.`. O app já decidiu o oposto: `app-footer.tsx:34` publica "Não afiliado à Riot Games". O rodapé de auth mantém a estrutura do Stitch (build + copyright + 3 links) com a redação de não-afiliação.
3. **Aviso de superfície amarela.** Stitch pinta os botões de submit com `#f5f841` + texto preto — permitido (`text-on-accent` sobre `bg-accent`).
4. **Cor de marca da Riot.** O bloco `R` usa `#D32936` (vermelho da Riot), cor de terceiro fora do design system. Mantida por ser marca, não decoração.
5. **Região do Riot ID.** Stitch oferece 4 opções, duas delas agrupadas (`KR / ASIA PACIFIC`) e sem LATAM. As opções passam a ser as 6 afinidades reais de `HENRIKDEV_AFFINITIES`, para não mentir sobre o contrato aceito pelo backend.
6. **"Esqueceu a senha?".** Fluxo sem infraestrutura (spec §2). Renderiza como `href="#"` + `TODO(reset-senha)`, mesmo tratamento dos três links do rodapé (spec §3.3).
7. **Approximações de token (~imperceptíveis, documentadas).** Stitch `surface-container-high` (#e8e8e8) → `bg-surface-pressed` (#e2e2e2); Stitch `on-surface-variant` (#484833) → `text-text-secondary` (#797861); divisores fracos `outline-variant` (#cac8ad) → `border-line`/`bg-line` (doutrina: estrutura vem de hairline preta).
8. **Reuso parcial do spec §5.** O spec lista como reuso obrigatório `Sparkline`, `InfoCallout`, `TagLabel`, `StatusDot`, `Button`/`Card`, `Icon`. Este plano reusa `Sparkline`, `TagLabel`, `StatusDot` e `Icon`, mas **não** `InfoCallout`, `Button` nem `Card`, porque nenhum deles cobre o que as telas pedem:
   - `Button` não tem `icon` nem largura total, e o CTA do Stitch exige `shadow-hard-3` com "afundamento" no hover — vira `SubmitButton`. (`Button` só teria `variant="primary"` e uma className enorme; preferiu-se a primitiva dedicada ao invés de forçar props no genérico.)
   - `Card` (`{label, action, children}`) não expressa a linha de protocolo + badge de metadados do terminal — vira `AuthTerminal`.
   - `InfoCallout` (`label` + `Icon` `info` fixo + `TagLabel`) não cobre as duas variantes do aviso de RSO (marca R da Riot / ponto pulsante, sem `TagLabel`) — vira `RiotCallout`.
   
   Cada um é uma primitiva nova que **compõe** as existentes (`Icon`, `StatusDot`, `TagLabel`) em vez de duplicá-las. Se o revisor preferir estender `Button`/`Card`, o custo é baixo mas o ganho é menor.

## Correção ao spec §6 (registrar)

O spec diz que a confirmação de senha é "reusada no cliente e no servidor". **Não é possível:** o endpoint `signUp.email` do Better Auth recebe um único `password`, então não há onde rodar a comparação no servidor. O que permanece compartilhado entre cliente e servidor são os **limites** (`PASSWORD_MIN_LENGTH`/`PASSWORD_MAX_LENGTH`, já ligados em `createAuth`). A confirmação é guarda de UX no cliente. `parsePasswordConfirmation` nasce em `credentials.ts` mesmo assim — é onde um futuro Server Action de troca de senha vai consumi-la.

## Estrutura de arquivos

**Criar**

| Arquivo | Responsabilidade |
|---|---|
| `src/app/(app)/layout.tsx` | `AppShell` + `<Suspense>`/`NavUser` (movidos verbatim do root layout) |
| `src/app/(auth)/layout.tsx` | `AuthHeader` + `<main>` + `AuthFooter` — chrome das telas de auth |
| `src/app/(auth)/login/page.tsx` | Server Component da tela 7 (grid 12 col) |
| `src/app/(auth)/login/login-form.tsx` | Client: email+senha+`rememberMe` |
| `src/app/(auth)/signup/page.tsx` | Server Component da tela 8 (card + sidebar) |
| `src/app/(auth)/signup/signup-form.tsx` | Client: nome+cota+senha+confirmação+termos+Riot ID |
| `src/lib/session-policy.ts` | Fonte única da validade da sessão (30 dias) |
| `src/components/auth/index.ts` | Barrel |
| `src/components/auth/resolve-callback-path.ts` | Puro: sanitiza `?next=` |
| `src/components/auth/telemetry-strip.tsx` | Faixa mono de telemetria (2 variantes) |
| `src/components/auth/auth-tabs.tsx` | Client: switcher Entrar/Criar Conta (`usePathname`) |
| `src/components/auth/auth-header.tsx` | Marca + `SYS_AUTH` + telemetria + tabs + status |
| `src/components/auth/auth-footer.tsx` | Build + copyright + links |
| `src/components/auth/auth-terminal.tsx` | Card com linha de protocolo + badge |
| `src/components/auth/telemetry-panel.tsx` | Eyebrow + badge + título + corpo (+footer) |
| `src/components/auth/stat-strip.tsx` | Linha de métricas mono |
| `src/components/auth/info-row.tsx` | Ícone + título + descrição |
| `src/components/auth/field.tsx` | Label + badge/hint + input com ícone + addon; exporta `FIELD_CONTROL_CLASS` |
| `src/components/auth/password-field.tsx` | Client: `Field` + toggle de visibilidade + medidor |
| `src/components/auth/checkbox-row.tsx` | Checkbox + label + hint mono |
| `src/components/auth/submit-button.tsx` | CTA full-width com `shadow-hard-3` |
| `src/components/auth/auth-divider.tsx` | Régua + label central |
| `src/components/auth/sso-buttons.tsx` | Client: Google + Discord (marcas inline) |
| `src/components/auth/riot-callout.tsx` | Callout Riot (variantes `rso` / `status`) |

**Modificar**

`src/app/layout.tsx` (só html/body/fontes), `src/components/ui/icon/icon.tsx` (+`eye`, `eye-off`), `src/lib/validation/credentials.ts` (+força, +confirmação), `src/lib/auth.ts` (+`session.expiresIn`).

**Mover** — `src/app/{page.tsx,home-landing.tsx,dashboard,console,design-system,matches,players,repro-tmp}` → `src/app/(app)/`; `src/app/{login,signup}` → `src/app/(auth)/`. `src/app/fonts/`, `globals.css`, `error.tsx`, `global-error.tsx`, `api/`, `actions/` ficam na raiz de `src/app/`.

**Deletar** — `src/app/login/email-auth-forms.tsx` e `src/app/login/social-login-buttons.tsx` (substituídos na Task 7).

---

### Task 1: Route group `(app)` — zero mudança visual

Passo isolado, sem tocar em `login`/`signup`: elas só saem do `AppShell` na Task 2. É onde mora o risco do `NavUser` (regrediu 2×).

**Files:**
- Create: `src/app/(app)/layout.tsx`
- Modify: `src/app/layout.tsx`
- Move: `src/app/{page.tsx,home-landing.tsx,dashboard,console,design-system,matches,players,repro-tmp}` → `src/app/(app)/`
- Test: `tests/app/app-group-layout.test.tsx`

**Interfaces:**
- Consumes: `AppShell` de `@/components/layout/app-shell`, `NavUser` de `@/components/layout/nav-user`, `Skeleton` de `@/components/ui/skeleton`.
- Produces: `AppGroupLayout` (default export de `src/app/(app)/layout.tsx`).

- [ ] **Step 1: Mover as rotas com `git mv`**

```bash
cd /home/jeandias/projects/range77
mkdir -p "src/app/(app)"
git mv src/app/page.tsx "src/app/(app)/page.tsx"
git mv src/app/home-landing.tsx "src/app/(app)/home-landing.tsx"
for d in dashboard console design-system matches players repro-tmp; do
  git mv "src/app/$d" "src/app/(app)/$d"
done
git status --short
```

`src/app/fonts/`, `src/app/globals.css`, `src/app/error.tsx`, `src/app/global-error.tsx`, `src/app/api/`, `src/app/actions/`, `src/app/login/`, `src/app/signup/` **não** se movem neste passo.

- [ ] **Step 2: Escrever o teste que falha**

```tsx
// tests/app/app-group-layout.test.tsx
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * SUITE TDD — layout do route group `(app)`. Garante que o shell da app
 * (AppTopNav + <main> + AppFooter) vive no grupo, e NÃO mais no layout raiz:
 * é essa separação que dá chrome próprio às telas de auth.
 */

vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard' }));

import RootLayout from '@/app/layout';
import AppGroupLayout from '@/app/(app)/layout';

describe('AppGroupLayout', () => {
  it('renderiza o shell da app e o filho', () => {
    const html = renderToStaticMarkup(
      <AppGroupLayout>
        <span data-child />
      </AppGroupLayout>,
    );
    expect(html).toContain('data-component="app-shell"');
    expect(html).toContain('data-component="app-footer"');
    expect(html).toContain('data-child');
  });
});

describe('RootLayout', () => {
  it('não renderiza mais o shell da app (só html/body/fontes)', () => {
    const html = renderToStaticMarkup(
      <RootLayout>
        <span data-child />
      </RootLayout>,
    );
    expect(html).toContain('data-child');
    expect(html).not.toContain('data-component="app-shell"');
  });
});
```

- [ ] **Step 3: Rodar o teste e ver falhar**

Run: `npx vitest run tests/app/app-group-layout.test.tsx`
Expected: FAIL — `Failed to resolve import "@/app/(app)/layout"`.

- [ ] **Step 4: Criar `src/app/(app)/layout.tsx`**

Mover o `AppShell` do root layout **verbatim** (nada de reescrever o try/catch do `NavUser` — ele fica intacto em `src/components/layout/nav-user.tsx`):

```tsx
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { NavUser } from '@/components/layout/nav-user';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Layout do route group `(app)` — shell da aplicação (header fixo + footer de
 * telemetria). As telas de auth vivem em `(auth)` e NÃO passam por aqui.
 *
 * `NavUser` (auth/env/DB) é dinâmico: sempre dentro de `<Suspense>` (Cache
 * Components). O try/catch fail-soft dele mora em `nav-user.tsx` — não
 * duplicar aqui.
 */
export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell
      user={
        <Suspense fallback={<Skeleton width={168} height={32} />}>
          <NavUser />
        </Suspense>
      }
    >
      {children}
    </AppShell>
  );
}
```

- [ ] **Step 5: Reduzir `src/app/layout.tsx` a html/body/fontes**

Manter `metadata` e as três chamadas `localFont` **exatamente como estão** (os paths `./fonts/*.woff2` são relativos ao arquivo, que continua em `src/app/`). Só remover o `AppShell`, o `<Suspense>`/`NavUser` e os imports correspondentes:

```tsx
        <body className="font-body">{children}</body>
```

Imports a remover: `AppShell`, `NavUser`, `Skeleton`. `Suspense` sai junto; `localFont`, `Metadata`, `ReactNode` e `./globals.css` ficam.

- [ ] **Step 6: Rodar o teste e ver passar**

Run: `npx vitest run tests/app/app-group-layout.test.tsx`
Expected: PASS (2 testes).

- [ ] **Step 7: Suíte completa + typecheck + build**

```bash
npx vitest run --reporter=dot 2>&1 | tail -6
npm run typecheck
npm run build
```

Expected: 908+2 testes passando, `tsc --noEmit` limpo, build sem erro. Se a suíte quebrar, é import relativo (`./` ou `../`) apontando para fora do grupo — todos os `@/` são imunes.

- [ ] **Step 8: Smoke de runtime (não detectável pelo build)**

```bash
npm run dev
```
Conferir no navegador: `/` mostra o header + footer; `/dashboard` idem; `/login` **ainda** mostra o `AppShell` (login/signup só migram na Task 2). Zero erro de overlay do Next. Encerrar o dev.
Pendência conhecida: em dev, uma exceção não capturada no `<Suspense>` do layout raiz dispara `window.location.reload()` em loop (`hot-reloader-app.js`). Um loop de `GET /` aqui significa `NavUser` quebrado — reverter e investigar antes de seguir.

- [ ] **Step 9: Commit (isolado, exigido pelo spec §8)**

```bash
git add -A
git commit -m "refactor(app): route group (app) para dar chrome próprio às telas de auth

Sem mudança visual: o AppShell sai do layout raiz para src/app/(app)/layout.tsx
e o root layout passa a conter só html/body/fontes. login/signup ainda vivem no
shell — migram para (auth) no commit seguinte."
```

---

### Task 2: Route group `(auth)` + chrome de autenticação

**Files:**
- Create: `src/app/(auth)/layout.tsx`
- Create: `src/components/auth/{telemetry-strip,auth-header,auth-tabs,auth-footer,resolve-callback-path}.tsx` e `src/components/auth/index.ts`
- Modify: `src/components/ui/icon/icon.tsx` (adicionar `eye`, `eye-off`)
- Move: `src/app/login` → `src/app/(auth)/login`, `src/app/signup` → `src/app/(auth)/signup`
- Test: `tests/components/auth/{telemetry-strip,auth-header,auth-tabs,auth-footer,resolve-callback-path}.test.tsx`, `tests/components/auth/auth-group-layout.test.tsx`, `tests/components/ui/eye-icons.test.tsx`

**Interfaces:**
- Consumes: `Icon`/`StatusDot` de `@/components/ui`, `cx` de `@/lib/cx`.
- Produces:
  - `AuthTabs(): JSX.Element` (Client) — `data-auth-tabs`, `aria-current="page"` na aba ativa.
  - `AuthHeader(): JSX.Element` — `data-auth-header`.
  - `AuthFooter({ buildLabel?: string, className?: string }): JSX.Element` — `data-auth-footer`.
  - `TelemetryStrip({ items, variant?: 'banner' | 'bar', trailing?, className? }): JSX.Element` — `data-telemetry-strip`.
  - `resolveCallbackPath(next: string | string[] | undefined): string`.
  - `IconName` ganha `'eye' | 'eye-off'`.

- [ ] **Step 1: Teste que falha — `resolveCallbackPath`**

```ts
// tests/components/auth/resolve-callback-path.test.ts
import { describe, expect, it } from 'vitest';
import { resolveCallbackPath } from '@/components/auth/resolve-callback-path';

describe('resolveCallbackPath', () => {
  it('preserva caminhos internos', () => {
    expect(resolveCallbackPath('/players/br/tenz/0001')).toBe('/players/br/tenz/0001');
  });

  it('cai no dashboard sem valor, com array ou com destino externo', () => {
    expect(resolveCallbackPath(undefined)).toBe('/dashboard');
    expect(resolveCallbackPath(['/dashboard', '/admin'])).toBe('/dashboard');
    expect(resolveCallbackPath('https://evil.example')).toBe('/dashboard');
    expect(resolveCallbackPath('//evil.example')).toBe('/dashboard');
  });

  it('não vaza barra invertida como prefixo de URL', () => {
    expect(resolveCallbackPath('/\\evil.example')).toBe('/dashboard');
  });
});
```

- [ ] **Step 2: Ver falhar**

Run: `npx vitest run tests/components/auth/resolve-callback-path.test.ts`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementar `src/components/auth/resolve-callback-path.ts`**

O helper está duplicado verbatim em `login/page.tsx` e `signup/page.tsx`; além do `startsWith('/')`, rejeita `//` e `/\` (que o navegador trata como protocol-relative → open redirect).

```ts
/**
 * Sanitiza o `?next=` que o proxy (Next 16) injeta ao redirecionar rotas
 * protegidas para `/login`. Só aceita caminho interno absoluto: `//host` e
 * `/\host` são tratados como protocol-relative pelo navegador (open redirect).
 */
export function resolveCallbackPath(next: string | string[] | undefined): string {
  if (typeof next !== 'string') {
    return '/dashboard';
  }
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
    return '/dashboard';
  }
  return next;
}
```

- [ ] **Step 4: Testes que falham — chrome**

```tsx
// tests/components/auth/auth-header.test.tsx
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/navigation', () => ({ usePathname: () => '/login' }));

import { AuthHeader } from '@/components/auth/auth-header';

describe('AuthHeader', () => {
  it('mostra marca, badge SYS_AUTH, telemetria, tabs e ponte para a home', () => {
    const html = renderToStaticMarkup(<AuthHeader />);
    expect(html).toContain('data-auth-header');
    expect(html).toContain('VALORANT');
    expect(html).toContain('.COACH');
    expect(html).toContain('SYS_AUTH');
    expect(html).toContain('RIOT API // SECURE V4');
    expect(html).toContain('SSL 256-BIT ENCRYPTION');
    expect(html).toContain('RTT &lt;15MS');
    expect(html).toContain('STATUS: READY');
    expect(html).toContain('href="/"');
  });
});
```

```tsx
// tests/components/auth/auth-tabs.test.tsx
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const pathname = vi.hoisted(() => ({ value: '/login' }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname.value }));

import { AuthTabs } from '@/components/auth/auth-tabs';

afterEach(cleanup);

describe('AuthTabs', () => {
  it('marca a aba ativa conforme o pathname', () => {
    pathname.value = '/login';
    render(<AuthTabs />);
    expect(screen.getByRole('link', { name: 'Entrar' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Criar Conta' }).getAttribute('aria-current')).toBeNull();
  });

  it('troca a aba ativa no cadastro', () => {
    pathname.value = '/signup';
    render(<AuthTabs />);
    expect(screen.getByRole('link', { name: 'Criar Conta' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Entrar' }).getAttribute('aria-current')).toBeNull();
  });

  it('aponta para as rotas reais', () => {
    pathname.value = '/login';
    render(<AuthTabs />);
    expect(screen.getByRole('link', { name: 'Entrar' }).getAttribute('href')).toBe('/login');
    expect(screen.getByRole('link', { name: 'Criar Conta' }).getAttribute('href')).toBe('/signup');
  });
});
```

```tsx
// tests/components/auth/auth-footer.test.tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AuthFooter } from '@/components/auth/auth-footer';

describe('AuthFooter', () => {
  it('traz build, copyright de não-afiliação e os três links do Stitch', () => {
    const html = renderToStaticMarkup(<AuthFooter buildLabel="CONSOLE_BUILD: 2024.11.08-PROD" />);
    expect(html).toContain('data-auth-footer');
    expect(html).toContain('CONSOLE_BUILD: 2024.11.08-PROD');
    expect(html).toContain('Não afiliado à Riot Games');
    expect(html).toContain('Termos de Serviço');
    expect(html).toContain('Privacidade &amp; Telemetria');
    expect(html).toContain('Status do Sistema');
  });
});
```

```tsx
// tests/components/auth/telemetry-strip.test.tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TelemetryStrip } from '@/components/auth/telemetry-strip';

describe('TelemetryStrip', () => {
  it('separa os itens com um pipe decorativo', () => {
    const html = renderToStaticMarkup(
      <TelemetryStrip items={['NODE: SA-BR-01', 'RIOT API RATELIMIT: 99.8% HEALTHY']} />,
    );
    expect(html).toContain('data-telemetry-strip="banner"');
    expect(html).toContain('NODE: SA-BR-01');
    expect(html).toContain('RIOT API RATELIMIT: 99.8% HEALTHY');
    expect(html).toContain('aria-hidden="true">|</span>');
  });

  it('a variante bar aceita um trailing à direita', () => {
    const html = renderToStaticMarkup(
      <TelemetryStrip variant="bar" items={['LATENCY: 12ms (SA-EAST)']} trailing={<em>SYS_ENV</em>} />,
    );
    expect(html).toContain('data-telemetry-strip="bar"');
    expect(html).toContain('<em>SYS_ENV</em>');
  });
});
```

```tsx
// tests/components/auth/auth-group-layout.test.tsx
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/navigation', () => ({ usePathname: () => '/login' }));

import AuthLayout from '@/app/(auth)/layout';

describe('AuthLayout', () => {
  it('envolve o filho com header e footer de auth, e um main próprio', () => {
    const html = renderToStaticMarkup(
      <AuthLayout>
        <span data-child />
      </AuthLayout>,
    );
    expect(html).toContain('data-auth-header');
    expect(html).toContain('data-auth-footer');
    expect(html).toContain('<main');
    expect(html).toContain('data-child');
    expect(html).not.toContain('data-component="app-shell"');
  });
});
```

```tsx
// tests/components/ui/eye-icons.test.tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Icon } from '@/components/ui/icon';

describe('ícones de visibilidade', () => {
  it('renderiza eye e eye-off com data-icon próprio', () => {
    expect(renderToStaticMarkup(<Icon name="eye" />)).toContain('data-icon="eye"');
    expect(renderToStaticMarkup(<Icon name="eye-off" />)).toContain('data-icon="eye-off"');
  });
});
```

- [ ] **Step 5: Ver falhar**

Run: `npx vitest run tests/components/auth tests/components/ui/eye-icons.test.tsx`
Expected: FAIL — módulos inexistentes.

- [ ] **Step 6: Adicionar `eye` e `eye-off` ao `IconName`**

Em `src/components/ui/icon/icon.tsx`, acrescentar ao union `IconName` e ao `PATHS` (o Stitch usa Material Symbols `visibility`/`visibility_off`; `next/font/google` está proibido, então as duas formas viram paths locais em viewBox 16×16):

```ts
    | 'eye'
    | 'eye-off'
```

```tsx
    eye: (
      <>
        <path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8Z" />
        <circle cx={8} cy={8} r={2} />
      </>
    ),
    'eye-off': (
      <>
        <path d="M6.2 3.8A6.6 6.6 0 0 1 8 3.5C12 3.5 14.5 8 14.5 8a12 12 0 0 1-1.9 2.4M4 5.2A12.5 12.5 0 0 0 1.5 8S4 12.5 8 12.5c.7 0 1.3-.1 1.9-.3" />
        <path d="M2.5 2.5l11 11" />
      </>
    ),
```

- [ ] **Step 7: Implementar `telemetry-strip.tsx`**

```tsx
import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

/**
 * TelemetryStrip — faixa de telemetria mono do chrome de auth.
 * `banner`: marquee da tela 7 (hairline + `shadow-hard-2`).
 * `bar`: barra superior da tela 8 (mesma linguagem, sem sombra).
 */
export interface TelemetryStripProps {
  readonly items: readonly string[];
  readonly variant?: 'banner' | 'bar';
  readonly trailing?: ReactNode;
  readonly className?: string;
}

const VARIANT_CLASSES: Record<'banner' | 'bar', string> = {
  banner: 'border border-line bg-surface-raised px-2 py-1 shadow-hard-2',
  bar: 'border border-line bg-surface px-2 py-1',
};

export function TelemetryStrip({
  items,
  variant = 'banner',
  trailing,
  className,
}: TelemetryStripProps) {
  return (
    <div
      data-telemetry-strip={variant}
      className={cx(
        'flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-hud text-label-xs uppercase text-text-secondary',
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {items.map((item, index) => (
        <span key={item} className="flex items-center gap-1.5">
          {index > 0 ? <span aria-hidden="true">|</span> : null}
          <span>{item}</span>
        </span>
      ))}
      {trailing !== undefined ? <span className="ml-auto">{trailing}</span> : null}
    </div>
  );
}
```

- [ ] **Step 8: Implementar `auth-tabs.tsx` (Client)**

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cx } from '@/lib/cx';

/**
 * AuthTabs — switcher Entrar/Criar Conta. Client Component: layouts não
 * re-renderizam na navegação e não enxergam o pathname (doc do `layout.js`).
 * O Stitch desenha este switcher duas vezes na tela 7 (header e dentro do
 * card) — ambas as instâncias usam este componente.
 */
const TABS = [
  { href: '/login', label: 'Entrar' },
  { href: '/signup', label: 'Criar Conta' },
] as const;

export function AuthTabs({ className }: { readonly className?: string }) {
  const pathname = usePathname();

  return (
    <nav
      data-auth-tabs
      aria-label="Alternar entre entrar e criar conta"
      className={cx('flex items-center gap-0.5 border border-line bg-surface-raised p-0.5', className)}
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={cx(
              'px-2.5 py-1 font-hud text-label-sm uppercase transition-colors duration-[var(--duration-fast)]',
              active
                ? 'bg-accent font-semibold text-on-accent'
                : 'text-text-secondary hover:text-text-primary',
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 9: Implementar `auth-header.tsx`**

```tsx
import Link from 'next/link';
import { AuthTabs } from './auth-tabs';
import { Icon } from '@/components/ui/icon';
import { StatusDot } from '@/components/ui/status-dot';

/**
 * AuthHeader — chrome fixo das telas de auth (Stitch 7/8, byte-idêntico nos
 * dois arquivos exceto a aba ativa). Server Component; a única ilha client é
 * `AuthTabs`.
 */
export function AuthHeader() {
  return (
    <header
      data-auth-header
      className="fixed left-0 top-0 z-50 w-full border-b border-line bg-surface"
    >
      <div className="flex h-14 w-full items-center justify-between gap-2 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="flex size-3 items-center justify-center border border-line bg-accent"
          >
            <span className="size-1.5 bg-text-primary" />
          </span>
          <span className="font-display text-headline-md uppercase tracking-tighter text-text-primary">
            VALORANT<span className="text-text-secondary">.COACH</span>
          </span>
          <span className="border border-line bg-surface-pressed px-1 py-0.5 font-hud text-label-xs uppercase text-text-secondary">
            SYS_AUTH
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-3 border-l border-line pl-3 lg:flex">
            <span className="flex items-center gap-1.5 font-hud text-label-sm uppercase text-text-secondary">
              <StatusDot variant="live" className="border border-line" />
              RIOT API // SECURE V4
            </span>
            <span aria-hidden="true" className="font-hud text-label-sm text-text-secondary">
              |
            </span>
            <span className="font-hud text-label-sm uppercase text-text-secondary">
              SSL 256-BIT ENCRYPTION
            </span>
            <span
              aria-hidden="true"
              className="font-hud text-label-sm text-text-secondary"
            >
              |
            </span>
            <span className="flex items-center gap-1 border border-line bg-surface-raised px-1.5 py-0.5 font-hud text-label-xs uppercase text-text-secondary">
              <Icon name="target" size="xs" />
              RTT &lt;15MS
            </span>
          </div>

          <AuthTabs />

          <div className="hidden flex-col text-right font-hud text-label-xs uppercase leading-tight sm:flex">
            <span className="text-text-primary">STATUS: READY</span>
            <span className="text-text-secondary">TELEMETRY ACTIVE</span>
          </div>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 10: Implementar `auth-footer.tsx`**

```tsx
import Link from 'next/link';
import { cx } from '@/lib/cx';

/**
 * AuthFooter — rodapé das telas de auth. Estrutura do Stitch (build +
 * copyright + 3 links), com a redação de NÃO-afiliação que o app já publica
 * em `app-footer.tsx` — o literal do Stitch ("RIOT GAMES AFFILIATE PROTOCOL")
 * afirmaria uma afiliação inexistente.
 *
 * TODO(rotas-publicas): Termos de Serviço, Privacidade & Telemetria e Status
 * do Sistema não existem como rotas (spec §10). `#` até existirem.
 */
const FOOTER_LINKS = [
  { href: '#', label: 'Termos de Serviço' },
  { href: '#', label: 'Privacidade & Telemetria' },
  { href: '#', label: 'Status do Sistema' },
] as const;

export interface AuthFooterProps {
  readonly buildLabel?: string;
  readonly className?: string;
}

const LINK_CLASS =
  'transition-colors duration-[var(--duration-fast)] ease-out-expo hover:text-text-primary';

export function AuthFooter({
  buildLabel = 'CONSOLE_BUILD: 2024.11.08-PROD',
  className,
}: AuthFooterProps) {
  return (
    <footer
      data-auth-footer
      className={cx('w-full border-t border-line bg-surface py-2.5', className)}
    >
      <div className="flex w-full flex-col items-center justify-between gap-1.5 px-4 font-hud text-label-xs uppercase text-text-secondary md:flex-row">
        <span className="flex items-center gap-2">
          <span>{buildLabel}</span>
          <span aria-hidden="true">//</span>
          <span>© 2024 VALCOACH TELEMETRY SYSTEMS.</span>
          <span>Não afiliado à Riot Games.</span>
        </span>
        <span className="flex flex-wrap items-center gap-4">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.label} href={link.href} className={LINK_CLASS}>
              {link.label}
            </Link>
          ))}
        </span>
      </div>
    </footer>
  );
}
```

> `//` e `©` como texto React: em JSX, `//` dentro de `<span aria-hidden="true">//</span>` é texto válido (não comentário). Não usar `{'//'}`.

- [ ] **Step 11: Criar o barrel `src/components/auth/index.ts`**

> **O barrel cresce em duas etapas** — exportar um módulo que ainda não existe quebra o `typecheck`. Nesta task, só o que já existe (a Task 5, Step 9 completa o resto):

```ts
export { AuthFooter, type AuthFooterProps } from './auth-footer';
export { AuthHeader } from './auth-header';
export { AuthTabs } from './auth-tabs';
export { resolveCallbackPath } from './resolve-callback-path';
export { TelemetryStrip, type TelemetryStripProps } from './telemetry-strip';
```

As demais entradas entram na Task 5, Step 9.

- [ ] **Step 12: Rodar os testes novos e ver passar**

Run: `npx vitest run tests/components/auth tests/components/ui/eye-icons.test.tsx`
Expected: PASS. `auth-group-layout.test.tsx` ainda FALHA — o layout não existe.

- [ ] **Step 13: Criar `src/app/(auth)/layout.tsx`**

```tsx
import type { ReactNode } from 'react';
import { AuthFooter } from '@/components/auth/auth-footer';
import { AuthHeader } from '@/components/auth/auth-header';

/**
 * Layout do route group `(auth)` — chrome próprio do terminal de autenticação
 * (Stitch 7/8). Não usa AppShell: o `NavUser` mostraria "Conta indisponível"
 * para quem ainda não entrou.
 *
 * Sem acesso a request (auth/env/DB) aqui: nenhum `<Suspense>` é necessário.
 * Route group não compõe a URL — `/login` e `/signup` seguem iguais.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <AuthHeader />
      {/* `flex-col` + `pt-14` (altura do header fixo) para o filho poder
          centralizar verticalmente com `justify-center`. */}
      <main className="flex flex-1 flex-col pt-14">{children}</main>
      <AuthFooter />
    </div>
  );
}
```

- [ ] **Step 14: Mover `login` e `signup` para o grupo**

```bash
git mv src/app/login "src/app/(auth)/login"
git mv src/app/signup "src/app/(auth)/signup"
```

Ajustar em `src/app/(auth)/login/page.tsx`: a importação `./email-auth-forms` e `./social-login-buttons` continuam válidas (os arquivos vieram junto). Nesta task **nada mais muda** — as telas seguem o layout antigo de `max-w-md`. Só o `AppShell` sai e o chrome de auth entra.

- [ ] **Step 15: Rodar a suíte inteira**

```bash
npx vitest run --reporter=dot 2>&1 | tail -6
```

Expected: tudo verde, incluindo `tests/app/login/**` e `tests/app/signup/**` (que importam `@/app/login/page` e `@/app/signup/page` — **ajustar esses imports** para `@/app/(auth)/login/page` e `@/app/(auth)/signup/page`). Ajustar também os três arquivos de teste:

- `tests/app/login/login-page.test.tsx`: `import LoginPage from '@/app/(auth)/login/page';`
- `tests/app/signup/signup-page.test.tsx`: `import SignupPage from '@/app/(auth)/signup/page';`
- `tests/app/login/email-auth-forms.test.tsx`: `import { EmailLoginForm, SignupForm } from '@/app/(auth)/login/email-auth-forms';`

Os testes de página não precisam mockar `usePathname`: eles chamam o Server Component da página diretamente, sem passar pelo layout, então o `AuthTabs` (client island do layout) nunca é renderizado. O mock de `next/navigation` nesses testes é só por segurança, para o caso de o layout entrar na árvore.

`resolveCallbackPath` sai de cada `page.tsx` (Task 2, Step 3) — trocar a função local duplicada pela importada nos dois arquivos.

- [ ] **Step 16: Commit**

```bash
git add -A
git commit -m "feat(auth): route group (auth) com chrome próprio (header, tabs, footer)"
```

---

### Task 3: Política de sessão (30 dias) e validação de senha

**Files:**
- Create: `src/lib/session-policy.ts`
- Modify: `src/lib/auth.ts` (bloco `session`), `src/lib/validation/credentials.ts`
- Test: `tests/lib/session-policy.test.ts`, `tests/lib/validation/credentials.test.ts` (estender), `tests/lib/auth.test.ts` (estender)

**Interfaces:**
- Produces:
  - `SESSION_TTL_DAYS = 30`, `SESSION_TTL_SECONDS = 2_592_000`.
  - `PASSWORD_STRENGTH_CHECKS: readonly { id, label }[]` (3 itens, nesta ordem: `length`, `alphanumeric`, `entropy`).
  - `passwordStrength(raw: string): { score: 0|1|2|3; met: Record<PasswordStrengthCheckId, boolean> }`.
  - `parsePasswordConfirmation(password: string, confirmation: string): { ok: true, value: string } | { ok: false, message: string }`.
- `createAuth` passa a incluir `session: { expiresIn: SESSION_TTL_SECONDS }` (Better Auth default: 7 dias).

- [ ] **Step 1: Teste que falha — política de sessão**

```ts
// tests/lib/session-policy.test.ts
import { describe, expect, it } from 'vitest';
import { SESSION_TTL_DAYS, SESSION_TTL_SECONDS } from '@/lib/session-policy';

/**
 * A copy do login promete "30 dias" ao usuário. Constante e rótulo saem da
 * mesma fonte para a promessa não divergir da configuração do Better Auth.
 */
describe('política de sessão', () => {
  it('vale 30 dias', () => {
    expect(SESSION_TTL_DAYS).toBe(30);
    expect(SESSION_TTL_SECONDS).toBe(2_592_000);
  });

  it('deriva segundos de dias sem arredondar', () => {
    expect(SESSION_TTL_SECONDS).toBe(SESSION_TTL_DAYS * 24 * 60 * 60);
    expect(SESSION_TTL_SECONDS % 86_400).toBe(0);
  });
});
```

- [ ] **Step 2: Ver falhar**

Run: `npx vitest run tests/lib/session-policy.test.ts`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Criar `src/lib/session-policy.ts`**

```ts
/**
 * Política de sessão — fonte única da promessa "manter sessão por 30 dias"
 * (checkbox do login, Stitch tela 7). Consumida pelo `createAuth` (servidor) e
 * pela copy do formulário (cliente), para que a promessa exibida nunca
 * divirja da validade real do cookie.
 *
 * Better Auth: `session.expiresIn` em SEGUNDOS; default 7 dias.
 */

/** Dias de validade da sessão persistente. */
export const SESSION_TTL_DAYS = 30;

/** Mesma validade em segundos — o que o Better Auth consome. */
export const SESSION_TTL_SECONDS = SESSION_TTL_DAYS * 24 * 60 * 60;
```

- [ ] **Step 4: Teste que falha — força de senha**

Acrescentar ao fim de `tests/lib/validation/credentials.test.ts`:

```ts
import {
  PASSWORD_STRENGTH_CHECKS,
  parsePasswordConfirmation,
  passwordStrength,
} from '@/lib/validation/credentials';

describe('passwordStrength', () => {
  it('exibe os três critérios do Stitch, nesta ordem', () => {
    expect(PASSWORD_STRENGTH_CHECKS.map((check) => check.id)).toEqual([
      'length',
      'alphanumeric',
      'entropy',
    ]);
    expect(PASSWORD_STRENGTH_CHECKS.map((check) => check.label)).toEqual([
      '8+ CARACTERES',
      'ALFANUMÉRICO',
      'ENTROPIA ELEVADA',
    ]);
  });

  it('senha vazia não cumpre nada', () => {
    const result = passwordStrength('');
    expect(result.score).toBe(0);
    expect(result.met).toEqual({ length: false, alphanumeric: false, entropy: false });
  });

  it('conta os critérios cumpridos cumulativamente', () => {
    expect(passwordStrength('abcdefgh').met).toEqual({
      length: true,
      alphanumeric: false,
      entropy: false,
    });
    expect(passwordStrength('abcdefg1').met).toEqual({
      length: true,
      alphanumeric: true,
      entropy: false,
    });
  });

  it('aceita símbolo ou 12+ caracteres como entropia elevada', () => {
    expect(passwordStrength('abcdefg1!').met.entropy).toBe(true);
    expect(passwordStrength('abcdefghijkl').met.entropy).toBe(true);
    expect(passwordStrength('segred0!valcoach').score).toBe(3);
  });

  it('acima do teto do servidor a senha deixa de cumprir o critério de comprimento', () => {
    expect(passwordStrength('a'.repeat(PASSWORD_MAX_LENGTH + 1)).met.length).toBe(false);
  });

  it('score nunca passa de 3', () => {
    expect(passwordStrength('ValkyriePrecision2024!').score).toBe(3);
  });
});

describe('parsePasswordConfirmation', () => {
  it('aceita quando as senhas coincidem', () => {
    expect(parsePasswordConfirmation('segred0!valcoach', 'segred0!valcoach')).toEqual({
      ok: true,
      value: 'segred0!valcoach',
    });
  });

  it('recusa quando divergem', () => {
    const result = parsePasswordConfirmation('segred0!valcoach', 'segred0!valcoacH');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe('As senhas não coincidem.');
    }
  });

  it('recusa confirmação vazia', () => {
    expect(parsePasswordConfirmation('segred0!valcoach', '').ok).toBe(false);
  });
});
```

- [ ] **Step 5: Ver falhar**

Run: `npx vitest run tests/lib/validation/credentials.test.ts`
Expected: FAIL — `PASSWORD_STRENGTH_CHECKS` não exportado.

- [ ] **Step 6: Implementar em `src/lib/validation/credentials.ts`**

Acrescentar ao fim do módulo:

```ts
/**
 * Força de senha — APRESENTAÇÃO apenas (medidor do Stitch, 3 barras).
 * Derivada dos limites deste módulo; NUNCA substitui a validação do servidor,
 * que continua sendo `PASSWORD_MIN_LENGTH`/`PASSWORD_MAX_LENGTH` no
 * `createAuth`.
 */

/** Comprimento a partir do qual a senha conta como "entropia elevada". */
export const PASSWORD_ENTROPY_LENGTH = 12;

export const PASSWORD_STRENGTH_CHECKS = [
  { id: 'length', label: '8+ CARACTERES' },
  { id: 'alphanumeric', label: 'ALFANUMÉRICO' },
  { id: 'entropy', label: 'ENTROPIA ELEVADA' },
] as const;

export type PasswordStrengthCheckId = (typeof PASSWORD_STRENGTH_CHECKS)[number]['id'];

export interface PasswordStrength {
  /** Quantos critérios foram cumpridos (0–3) — o número de barras acesas. */
  readonly score: 0 | 1 | 2 | 3;
  readonly met: Readonly<Record<PasswordStrengthCheckId, boolean>>;
}

const HAS_LETTER = /[A-Za-z]/;
const HAS_DIGIT = /[0-9]/;
const HAS_SYMBOL = /[^A-Za-z0-9]/;

export function passwordStrength(raw: string): PasswordStrength {
  const met = {
    length: raw.length >= PASSWORD_MIN_LENGTH && raw.length <= PASSWORD_MAX_LENGTH,
    alphanumeric: HAS_LETTER.test(raw) && HAS_DIGIT.test(raw),
    entropy: HAS_SYMBOL.test(raw) || raw.length >= PASSWORD_ENTROPY_LENGTH,
  } satisfies Record<PasswordStrengthCheckId, boolean>;

  const score = (Object.values(met).filter(Boolean).length as 0 | 1 | 2 | 3);
  return { score, met };
}

/**
 * Confirmação de senha do cadastro. Guarda de UX: o endpoint `signUp.email` do
 * Better Auth recebe um único `password`, então a comparação não tem onde
 * rodar no servidor. Vive aqui para um futuro Server Action de troca de senha
 * reusá-la.
 */
export type ParsePasswordConfirmationResult =
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly message: string };

export function parsePasswordConfirmation(
  password: string,
  confirmation: string,
): ParsePasswordConfirmationResult {
  if (confirmation !== password) {
    return { ok: false, message: 'As senhas não coincidem.' };
  }
  return { ok: true, value: confirmation };
}
```

- [ ] **Step 7: Teste que falha — `createAuth` com 30 dias**

Estender `tests/lib/auth.test.ts` (o arquivo já monta fakes de DB/env; reusar os helpers existentes):

```ts
import { SESSION_TTL_SECONDS } from '@/lib/session-policy';

it('configura a sessão persistente em 30 dias', () => {
  const auth = createAuth(fakeDb, fakeEnv);
  expect(auth.options.session?.expiresIn).toBe(SESSION_TTL_SECONDS);
});
```

Se `createAuth` devolver um objeto sem `.options`, usar a asserção que o arquivo já emprega para inspecionar a config (seguir o padrão das asserções existentes de `emailAndPassword`).

- [ ] **Step 8: Ver falhar**

Run: `npx vitest run tests/lib/auth.test.ts`
Expected: FAIL — `expiresIn` é `undefined` (default de 7 dias não é materializado na config).

- [ ] **Step 9: Ligar em `src/lib/auth.ts`**

Acrescentar o import e o bloco `session` em `createAuth`:

```ts
import { SESSION_TTL_SECONDS } from '@/lib/session-policy';
```

```ts
    emailAndPassword: {
      enabled: true,
      minPasswordLength: PASSWORD_MIN_LENGTH,
      maxPasswordLength: PASSWORD_MAX_LENGTH,
      requireNameAndEmail: true,
    },
    // 30 dias é a promessa do checkbox "manter sessão" (Stitch tela 7).
    // Better Auth aceita SEGUNDOS; default da lib: 7 dias.
    session: { expiresIn: SESSION_TTL_SECONDS },
    plugins: [nextCookies()],
```

- [ ] **Step 10: Rodar e ver passar**

Run: `npx vitest run tests/lib/session-policy.test.ts tests/lib/validation/credentials.test.ts tests/lib/auth.test.ts`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add src/lib/session-policy.ts src/lib/auth.ts src/lib/validation/credentials.ts tests/lib
git commit -m "feat(auth): sessão de 30 dias, medidor de força e confirmação de senha"
```

---

### Task 4: Kit de formulário

**Files:**
- Create: `src/components/auth/{field,password-field,checkbox-row,submit-button,auth-divider}.tsx`
- Test: `tests/components/auth/{field,password-field,checkbox-row,submit-button,auth-divider}.test.tsx`

**Interfaces:**
- Consumes: `Icon`, `IconName`, `TagLabel`, `cx`, `passwordStrength`/`PASSWORD_STRENGTH_CHECKS` (Task 3).
- Produces:
  - `FIELD_CONTROL_CLASS: string` — classes do controle (input/select) na variante hairline do Stitch.
  - `Field({ id, label, hint?, badge?, icon?, addon?, ...inputProps })` — `data-field={id}`, `<label htmlFor>` ligado.
  - `PasswordField({ id, label, hint?, badge?, showStrength?, ...inputProps })` (Client) — `data-password-field={id}`; botão `aria-label="Alternar visibilidade de senha"`; `data-password-strength` com `data-score`.
  - `CheckboxRow({ id, label, hint?, ...inputProps })` — `data-checkbox-row={id}`.
  - `SubmitButton({ loading?, children, ...buttonProps })` — `type="submit"`, `data-submit-button`.
  - `AuthDivider({ label })` — `data-auth-divider`.

- [ ] **Step 1: Testes que falham**

```tsx
// tests/components/auth/field.test.tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Field } from '@/components/auth/field';

describe('Field', () => {
  it('liga label e input pelo id, com hint mono', () => {
    const html = renderToStaticMarkup(
      <Field id="identifier" label="E-mail" hint="RFC 822" placeholder="agente@valorant.coach" />,
    );
    expect(html).toContain('data-field="identifier"');
    expect(html).toContain('for="identifier"');
    expect(html).toContain('id="identifier"');
    expect(html).toContain('agente@valorant.coach');
    expect(html).toContain('RFC 822');
  });

  it('renderiza ícone e addon, reservando padding para ambos', () => {
    const html = renderToStaticMarkup(
      <Field id="pwd" label="Senha" icon="eye" addon={<span data-addon />} />,
    );
    expect(html).toContain('data-icon="eye"');
    expect(html).toContain('data-addon');
    expect(html).toContain('pl-8');
    expect(html).toContain('pr-10');
  });

  it('repassa aria-invalid e aria-describedby do formulário', () => {
    const html = renderToStaticMarkup(
      <Field id="e" label="E-mail" aria-invalid aria-describedby="err" />,
    );
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="err"');
  });
});
```

```tsx
// tests/components/auth/password-field.test.tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PasswordField } from '@/components/auth/password-field';

afterEach(cleanup);

describe('PasswordField', () => {
  it('começa oculto e alterna a visibilidade', () => {
    render(<PasswordField id="pwd" label="Senha de Acesso" />);
    const toggle = screen.getByRole('button', { name: 'Alternar visibilidade de senha' });
    expect(screen.getByLabelText('Senha de Acesso').getAttribute('type')).toBe('password');
    fireEvent.click(toggle);
    expect(screen.getByLabelText('Senha de Acesso').getAttribute('type')).toBe('text');
    fireEvent.click(toggle);
    expect(screen.getByLabelText('Senha de Acesso').getAttribute('type')).toBe('password');
  });

  it('sem medidor não renderiza barras', () => {
    const { container } = render(<PasswordField id="pwd" label="Senha" />);
    expect(container.querySelector('[data-password-strength]')).toBeNull();
  });

  it('com medidor, o score segue os critérios cumpridos', () => {
    const { container } = render(
      <PasswordField id="pwd" label="Senha" showStrength defaultValue="segred0!valcoach" />,
    );
    expect(container.querySelector('[data-password-strength]')?.getAttribute('data-score')).toBe('3');
    const bars = container.querySelectorAll('[data-strength-bar]');
    expect(bars.length).toBe(3);
    expect(container.querySelectorAll('[data-strength-bar][data-met]').length).toBe(3);
  });

  it('atualiza o medidor ao digitar', () => {
    const { container } = render(<PasswordField id="pwd" label="Senha" showStrength />);
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'abcdefgh' } });
    expect(container.querySelector('[data-password-strength]')?.getAttribute('data-score')).toBe('1');
    expect(container.querySelectorAll('[data-strength-bar][data-met]').length).toBe(1);
  });
});
```

```tsx
// tests/components/auth/checkbox-row.test.tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CheckboxRow } from '@/components/auth/checkbox-row';

describe('CheckboxRow', () => {
  it('liga label e input, com hint mono opcional', () => {
    const html = renderToStaticMarkup(
      <CheckboxRow
        id="remember"
        label="Manter sessão segura neste terminal (30 dias)"
        hint="PERSISTENT_AUTH"
        defaultChecked
      />,
    );
    expect(html).toContain('data-checkbox-row="remember"');
    expect(html).toContain('for="remember"');
    expect(html).toContain('PERSISTENT_AUTH');
    expect(html).toContain('checked');
    expect(html).toContain('peer'); // o check visual depende de peer-checked
  });
});
```

```tsx
// tests/components/auth/submit-button.test.tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SubmitButton } from '@/components/auth/submit-button';

describe('SubmitButton', () => {
  it('é type=submit e full-width com sombra dura', () => {
    const html = renderToStaticMarkup(<SubmitButton>ENTRAR</SubmitButton>);
    expect(html).toContain('data-submit-button');
    expect(html).toContain('type="submit"');
    expect(html).toContain('w-full');
    expect(html).toContain('shadow-hard-3');
    expect(html).toContain('ENTRAR');
  });

  it('desabilita e marca aria-busy ao carregar', () => {
    const html = renderToStaticMarkup(<SubmitButton loading>ENTRAR</SubmitButton>);
    expect(html).toContain('disabled');
    expect(html).toContain('aria-busy="true"');
  });
});
```

```tsx
// tests/components/auth/auth-divider.test.tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AuthDivider } from '@/components/auth/auth-divider';

describe('AuthDivider', () => {
  it('centraliza o rótulo entre duas réguas decorativas', () => {
    const html = renderToStaticMarkup(<AuthDivider label="OU ACESSE COM E-MAIL E SENHA" />);
    expect(html).toContain('data-auth-divider');
    expect(html).toContain('OU ACESSE COM E-MAIL E SENHA');
    expect(html.match(/aria-hidden="true"/g)?.length).toBe(2);
  });
});
```

- [ ] **Step 2: Ver falhar**

Run: `npx vitest run tests/components/auth`
Expected: FAIL — módulos não encontrados.

- [ ] **Step 3: Implementar `src/components/auth/field.tsx`**

```tsx
import type { InputHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/icon';
import { cx } from '@/lib/cx';

/**
 * Field — campo de formulário do Stitch (label mono + badge/hint à direita +
 * controle com hairline + ícone à esquerda + addon à direita).
 *
 * Exporta `FIELD_CONTROL_CLASS` para controles irmãos (`<select>` de região)
 * usarem exatamente o mesmo tratamento — hoje a classe estava duplicada inline
 * em `email-auth-forms.tsx`.
 */

export const FIELD_CONTROL_CLASS = cx(
  'w-full rounded-xs border border-line bg-surface py-1.5 font-hud text-body-sm',
  'text-text-primary placeholder:text-text-secondary',
  'focus:bg-surface-raised focus:outline-none focus:ring-1 focus:ring-line',
  'disabled:cursor-not-allowed disabled:opacity-50',
);

export interface FieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'> {
  readonly id: string;
  readonly label: string;
  /** Dica técnica à direita do label (ex.: `RFC 822`). */
  readonly hint?: string;
  /** Badge à direita do label (ex.: `OPCIONAL`). */
  readonly badge?: string;
  readonly icon?: IconName;
  /** Controle à direita do input (botão de senha, `check_circle`…). */
  readonly addon?: ReactNode;
  readonly className?: string;
}

export function Field({
  id,
  label,
  hint,
  badge,
  icon,
  addon,
  className,
  ...inputProps
}: FieldProps) {
  return (
    <div data-field={id} className={cx('flex flex-col gap-1.5', className)}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="font-hud text-label-md uppercase text-text-primary">
          {label}
        </label>
        {badge !== undefined ? (
          <span className="border border-line bg-surface-pressed px-1 py-0.5 font-hud text-label-xs uppercase text-text-secondary">
            {badge}
          </span>
        ) : null}
        {hint !== undefined ? (
          <span className="font-hud text-label-xs uppercase text-text-secondary">{hint}</span>
        ) : null}
      </div>

      <div className="relative">
        {icon !== undefined ? (
          <Icon
            name={icon}
            size="md"
            className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 text-text-secondary"
          />
        ) : null}
        <input
          id={id}
          {...inputProps}
          className={cx(FIELD_CONTROL_CLASS, icon !== undefined ? 'pl-7' : 'pl-2', addon !== undefined ? 'pr-10' : 'pr-2')}
        />
        {addon !== undefined ? (
          <span className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center">{addon}</span>
        ) : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Implementar `src/components/auth/password-field.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { Field, type FieldProps } from './field';
import { Icon } from '@/components/ui/icon';
import {
  PASSWORD_STRENGTH_CHECKS,
  passwordStrength,
  type PasswordStrengthCheckId,
} from '@/lib/validation/credentials';
import { cx } from '@/lib/cx';

/**
 * PasswordField — `Field` de senha com toggle de visibilidade e, opcionalmente,
 * o medidor de 3 barras do Stitch. O medidor é APRESENTAÇÃO: a autoridade
 * continua sendo `PASSWORD_MIN_LENGTH`/`PASSWORD_MAX_LENGTH` no `createAuth`.
 */
export interface PasswordFieldProps extends Omit<FieldProps, 'icon' | 'addon' | 'type'> {
  readonly showStrength?: boolean;
}

export function PasswordField({
  id,
  value,
  defaultValue,
  onChange,
  showStrength = false,
  placeholder = '••••••••••••',
  ...rest
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  // Não-controlado (defaultValue) também precisa acender o medidor.
  const [uncontrolled, setUncontrolled] = useState(
    typeof defaultValue === 'string' ? defaultValue : '',
  );
  const current = typeof value === 'string' ? value : uncontrolled;
  const strength = passwordStrength(current);

  return (
    <div className="flex flex-col gap-1.5">
      <Field
        {...rest}
        id={id}
        type={visible ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        defaultValue={defaultValue}
        onChange={(event) => {
          setUncontrolled(event.target.value);
          onChange?.(event);
        }}
        icon="shield"
        addon={
          <button
            type="button"
            aria-label="Alternar visibilidade de senha"
            aria-pressed={visible}
            onClick={() => setVisible((current) => !current)}
            className="flex items-center rounded-xs p-1 text-text-secondary transition-colors duration-[var(--duration-fast)] hover:text-text-primary"
          >
            <Icon name={visible ? 'eye-off' : 'eye'} size="md" />
          </button>
        }
      />

      {showStrength ? (
        <div data-password-strength data-score={strength.score} className="flex flex-col gap-1">
          <div className="grid grid-cols-3 gap-1">
            {PASSWORD_STRENGTH_CHECKS.map((check) => {
              const met = strength.met[check.id as PasswordStrengthCheckId];
              return (
                <span
                  key={check.id}
                  data-strength-bar={check.id}
                  {...(met ? { 'data-met': '' } : {})}
                  className={cx('h-1', met ? 'bg-text-primary' : 'bg-surface-pressed')}
                />
              );
            })}
          </div>
          <div className="flex items-center justify-between font-hud text-label-xs uppercase text-text-secondary">
            {PASSWORD_STRENGTH_CHECKS.map((check) => (
              <span
                key={check.id}
                className={strength.met[check.id] ? 'text-text-primary' : undefined}
              >
                {check.label}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
```

> O `Field` recebe `data-password-field`? Não — o wrapper de `PasswordField` não tem id próprio. Os testes localizam pelo `data-password-strength` e por `getByLabelText`. Se precisar de um gancho estável, o `Field` interno já expõe `data-field={id}`.

- [ ] **Step 5: Implementar `src/components/auth/checkbox-row.tsx`**

```tsx
import type { InputHTMLAttributes, ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';
import { cx } from '@/lib/cx';

/**
 * CheckboxRow — checkbox quadrado de micro-raio com check amarelo (Stitch).
 * O check é um `<Icon>` irmão controlado por `peer-checked` — evita o data-URI
 * inline que o arquivo do Stitch usa em `style`.
 */
export interface CheckboxRowProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'id' | 'className'> {
  readonly id: string;
  readonly label: ReactNode;
  readonly hint?: string;
  readonly className?: string;
}

export function CheckboxRow({ id, label, hint, className, ...inputProps }: CheckboxRowProps) {
  const hintId = `${id}-hint`;

  return (
    <div data-checkbox-row={id} className={cx('flex items-start gap-2', className)}>
      <span className="relative mt-0.5 flex size-3.5 shrink-0 items-center justify-center">
        <input
          id={id}
          type="checkbox"
          {...inputProps}
          aria-describedby={hint !== undefined && inputProps['aria-describedby'] === undefined ? hintId : inputProps['aria-describedby']}
          className={cx(
            'peer size-3.5 shrink-0 appearance-none rounded-xs border border-line bg-surface',
            'checked:border-text-primary checked:bg-text-primary',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        />
        <Icon
          name="check"
          size="xs"
          className="pointer-events-none absolute hidden text-accent peer-checked:block"
        />
      </span>

      <span className="min-w-0">
        <label htmlFor={id} className="block text-body-sm leading-tight text-text-primary">
          {label}
        </label>
        {hint !== undefined ? (
          <span id={hintId} className="mt-0.5 block font-hud text-label-xs uppercase text-text-secondary">
            {hint}
          </span>
        ) : null}
      </span>
    </div>
  );
}
```

- [ ] **Step 6: Implementar `src/components/auth/submit-button.tsx`**

```tsx
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';
import { cx } from '@/lib/cx';

/**
 * SubmitButton — CTA do Stitch: full-width, `bg-accent` + tinta preta,
 * `shadow-hard-3` que "afunda" no hover/active. Usado pelos dois formulários.
 */
export interface SubmitButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'className'> {
  readonly loading?: boolean;
  readonly children: ReactNode;
  readonly className?: string;
}

export function SubmitButton({
  loading = false,
  disabled = false,
  children,
  className,
  ...buttonProps
}: SubmitButtonProps) {
  return (
    <button
      {...buttonProps}
      data-submit-button
      type="submit"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        'inline-flex w-full select-none items-center justify-center gap-2 rounded-md border border-line',
        'bg-accent py-2 font-hud text-label uppercase text-on-accent shadow-hard-3',
        'transition-[transform,box-shadow] duration-[var(--duration-fast)] ease-out-expo',
        'hover:shadow-hard-1 active:translate-x-1 active:translate-y-1 active:shadow-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'disabled:hover:shadow-hard-3 disabled:active:translate-x-0 disabled:active:translate-y-0',
        className,
      )}
    >
      {loading ? (
        <span
          data-testid="submit-spinner"
          aria-hidden="true"
          className="inline-block size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}
      {children}
      <Icon name="arrow-right" size="sm" />
    </button>
  );
}
```

- [ ] **Step 7: Implementar `src/components/auth/auth-divider.tsx`**

```tsx
import { cx } from '@/lib/cx';

/**
 * AuthDivider — régua com rótulo central (Stitch: `OU ACESSE COM E-MAIL E
 * SENHA` / `--- OU PREENCHA O FORMULÁRIO DE REGISTRO ---`). Hairline preta
 * (doutrina do design system), não o cinza-fraco do arquivo.
 */
export interface AuthDividerProps {
  readonly label: string;
  readonly className?: string;
}

export function AuthDivider({ label, className }: AuthDividerProps) {
  return (
    <div data-auth-divider className={cx('flex items-center gap-2', className)}>
      <span aria-hidden="true" className="h-px flex-1 bg-line" />
      <span className="font-hud text-label-xs uppercase text-text-secondary">{label}</span>
      <span aria-hidden="true" className="h-px flex-1 bg-line" />
    </div>
  );
}
```

- [ ] **Step 8: Rodar e ver passar**

Run: `npx vitest run tests/components/auth`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/components/auth tests/components/auth
git commit -m "feat(auth): kit de formulário (Field, PasswordField, CheckboxRow, SubmitButton, divider)"
```

---

### Task 5: Blocos de conteúdo

**Files:**
- Create: `src/components/auth/{auth-terminal,telemetry-panel,stat-strip,info-row,sso-buttons,riot-callout}.tsx`
- Modify: `src/components/auth/index.ts` (barrel completo)
- Test: `tests/components/auth/{auth-terminal,telemetry-panel,stat-strip,info-row,sso-buttons,riot-callout}.test.tsx`

**Interfaces:**
- Consumes: `Icon`/`IconName`, `StatusDot`, `TagLabel`, `cx`, `authClient` de `@/lib/auth-client`.
- Produces:
  - `AuthTerminal({ protocolLine, metaBadge?, children, className? })` — `data-auth-terminal`.
  - `TelemetryPanel({ eyebrow, badge?, title?, accent?, footer?, children, className? })` — `data-telemetry-panel`; `data-accent` quando `accent`.
  - `StatStrip({ items: readonly { label, value }[], className? })` — `data-stat-strip`.
  - `InfoRow({ icon?, title, children, className? })` — `data-info-row`.
  - `SsoButtons({ callbackPath, labels?, discordBadge?, className? })` (Client) — `data-social-login`; marcas `data-brand="google"|"discord"`.
  - `RiotCallout({ variant?, title, badge?, children, className? })` — `data-riot-callout={variant}`.

- [ ] **Step 1: Testes que falham**

```tsx
// tests/components/auth/auth-terminal.test.tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AuthTerminal } from '@/components/auth/auth-terminal';

describe('AuthTerminal', () => {
  it('abre com a linha de protocolo e o badge de porta', () => {
    const html = renderToStaticMarkup(
      <AuthTerminal protocolLine="// PROTOCOLO DE ACESSO" metaBadge="PORT: 443">
        <span data-body />
      </AuthTerminal>,
    );
    expect(html).toContain('data-auth-terminal');
    expect(html).toContain('// PROTOCOLO DE ACESSO');
    expect(html).toContain('PORT: 443');
    expect(html).toContain('data-body');
    expect(html).toContain('shadow-hard-3');
  });
});
```

```tsx
// tests/components/auth/telemetry-panel.test.tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TelemetryPanel } from '@/components/auth/telemetry-panel';

describe('TelemetryPanel', () => {
  it('renderiza eyebrow com prefixo //, badge, título e corpo', () => {
    const html = renderToStaticMarkup(
      <TelemetryPanel eyebrow="PIPELINE SEGURO 3-LAYER" badge="TELEMETRY ON" title="Rede Ativa">
        corpo
      </TelemetryPanel>,
    );
    expect(html).toContain('data-telemetry-panel');
    expect(html).toContain('//');
    expect(html).toContain('PIPELINE SEGURO 3-LAYER');
    expect(html).toContain('TELEMETRY ON');
    expect(html).toContain('Rede Ativa');
  });

  it('a variante accent ganha barra amarela e sombra dura', () => {
    const html = renderToStaticMarkup(<TelemetryPanel accent eyebrow="X">y</TelemetryPanel>);
    expect(html).toContain('data-accent');
    expect(html).toContain('border-l-accent');
    expect(html).toContain('shadow-hard-2');
  });

  it('aceita um footer', () => {
    const html = renderToStaticMarkup(
      <TelemetryPanel eyebrow="X" footer={<span data-foot />}>y</TelemetryPanel>,
    );
    expect(html).toContain('data-foot');
  });
});
```

```tsx
// tests/components/auth/stat-strip.test.tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StatStrip } from '@/components/auth/stat-strip';

describe('StatStrip', () => {
  it('renderiza label mono e valor em tabular-nums', () => {
    const html = renderToStaticMarkup(
      <StatStrip
        items={[
          { label: 'RTT LATENCY', value: '<14ms' },
          { label: 'AI CONFIDENCE', value: '99.4%' },
        ]}
      />,
    );
    expect(html).toContain('data-stat-strip');
    expect(html).toContain('RTT LATENCY');
    expect(html).toContain('&lt;14ms');
    expect(html).toContain('99.4%');
    expect(html).toContain('font-hud');
  });
});
```

```tsx
// tests/components/auth/info-row.test.tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { InfoRow } from '@/components/auth/info-row';

describe('InfoRow', () => {
  it('mostra ícone, título e descrição', () => {
    const html = renderToStaticMarkup(
      <InfoRow icon="shield" title="Criptografia Local de Tokens">
        Armazenamento zero-knowledge.
      </InfoRow>,
    );
    expect(html).toContain('data-info-row');
    expect(html).toContain('data-icon="shield"');
    expect(html).toContain('Criptografia Local de Tokens');
    expect(html).toContain('zero-knowledge');
  });

  it('funciona sem ícone', () => {
    const { length } = renderToStaticMarkup(<InfoRow title="Só título">corpo</InfoRow>);
    expect(length).toBeGreaterThan(0);
    expect(renderToStaticMarkup(<InfoRow title="Só título">corpo</InfoRow>)).not.toContain('data-icon');
  });
});
```

```tsx
// tests/components/auth/sso-buttons.test.tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const signInSocial = vi.fn(async () => ({ error: null }));
vi.mock('@/lib/auth-client', () => ({
  authClient: { signIn: { social: (...args: unknown[]) => signInSocial(...(args as [])) } },
}));

import { SsoButtons } from '@/components/auth/sso-buttons';

afterEach(() => {
  cleanup();
  signInSocial.mockClear();
});

describe('SsoButtons', () => {
  it('renderiza os rótulos de login por padrão, com as marcas', () => {
    const { container } = render(<SsoButtons callbackPath="/dashboard" />);
    expect(container.querySelector('[data-social-login]')).not.toBeNull();
    expect(screen.getByRole('button', { name: /Continuar com Google/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Continuar com Discord/ })).toBeTruthy();
    expect(container.querySelector('[data-brand="google"]')).not.toBeNull();
    expect(container.querySelector('[data-brand="discord"]')).not.toBeNull();
  });

  it('aceita os rótulos de cadastro e o badge do Discord', () => {
    render(
      <SsoButtons
        callbackPath="/dashboard"
        labels={{ google: 'Cadastrar com Google', discord: 'Cadastrar com Discord' }}
        discordBadge="COMMUNITY"
      />,
    );
    expect(screen.getByRole('button', { name: /Cadastrar com Google/ })).toBeTruthy();
    expect(screen.getByText('COMMUNITY')).toBeTruthy();
  });

  it('chama signIn.social com callbackURL', async () => {
    render(<SsoButtons callbackPath="/console" />);
    fireEvent.click(screen.getByRole('button', { name: /Continuar com Google/ }));
    await waitFor(() => expect(signInSocial).toHaveBeenCalledTimes(1));
    expect(signInSocial).toHaveBeenCalledWith({ provider: 'google', callbackURL: '/console' });
  });

  it('expõe erro quando o provedor recusa', async () => {
    signInSocial.mockResolvedValueOnce({ error: { code: 'X' } });
    render(<SsoButtons callbackPath="/dashboard" />);
    fireEvent.click(screen.getByRole('button', { name: /Continuar com Discord/ }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
  });
});
```

```tsx
// tests/components/auth/riot-callout.test.tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RiotCallout } from '@/components/auth/riot-callout';

describe('RiotCallout', () => {
  it('a variante rso traz a marca R e o badge de homologação', () => {
    const html = renderToStaticMarkup(
      <RiotCallout variant="rso" title="Riot Games Sign-On (RSO) - Oficial" badge="[AGUARDANDO KEY PROD RIOT V9]">
        Em homologação.
      </RiotCallout>,
    );
    expect(html).toContain('data-riot-callout="rso"');
    expect(html).toContain('#D32936');
    expect(html).toContain('[AGUARDANDO KEY PROD RIOT V9]');
    expect(html).toContain('Em homologação.');
  });

  it('a variante status usa ponto pulsante e não usa badge', () => {
    const html = renderToStaticMarkup(
      <RiotCallout variant="status" title="STATUS HOMOLOGAÇÃO RIOT GAMES OAUTH DIRECT">
        Em processo.
      </RiotCallout>,
    );
    expect(html).toContain('data-riot-callout="status"');
    expect(html).toContain('animate-pulse');
    expect(html).not.toContain('#D32936');
  });
});
```

- [ ] **Step 2: Ver falhar**

Run: `npx vitest run tests/components/auth`
Expected: FAIL — módulos não encontrados.

- [ ] **Step 3: Implementar `src/components/auth/auth-terminal.tsx`**

```tsx
import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

/**
 * AuthTerminal — card principal das telas de auth. Abre com a linha de
 * protocolo (mono) e um badge à direita; corpo livre abaixo. Stitch tela 7:
 * `shadow-hard-3` + hairline sobre `bg-surface`.
 */
export interface AuthTerminalProps {
  readonly protocolLine: string;
  readonly metaBadge?: string;
  readonly children: ReactNode;
  readonly className?: string;
}

export function AuthTerminal({
  protocolLine,
  metaBadge,
  children,
  className,
}: AuthTerminalProps) {
  return (
    <section
      data-auth-terminal
      className={cx('rounded-md border border-line bg-surface shadow-hard-3', className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-1.5">
        <span className="font-hud text-label-xs uppercase text-text-secondary">{protocolLine}</span>
        {metaBadge !== undefined ? (
          <span className="font-hud text-label-xs uppercase text-text-primary">{metaBadge}</span>
        ) : null}
      </div>
      <div className="flex flex-col gap-3 p-3">{children}</div>
    </section>
  );
}
```

- [ ] **Step 4: Implementar `src/components/auth/telemetry-panel.tsx`**

```tsx
import type { ReactNode } from 'react';
import { TagLabel } from '@/components/ui/tag-label';
import { cx } from '@/lib/cx';

/**
 * TelemetryPanel — bloco eyebrow + título + corpo do Stitch. Usado nos cards
 * da coluna esquerda da tela 7 e nos painéis da sidebar da tela 8.
 * `accent` reproduz o callout "PROTOCOL ADVICE" (barra amarela + sombra dura).
 */
export interface TelemetryPanelProps {
  readonly eyebrow: string;
  readonly badge?: string;
  readonly title?: string;
  readonly accent?: boolean;
  readonly footer?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}

export function TelemetryPanel({
  eyebrow,
  badge,
  title,
  accent = false,
  footer,
  children,
  className,
}: TelemetryPanelProps) {
  return (
    <section
      data-telemetry-panel
      {...(accent ? { 'data-accent': '' } : {})}
      className={cx(
        'flex flex-col gap-2 rounded-md border border-line bg-surface-raised p-3',
        accent && 'border-l-4 border-l-accent shadow-hard-2',
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TagLabel>{eyebrow}</TagLabel>
        {badge !== undefined ? (
          <span className="border border-line bg-surface px-1 py-0.5 font-hud text-label-xs uppercase text-text-secondary">
            {badge}
          </span>
        ) : null}
      </div>

      {title !== undefined ? (
        <h2 className="font-display text-headline-md uppercase text-text-primary">{title}</h2>
      ) : null}

      <div className="text-body-sm leading-relaxed text-text-secondary">{children}</div>

      {footer !== undefined ? (
        <div className="border-t border-line pt-2 font-hud text-label-xs uppercase text-text-secondary">
          {footer}
        </div>
      ) : null}
    </section>
  );
}
```

> `TagLabel` já prefixa `//` (`withPrefix` default `true`) — passar o eyebrow **sem** o `//` (ex.: `"PIPELINE SEGURO 3-LAYER"`).

- [ ] **Step 5: Implementar `src/components/auth/stat-strip.tsx`**

```tsx
import { cx } from '@/lib/cx';

/**
 * StatStrip — linha de métricas mono do Stitch (Stitch: RTT LATENCY / PRO
 * MATCHES / AI CONFIDENCE). Números em `font-hud` (tabular-nums).
 */
export interface StatStripItem {
  readonly label: string;
  readonly value: string;
}

export interface StatStripProps {
  readonly items: readonly StatStripItem[];
  readonly className?: string;
}

export function StatStrip({ items, className }: StatStripProps) {
  return (
    <dl
      data-stat-strip
      className={cx(
        'grid grid-cols-3 divide-x divide-line border border-line bg-surface',
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-0.5 px-2 py-1.5">
          <dt className="font-hud text-label-xs uppercase text-text-secondary">{item.label}</dt>
          <dd className="font-hud text-headline-md text-text-primary">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
```

- [ ] **Step 6: Implementar `src/components/auth/info-row.tsx`**

```tsx
import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/icon';
import { cx } from '@/lib/cx';

/**
 * InfoRow — item "ícone + título + descrição" do Stitch (pipeline 3-layer da
 * tela 7, roteiro de ativação da tela 8).
 */
export interface InfoRowProps {
  readonly icon?: IconName;
  readonly title: string;
  readonly children: ReactNode;
  readonly className?: string;
}

export function InfoRow({ icon, title, children, className }: InfoRowProps) {
  return (
    <div data-info-row className={cx('flex items-start gap-2', className)}>
      {icon !== undefined ? (
        <Icon name={icon} size="md" className="mt-0.5 text-text-primary" />
      ) : null}
      <div className="min-w-0">
        <h3 className="font-hud text-label-md uppercase text-text-primary">{title}</h3>
        <p className="mt-0.5 text-body-sm leading-relaxed text-text-secondary">{children}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Implementar `src/components/auth/sso-buttons.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { cx } from '@/lib/cx';

/**
 * SsoButtons — login/cadastro social (Google + Discord) com as marcas do
 * Stitch. Os paths são marcas de terceiros: não entram no `Icon` do design
 * system (que é monocromático e desenhado em viewBox 16).
 *
 * `signIn.social` navega o navegador para o provedor; o Better Auth volta para
 * `callbackPath` após o callback em /api/auth/callback/<provider>.
 */
type SocialProvider = 'google' | 'discord';

const DEFAULT_LABELS: Record<SocialProvider, string> = {
  google: 'Continuar com Google',
  discord: 'Continuar com Discord',
};

export interface SsoButtonsProps {
  readonly callbackPath: string;
  readonly labels?: Record<SocialProvider, string>;
  /** Badge à direita do botão do Discord (Stitch tela 7: `COMMUNITY`). */
  readonly discordBadge?: string;
  readonly className?: string;
}

function GoogleMark() {
  return (
    <svg data-brand="google" viewBox="0 0 24 24" aria-hidden="true" className="size-4 shrink-0">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

function DiscordMark() {
  return (
    <svg
      data-brand="discord"
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-4 shrink-0 fill-[#5865F2]"
    >
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

const BUTTON_CLASS = cx(
  'inline-flex items-center justify-center gap-1.5 rounded-md border border-line bg-surface px-2 py-1.5',
  'font-hud text-label-sm uppercase text-text-primary shadow-hard-1',
  'transition-[transform,box-shadow] duration-[var(--duration-fast)] ease-out-expo',
  'hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none',
  'disabled:cursor-not-allowed disabled:opacity-50',
);

export function SsoButtons({
  callbackPath,
  labels = DEFAULT_LABELS,
  discordBadge,
  className,
}: SsoButtonsProps) {
  const [loadingProvider, setLoadingProvider] = useState<SocialProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(provider: SocialProvider): Promise<void> {
    setLoadingProvider(provider);
    setError(null);
    try {
      const { error: signInError } = await authClient.signIn.social({
        provider,
        callbackURL: callbackPath,
      });
      if (signInError !== null && signInError !== undefined) {
        setError('Não foi possível iniciar o login. Tente novamente.');
      }
    } catch {
      setError('Falha de rede ao contatar o servidor de autenticação.');
    } finally {
      setLoadingProvider(null);
    }
  }

  return (
    <div data-social-login className={cx('flex flex-col gap-2', className)}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {(['google', 'discord'] as const).map((provider) => (
          <button
            key={provider}
            type="button"
            aria-busy={loadingProvider === provider || undefined}
            disabled={loadingProvider !== null && loadingProvider !== provider}
            onClick={() => void signIn(provider)}
            className={BUTTON_CLASS}
          >
            {provider === 'google' ? <GoogleMark /> : <DiscordMark />}
            <span>{labels[provider]}</span>
            {provider === 'discord' && discordBadge !== undefined ? (
              <span className="border border-line bg-surface-pressed px-1 font-hud text-label-xs text-text-secondary">
                {discordBadge}
              </span>
            ) : null}
          </button>
        ))}
      </div>
      {error !== null ? (
        <p role="alert" className="text-body-sm text-loss">
          {error}
        </p>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 8: Implementar `src/components/auth/riot-callout.tsx`**

```tsx
import type { ReactNode } from 'react';
import { StatusDot } from '@/components/ui/status-dot';
import { cx } from '@/lib/cx';

/**
 * RiotCallout — aviso de estado do Riot Sign-On (RSO), em duas variantes:
 * `rso` (tela 7: marca R + badge `[AGUARDANDO KEY PROD RIOT V9]`) e `status`
 * (tela 8: ponto pulsante + título de homologação, sem badge).
 *
 * #D32936 é o vermelho de marca da Riot — cor de terceiro, fora do design
 * system, mantida por ser marca e não decoração.
 */
export type RiotCalloutVariant = 'rso' | 'status';

export interface RiotCalloutProps {
  readonly variant?: RiotCalloutVariant;
  readonly title: string;
  readonly badge?: string;
  readonly children: ReactNode;
  readonly className?: string;
}

export function RiotCallout({
  variant = 'rso',
  title,
  badge,
  children,
  className,
}: RiotCalloutProps) {
  return (
    <div
      data-riot-callout={variant}
      className={cx('flex items-start gap-2 rounded-md border border-line bg-surface p-2', className)}
    >
      {variant === 'rso' ? (
        <span
          aria-hidden="true"
          className="flex size-5 shrink-0 items-center justify-center bg-[#D32936] font-hud text-label-sm font-bold text-white"
        >
          R
        </span>
      ) : (
        <StatusDot variant="live" className="mt-1 border border-line" />
      )}

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-hud text-label-md uppercase text-text-primary">{title}</span>
          {badge !== undefined ? (
            <span className="border border-line bg-surface-pressed px-1 py-0.5 font-hud text-label-xs uppercase text-text-secondary">
              {badge}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-body-sm leading-relaxed text-text-secondary">{children}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 9: Completar o barrel `src/components/auth/index.ts`**

Substituir o conteúdo pela lista completa (as cinco entradas da Task 2 + as criadas aqui):

```ts
/**
 * Barrel dos componentes das telas de autenticação.
 * `ui/` = design system genérico; `auth/` = só o chrome e os blocos de auth.
 */
export { AuthDivider, type AuthDividerProps } from './auth-divider';
export { AuthFooter, type AuthFooterProps } from './auth-footer';
export { AuthHeader } from './auth-header';
export { AuthTabs } from './auth-tabs';
export { AuthTerminal, type AuthTerminalProps } from './auth-terminal';
export { CheckboxRow, type CheckboxRowProps } from './checkbox-row';
export { Field, FIELD_CONTROL_CLASS, type FieldProps } from './field';
export { InfoRow, type InfoRowProps } from './info-row';
export { PasswordField, type PasswordFieldProps } from './password-field';
export { resolveCallbackPath } from './resolve-callback-path';
export { RiotCallout, type RiotCalloutProps, type RiotCalloutVariant } from './riot-callout';
export { SsoButtons, type SsoButtonsProps } from './sso-buttons';
export { StatStrip, type StatStripItem, type StatStripProps } from './stat-strip';
export { SubmitButton, type SubmitButtonProps } from './submit-button';
export { TelemetryPanel, type TelemetryPanelProps } from './telemetry-panel';
export { TelemetryStrip, type TelemetryStripProps } from './telemetry-strip';
```

- [ ] **Step 10: Rodar e ver passar + typecheck**

```bash
npx vitest run tests/components/auth
npm run typecheck
```
Expected: PASS, `tsc` limpo (o barrel compila).

- [ ] **Step 11: Commit**

```bash
git add src/components/auth tests/components/auth
git commit -m "feat(auth): blocos de conteúdo (terminal, painéis, stats, SSO, callout Riot)"
```

---

### Task 6: Tela 7 — `/login`

**Files:**
- Create: `src/app/(auth)/login/login-form.tsx`
- Modify: `src/app/(auth)/login/page.tsx` (reescrita)
- Test: `tests/app/login/login-page.test.tsx` (reescrita), `tests/app/login/login-form.test.tsx` (nova)
- Delete: `src/app/(auth)/login/email-auth-forms.tsx` (o `EmailLoginForm` sai; `SignupForm` só sai na Task 7)

**Interfaces:**
- Consumes: `AuthTerminal`, `AuthDivider`, `AuthTabs`, `CheckboxRow`, `Field`, `PasswordField`, `RiotCallout`, `SsoButtons`, `StatStrip`, `TelemetryPanel`, `TelemetryStrip`, `SubmitButton`, `resolveCallbackPath`, `SESSION_TTL_DAYS`, `parseEmail`/`parsePassword`/`passwordStrength`.
- Produces: `LoginForm({ callbackPath, className? })` (Client) — `data-email-login` no `<form>`; envia `{ email, password, rememberMe, callbackURL }` para `signIn.email`.

- [ ] **Step 1: Escrever os testes que falham**

```tsx
// tests/app/login/login-page.test.tsx
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * SUITE TDD — página /login (Server Component assíncrono). O auth-client é
 * mockado (o fluxo OAuth real é validado pelo dono em dev com credenciais).
 * Layout: grid 12 col, telemetria à esquerda (col-span-5) e terminal de
 * acesso à direita (col-span-7) — Stitch tela 7.
 */

vi.mock('@/lib/auth-client', () => ({
  authClient: { signIn: { social: vi.fn(async () => ({ error: null })) } },
}));

vi.mock('next/navigation', () => ({ usePathname: () => '/login' }));

import LoginPage from '@/app/(auth)/login/page';

const render = async (next?: string): Promise<string> => {
  const element = await LoginPage({
    searchParams: Promise.resolve(next === undefined ? {} : { next }),
  });
  return renderToStaticMarkup(element);
};

describe('LoginPage', () => {
  it('preserva os ganchos data-* que as navegações anteriores usavam', async () => {
    const html = await render();
    expect(html).toContain('data-login-page');
    expect(html).toContain('data-social-login');
    expect(html).toContain('data-email-login');
  });

  it('renderiza o chrome de telemetria da tela 7', async () => {
    const html = await render();
    expect(html).toContain('GATEWAY: SA-BRAZIL-EAST-1 // SECURE ROUTE');
    expect(html).toContain('AUTH ENGINE: HYDRA-V4.2');
    expect(html).toContain('TLS 1.3 VERIFIED');
    expect(html).toContain('RTT LATENCY');
    expect(html).toContain('1.2M+');
    expect(html).toContain('AI CONFIDENCE');
    expect(html).toContain('99.4%');
    expect(html).toContain('NODE: SA-BR-01');
  });

  it('renderiza o terminal de acesso com protocolo, SSO e RSO', async () => {
    const html = await render();
    expect(html).toContain('data-auth-terminal');
    expect(html).toContain('// PROTOCOLO DE ACESSO // VALORANT.COACH TELEMETRY PIPELINE');
    expect(html).toContain('PORT: 443');
    expect(html).toContain('ACESSO AO HUB TELEMÉTRICO');
    expect(html).toContain('Continuar com Google');
    expect(html).toContain('Continuar com Discord');
    expect(html).toContain('COMMUNITY');
    expect(html).toContain('Riot Games Sign-On (RSO) - Oficial');
    expect(html).toContain('[AGUARDANDO KEY PROD RIOT V9]');
    expect(html).toContain('OU ACESSE COM E-MAIL E SENHA');
  });

  it('mostra o switcher nas duas posições que o Stitch desenha', async () => {
    const html = await render();
    expect(html.match(/data-auth-tabs/g)?.length).toBe(2);
  });

  it('usa o label honesto do campo de identificador (só e-mail)', async () => {
    const html = await render();
    expect(html).toContain('E-mail');
    expect(html).not.toContain('E-mail ou Riot ID associado');
  });

  it('preserva o ?next= do proxy sem quebrar', async () => {
    expect(await render('/players/br/tenz/0001')).toContain('data-login-page');
  });
});
```

```tsx
// tests/app/login/login-form.test.tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const signInEmail = vi.fn(async () => ({ error: null }));
vi.mock('@/lib/auth-client', () => ({
  authClient: { signIn: { email: (...args: unknown[]) => signInEmail(...(args as [])) } },
}));

import { LoginForm } from '@/app/(auth)/login/login-form';

afterEach(() => {
  cleanup();
  signInEmail.mockClear();
});

function form(): HTMLFormElement {
  const element = document.querySelector<HTMLFormElement>('form[data-email-login]');
  if (element === null) throw new Error('form data-email-login não encontrado');
  return element;
}

function fill(email: string, password: string): void {
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Senha de Acesso'), { target: { value: password } });
}

describe('LoginForm', () => {
  it('envia rememberMe marcado por padrão, com callbackURL', async () => {
    render(<LoginForm callbackPath="/dashboard" />);
    fill('  Coach@ValCoach.dev ', 'segred0!valcoach');
    fireEvent.submit(form());

    await waitFor(() => expect(signInEmail).toHaveBeenCalledTimes(1));
    expect(signInEmail).toHaveBeenCalledWith({
      email: 'coach@valcoach.dev',
      password: 'segred0!valcoach',
      rememberMe: true,
      callbackURL: '/dashboard',
    });
  });

  it('desmarcar o checkbox envia rememberMe=false', async () => {
    render(<LoginForm callbackPath="/dashboard" />);
    fill('coach@valcoach.dev', 'segred0!valcoach');
    fireEvent.click(screen.getByLabelText(/Manter sessão/));
    fireEvent.submit(form());

    await waitFor(() => expect(signInEmail).toHaveBeenCalledTimes(1));
    expect(signInEmail).toHaveBeenCalledWith(
      expect.objectContaining({ rememberMe: false }),
    );
  });

  it('bloqueia envio com email inválido, sem chamar a API', () => {
    render(<LoginForm callbackPath="/dashboard" />);
    fill('sem-arroba', 'segred0!valcoach');
    fireEvent.submit(form());

    expect(signInEmail).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('e-mail');
  });

  it('mostra erro genérico quando o servidor recusa as credenciais', async () => {
    signInEmail.mockResolvedValueOnce({ error: { code: 'INVALID_PASSWORD' } });
    render(<LoginForm callbackPath="/dashboard" />);
    fill('coach@valcoach.dev', 'segred0!valcoach');
    fireEvent.submit(form());

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('incorretos'));
  });

  it('mostra o link de reset como pendência explícita', () => {
    render(<LoginForm callbackPath="/dashboard" />);
    expect(screen.getByRole('link', { name: 'Esqueceu a senha?' }).getAttribute('href')).toBe('#');
  });
});
```

- [ ] **Step 2: Ver falhar**

Run: `npx vitest run tests/app/login`
Expected: FAIL — `@/app/(auth)/login/login-form` não existe.

- [ ] **Step 3: Implementar `src/app/(auth)/login/login-form.tsx`**

```tsx
'use client';

import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { CheckboxRow } from '@/components/auth/checkbox-row';
import { Field } from '@/components/auth/field';
import { PasswordField } from '@/components/auth/password-field';
import { SubmitButton } from '@/components/auth/submit-button';
import { SESSION_TTL_DAYS } from '@/lib/session-policy';
import { parseEmail, parsePassword } from '@/lib/validation/credentials';

/**
 * LoginForm — tela 7: e-mail + senha + "manter sessão" (30 dias) via
 * `signIn.email`. Validação client-side com o mesmo módulo puro dos limites do
 * servidor; qualquer recusa do servidor vira um erro GENÉRICO (não revelamos
 * se o e-mail existe — evita enumeração de contas).
 *
 * TODO(reset-senha): "Esqueceu a senha?" exige provider de e-mail (spec §2 e
 * §10). `#` até a fase própria existir.
 */

export interface LoginFormProps {
  readonly callbackPath: string;
  readonly className?: string;
}

const GENERIC_ERROR = 'E-mail ou senha incorretos.';

export function LoginForm({ callbackPath, className }: LoginFormProps) {
  const emailId = useId();
  const passwordId = useId();
  const rememberId = useId();
  const errorId = useId();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function fail(message: string): void {
    setError(message);
  }

  async function submit(): Promise<void> {
    const parsedEmail = parseEmail(email);
    if (!parsedEmail.ok) {
      fail(parsedEmail.message);
      return;
    }
    const parsedPassword = parsePassword(password);
    if (!parsedPassword.ok) {
      fail(parsedPassword.message);
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const { authClient } = await import('@/lib/auth-client');
      // `rememberMe` governa o cookie: `true` → persistente por
      // SESSION_TTL_SECONDS; `false` → cookie de sessão (morre ao fechar).
      const { error: signInError } = await authClient.signIn.email({
        email: parsedEmail.value,
        password: parsedPassword.value,
        rememberMe,
        callbackURL: callbackPath,
      });
      if (signInError !== null && signInError !== undefined) {
        fail(GENERIC_ERROR);
      }
    } catch {
      fail('Falha de rede ao contatar o servidor de autenticação.');
    } finally {
      setLoading(false);
    }
  }

  const invalid = error !== null ? { 'aria-invalid': true, 'aria-describedby': errorId } : {};

  return (
    <form
      data-email-login
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void submit();
      }}
      noValidate
      className={className}
    >
      <div className="flex flex-col gap-2">
        <Field
          id={emailId}
          name="email"
          label="E-mail"
          hint="RFC 822"
          type="email"
          autoComplete="email"
          placeholder="agente@valorant.coach"
          value={email}
          disabled={loading}
          onChange={(event) => setEmail(event.target.value)}
          icon="send"
          {...invalid}
        />

        <PasswordField
          id={passwordId}
          name="password"
          label="Senha de Acesso"
          autoComplete="current-password"
          value={password}
          disabled={loading}
          onChange={(event) => setPassword(event.target.value)}
          {...invalid}
          // O rótulo à direita do campo de senha é o link de reset, não um hint.
          hint={undefined}
        />

        <div className="flex items-center justify-between gap-2 font-hud text-label-xs uppercase">
          <Link
            href="#"
            className="text-text-secondary transition-colors duration-[var(--duration-fast)] hover:text-text-primary"
          >
            Esqueceu a senha?
          </Link>
          <span className="text-text-secondary">
            {`SESSÃO: ${SESSION_TTL_DAYS} DIAS`}
          </span>
        </div>

        <CheckboxRow
          id={rememberId}
          name="rememberMe"
          label={`Manter sessão segura neste terminal (${SESSION_TTL_DAYS} dias)`}
          hint="PERSISTENT_AUTH"
          checked={rememberMe}
          disabled={loading}
          onChange={(event) => setRememberMe(event.target.checked)}
        />

        <SubmitButton loading={loading}>ENTRAR NO VALORANT.COACH</SubmitButton>

        {error !== null ? (
          <p id={errorId} role="alert" className="text-body-sm text-loss">
            {error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
```

> `PasswordFieldProps` faz `Omit<..., 'type'>` — não passar `type` (o componente decide pelo estado de visibilidade). Os dois campos de senha do cadastro compartilham o mesmo `placeholder` default (`••••••••••••`, como no Stitch); por isso os testes localizam por `getByLabelText`, nunca por placeholder.

- [ ] **Step 4: Reescrever `src/app/(auth)/login/page.tsx`**

```tsx
import { AuthDivider } from '@/components/auth/auth-divider';
import { AuthTabs } from '@/components/auth/auth-tabs';
import { AuthTerminal } from '@/components/auth/auth-terminal';
import { InfoRow } from '@/components/auth/info-row';
import { resolveCallbackPath } from '@/components/auth/resolve-callback-path';
import { RiotCallout } from '@/components/auth/riot-callout';
import { SsoButtons } from '@/components/auth/sso-buttons';
import { StatStrip } from '@/components/auth/stat-strip';
import { TelemetryPanel } from '@/components/auth/telemetry-panel';
import { TelemetryStrip } from '@/components/auth/telemetry-strip';
import { LoginForm } from './login-form';

/**
 * PÁGINA: /login (Stitch tela 7 — "Autenticação & Login").
 *
 * Grid de 12 colunas: telemetria à esquerda (col-span-5, abaixo no mobile) e o
 * terminal de acesso à direita (col-span-7, acima no mobile). O proxy (Next 16)
 * redireciona rotas protegidas para cá com `?next=<destino>`.
 *
 * `instant = false`: a página consome `searchParams` (doc de `instant`).
 */

export const instant = false;

interface PageProps {
  searchParams: Promise<{ next?: string | string[] }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const callbackPath = resolveCallbackPath(query.next);

  return (
    <div
      data-login-page
      className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center gap-3 px-4 py-3"
    >
      <TelemetryStrip
        items={[
          'GATEWAY: SA-BRAZIL-EAST-1 // SECURE ROUTE',
          'AUTH ENGINE: HYDRA-V4.2',
          'ACTIVE THREADS: 14.802',
          'TLS 1.3 VERIFIED',
        ]}
      />

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-12">
        {/* Coluna de telemetria — order-2 no mobile, à esquerda no desktop. */}
        <div className="order-2 flex flex-col gap-3 lg:order-1 lg:col-span-5">
          <TelemetryPanel
            accent
            eyebrow="PROTOCOL ADVICE: ACCESS LEVEL-0"
            badge="SYS_ID: 8092-B"
            title="Inteligência Algorítmica Pós-Login"
          >
            Ao ingressar no terminal, seus logs de combate de Ascent, Haven e Lotus são ingeridos
            em tempo real. Identifique timing de crosshair placement, retakes e desperdício de
            utilitários em fração de segundos.
          </TelemetryPanel>

          <StatStrip
            items={[
              { label: 'RTT LATENCY', value: '<14ms' },
              { label: 'PRO MATCHES', value: '1.2M+' },
              { label: 'AI CONFIDENCE', value: '99.4%' },
            ]}
          />

          <TelemetryPanel
            eyebrow="PIPELINE SEGURO 3-LAYER"
            badge="TELEMETRY ON"
            footer={
              <span className="flex flex-wrap items-center justify-between gap-2">
                <span>REDE ATIVA: 42.890+ AGENTES CONECTADOS</span>
                <span className="border border-line bg-surface px-1 py-0.5 text-text-primary">
                  100% OPERACIONAL
                </span>
              </span>
            }
          >
            <div className="flex flex-col gap-2.5">
              <InfoRow icon="shield" title="Criptografia Local de Tokens">
                Armazenamento zero-knowledge. Suas credenciais de jogo nunca são expostas em texto
                puro.
              </InfoRow>
              <InfoRow icon="refresh" title="Riot API & HenrikDev Live Sync">
                Sincronização imediata de MMR, split de danos de headshot e KAST por rodada.
              </InfoRow>
              <InfoRow icon="target" title="Diagnósticos Instantâneos <150ms">
                Processamento neural ultrarrápido com análise de micro-decisões round a round.
              </InfoRow>
            </div>
          </TelemetryPanel>

          <TelemetryPanel eyebrow="ÚLTIMO SNAPSHOT ANALISADO" badge="SOVA">
            <p className="font-hud text-label-md uppercase text-text-primary">
              MAP: SUNSET // 13-9 VICTORY
            </p>
            <div className="mt-1 flex items-center gap-3 font-hud text-label-sm uppercase">
              <span className="text-text-primary">24 / 11 / 8</span>
              <span className="text-text-secondary">HS%: 38.2%</span>
              <span className="text-text-secondary">ACS: 289</span>
            </div>
          </TelemetryPanel>
        </div>

        {/* Terminal de acesso. */}
        <div className="order-1 flex flex-col gap-3 lg:order-2 lg:col-span-7">
          <AuthTerminal
            protocolLine="// PROTOCOLO DE ACESSO // VALORANT.COACH TELEMETRY PIPELINE"
            metaBadge="PORT: 443"
          >
            <AuthTabs />

            <div>
              <h1 className="font-display text-display-xl-mobile uppercase tracking-tighter text-text-primary sm:text-display-xl">
                ACESSO AO HUB TELEMÉTRICO
              </h1>
              <p className="mt-1 text-body-md text-text-secondary">
                Conecte suas credenciais para sincronizar partidas, rotinas de coaching e
                diagnósticos de IA.
              </p>
            </div>

            <SsoButtons callbackPath={callbackPath} discordBadge="COMMUNITY" />

            <RiotCallout
              variant="rso"
              title="Riot Games Sign-On (RSO) - Oficial"
              badge="[AGUARDANDO KEY PROD RIOT V9]"
            >
              Integração direta com Riot ID (OAuth2) em homologação. Utilize login com e-mail,
              Google ou Discord e vincule seu Riot ID (ex:{' '}
              <code className="font-hud text-text-primary">Agente#BR1</code>) no painel após
              entrar.
            </RiotCallout>

            <AuthDivider label="OU ACESSE COM E-MAIL E SENHA" />

            <LoginForm callbackPath={callbackPath} />

            <p className="text-body-sm text-text-secondary">
              Ainda não possui credenciais telemétricas? Crie sua conta gratuitamente em segundos.{' '}
              <a
                href="/signup"
                className="font-hud text-label-xs uppercase text-text-primary underline-offset-4 hover:underline"
              >
                REGISTRAR AGENTE
              </a>
            </p>
          </AuthTerminal>
        </div>
      </div>

      <TelemetryStrip
        variant="bar"
        items={[
          'NODE: SA-BR-01',
          'RIOT API RATELIMIT: 99.8% HEALTHY',
          'VANGUARD COMPATIBLE LOG PARSER',
        ]}
        trailing={<span>SESSION HASH: 0x9AF8...B12</span>}
      />
    </div>
  );
}
```

> O link "REGISTRAR AGENTE" usa `<a>` (navegação de documento inteiro) e não `<Link>`: `<Link>` prefetcha a rota e, com `cacheComponents`, arrasta o segmento de `/signup` para o prefetch desta página. Manter `<a>` — mesma decisão já tomada para os links de rodapé sem destino.

- [ ] **Step 5: Remover o `EmailLoginForm` antigo**

Apagar a função `EmailLoginForm` e o tipo `EmailLoginFormProps` de `src/app/(auth)/login/email-auth-forms.tsx`, deixando só o `SignupForm` (que a Task 7 substitui) e o import `parseEmail/parsePassword/parseName` que ele usa. Renomear o arquivo para `signup-form.legacy.tsx` **não** — a Task 7 muda o import; apenas retirar o `EmailLoginForm` agora.

Atualizar `tests/app/login/email-auth-forms.test.tsx`: remover o `describe('EmailLoginForm')` inteiro (3 testes) — ele é substituído por `tests/app/login/login-form.test.tsx`. Manter o `describe('SignupForm')` e ajustar o import para `@/app/(auth)/login/email-auth-forms`.

- [ ] **Step 6: Rodar e ver passar**

```bash
npx vitest run tests/app/login
npm run typecheck
```
Expected: PASS. `login-page.test.tsx` (6), `login-form.test.tsx` (5), `email-auth-forms.test.tsx` (3 do SignupForm).

- [ ] **Step 7: Smoke visual contra o Stitch**

```bash
npm run dev
```
Abrir `/login` em 1280px e em 390px. Conferir contra `.stitch/login.html` aberto lado a lado: header fixo com `SYS_AUTH`, marquee, coluna de telemetria à esquerda, terminal à direita, grid colapsando (terminal acima) no mobile, botão amarelo com sombra dura que "afunda" no hover, checkbox com check amarelo. Encerrar o dev.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(auth): tela 7 (/login) fiel ao Stitch com rememberMe de 30 dias"
```

---

### Task 7: Tela 8 — `/signup`

**Files:**
- Create: `src/app/(auth)/signup/signup-form.tsx`
- Modify: `src/app/(auth)/signup/page.tsx` (reescrita)
- Delete: `src/app/(auth)/login/email-auth-forms.tsx`, `src/app/login/social-login-buttons.tsx` (se ainda existir), `tests/app/login/email-auth-forms.test.tsx`
- Test: `tests/app/signup/signup-page.test.tsx` (reescrita), `tests/app/signup/signup-form.test.tsx` (nova)

**Interfaces:**
- Consumes: todos os blocos da Task 5, o kit da Task 4, `parseEmail`/`parsePassword`/`parseName`/`parsePasswordConfirmation`, `parseRiotId` de `@/lib/validation/riot-id`, `HENRIKDEV_AFFINITIES` de `@/contracts/henrikdev`, `linkRiotAccount` de `@/app/actions/user-riot`, `useRouter` de `next/navigation`.
- Produces: `SignupForm({ callbackPath, className? })` (Client) — `data-signup-form`; `data-signup-submit`.

- [ ] **Step 1: Escrever os testes que falham**

```tsx
// tests/app/signup/signup-form.test.tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const signUpEmail = vi.fn(async () => ({ error: null }));
const linkRiotAccount = vi.fn(async () => ({ ok: true, message: 'vinculado' }));
const push = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth-client', () => ({
  authClient: { signUp: { email: (...args: unknown[]) => signUpEmail(...(args as [])) } },
}));
vi.mock('@/app/actions/user-riot', () => ({
  linkRiotAccount: (...args: unknown[]) => linkRiotAccount(...(args as [])),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

import { SignupForm } from '@/app/(auth)/signup/signup-form';

afterEach(() => {
  cleanup();
  signUpEmail.mockClear();
  linkRiotAccount.mockClear();
  push.mockClear();
});

function form(): HTMLFormElement {
  const element = document.querySelector<HTMLFormElement>('form[data-signup-form]');
  if (element === null) throw new Error('form data-signup-form não encontrado');
  return element;
}

function fillBase(password = 'segred0!valcoach'): void {
  fireEvent.change(screen.getByLabelText('01 // NOME DE OPERADOR / USUÁRIO'), {
    target: { value: '  Coach  ' },
  });
  fireEvent.change(screen.getByLabelText('02 // E-MAIL DE TRABALHO OU PESSOAL'), {
    target: { value: 'coach@valcoach.dev' },
  });
  fireEvent.change(screen.getByLabelText('04 // SENHA DE ACESSO'), { target: { value: password } });
  fireEvent.change(screen.getByLabelText('05 // CONFIRMAR SENHA'), { target: { value: password } });
}

function acceptTerms(): void {
  fireEvent.click(screen.getByLabelText(/Concordo com os/));
}

describe('SignupForm', () => {
  it('cria a conta e navega SEM callbackURL (o redirect do Better Auth atropelaria o vínculo do Riot ID)', async () => {
    render(<SignupForm callbackPath="/dashboard" />);
    fillBase();
    acceptTerms();
    fireEvent.submit(form());

    await waitFor(() => expect(signUpEmail).toHaveBeenCalledTimes(1));
    expect(signUpEmail).toHaveBeenCalledWith({
      name: 'Coach',
      email: 'coach@valcoach.dev',
      password: 'segred0!valcoach',
    });
    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard'));
    expect(linkRiotAccount).not.toHaveBeenCalled();
  });

  it('rejeita senha curta antes de chamar a API', () => {
    render(<SignupForm callbackPath="/dashboard" />);
    fillBase('1234567');
    acceptTerms();
    fireEvent.submit(form());

    expect(signUpEmail).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('A senha deve ter de');
  });

  it('rejeita confirmação divergente antes de chamar a API', () => {
    render(<SignupForm callbackPath="/dashboard" />);
    fillBase();
    fireEvent.change(screen.getByLabelText('05 // CONFIRMAR SENHA'), {
      target: { value: 'outraSenha1!' },
    });
    acceptTerms();
    fireEvent.submit(form());

    expect(signUpEmail).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toBe('As senhas não coincidem.');
  });

  it('exige o aceite dos termos', () => {
    render(<SignupForm callbackPath="/dashboard" />);
    fillBase();
    fireEvent.submit(form());

    expect(signUpEmail).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('termos');
  });

  it('rejeita Riot ID malformado antes de criar a conta', () => {
    render(<SignupForm callbackPath="/dashboard" />);
    fillBase();
    fireEvent.change(screen.getByLabelText(/03 \/\/ RIOT ID INICIAL/), {
      target: { value: 'sem-cerquilha' },
    });
    acceptTerms();
    fireEvent.submit(form());

    expect(signUpEmail).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('Nome#Tag');
  });

  it('com Riot ID válido, vincula depois do cadastro e então navega', async () => {
    render(<SignupForm callbackPath="/dashboard" />);
    fillBase();
    fireEvent.change(screen.getByLabelText(/03 \/\/ RIOT ID INICIAL/), {
      target: { value: 'Aspas#LEV' },
    });
    fireEvent.change(screen.getByLabelText(/REGIÃO/), { target: { value: 'na' } });
    acceptTerms();
    fireEvent.submit(form());

    await waitFor(() => expect(linkRiotAccount).toHaveBeenCalledTimes(1));
    expect(linkRiotAccount).toHaveBeenCalledWith({ region: 'na', name: 'Aspas', tag: 'LEV' });
    expect(signUpEmail.mock.invocationCallOrder[0]).toBeLessThan(
      linkRiotAccount.mock.invocationCallOrder[0] ?? 0,
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard'));
  });

  it('falha no vínculo não invalida a conta: vai para settings', async () => {
    linkRiotAccount.mockResolvedValueOnce({ ok: false, error: 'UNAUTHENTICATED', message: 'x' });
    render(<SignupForm callbackPath="/dashboard" />);
    fillBase();
    fireEvent.change(screen.getByLabelText(/03 \/\/ RIOT ID INICIAL/), {
      target: { value: 'Aspas#LEV' },
    });
    acceptTerms();
    fireEvent.submit(form());

    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard/settings'));
  });

  it('mensagem específica para e-mail já cadastrado', async () => {
    signUpEmail.mockResolvedValueOnce({ error: { code: 'USER_ALREADY_EXISTS' } });
    render(<SignupForm callbackPath="/dashboard" />);
    fillBase();
    acceptTerms();
    fireEvent.submit(form());

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('já está cadastrado'));
    expect(push).not.toHaveBeenCalled();
  });

  it('oferece as 6 afinidades reais como região', () => {
    render(<SignupForm callbackPath="/dashboard" />);
    for (const affinity of ['br', 'latam', 'na', 'eu', 'ap', 'kr']) {
      expect(screen.getByRole('option', { name: new RegExp(`REGIÃO: ${affinity}`, 'i') })).toBeTruthy();
    }
  });
});
```

```tsx
// tests/app/signup/signup-page.test.tsx
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    signIn: { social: vi.fn(async () => ({ error: null })) },
    signUp: { email: vi.fn(async () => ({ error: null })) },
  },
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/signup',
  useRouter: () => ({ push: vi.fn() }),
}));

import SignupPage from '@/app/(auth)/signup/page';

const render = async (next?: string): Promise<string> => {
  const element = await SignupPage({
    searchParams: Promise.resolve(next === undefined ? {} : { next }),
  });
  return renderToStaticMarkup(element);
};

describe('SignupPage', () => {
  it('preserva os ganchos data-* de cadastro', async () => {
    const html = await render();
    expect(html).toContain('data-signup-page');
    expect(html).toContain('data-signup-form');
    expect(html).toContain('data-social-login');
  });

  it('renderiza a barra de status e o card de registro do Stitch', async () => {
    const html = await render();
    expect(html).toContain('SYS_ENV: PROD_GLOBAL // PROTOCOL_V4.2.1');
    expect(html).toContain('ZERO SCRIM LEAK CERTIFIED');
    expect(html).toContain('CADASTRO ABERTO');
    expect(html).toContain('NO NOVO OPERADOR TELEMÉTRICO');
    expect(html).toContain('HASH ID: REC_9942_NEW');
    expect(html).toContain('INICIALIZAR CONTA VALORANT.COACH');
    expect(html).toContain('OU PREENCHA O FORMULÁRIO DE REGISTRO');
  });

  it('renderiza a sidebar de ativação, latência e criptografia', async () => {
    const html = await render();
    expect(html).toContain('PROTOCOLO DE ATIVAÇÃO');
    expect(html).toContain('TIER // FREE VOD');
    expect(html).toContain('ANÁLISE DE ATÉ 20 PARTIDAS RECENTES');
    expect(html).toContain('TELEMETRIA DE LATÊNCIA DA API');
    expect(html).toContain('99.98% UP');
    expect(html).toContain('MIN: 4.2ms');
    expect(html).toContain('JÁ POSSUI UMA CONTA TELEMÉTRICA?');
    expect(html).toContain('CRIPTOGRAFIA DE ARQUIVOS VOD');
  });

  it('desenha o sparkline da latência da API', async () => {
    const html = await render();
    expect(html).toContain('data-sparkline');
  });

  it('linka para o /login', async () => {
    expect(await render()).toContain('href="/login"');
  });

  it('não quebra com o parâmetro ?next= presente', async () => {
    expect(await render('/dashboard')).toContain('data-signup-page');
  });
});
```

- [ ] **Step 2: Ver falhar**

Run: `npx vitest run tests/app/signup`
Expected: FAIL — `signup-form` e `data-sparkline` inexistentes.

- [ ] **Step 3: Estender `Sparkline` com o sufixo `data-sparkline`**

O teste da página precisa de um gancho estável. Em `src/components/ui/sparkline/sparkline.tsx`, acrescentar `data-sparkline` ao `<svg>`:

```tsx
      <svg
        role="img"
        aria-label={ariaLabel}
        data-sparkline
        data-trend={trend}
```

Ajustar `tests/components/ui/sparkline.test.tsx` (se já existir) sem quebrar: é aditivo.

**O `Sparkline` não é reescrito.** O Stitch desenha a área do gráfico com `fill="#f5f841" fill-opacity="0.25"` e dois marcadores; o primitivo compartilhado hoje desenha apenas a linha e escolhe a cor pela tendência (`--color-win`/`--color-loss`). Enriquecê-lo afeta `/players` e `/matches` — fora do escopo deste plano (ver "Ponto de atenção para o revisor humano"). A tela 8 usa o primitivo **como está**, apenas com o gancho aditivo `data-sparkline`.

O teste da página (Step 1) exige apenas o gancho `data-sparkline` — não o traçado literal do Stitch, que pertence ao arquivo de design e não ao primitivo. A série passada espelha o traçado do Stitch normalizada para ms — `LATENCY_SERIES = [16.1, 14.2, 15, 11.4, 12.6, 9.2, 10.8, 10.1, 5.4, 8.1, 4.2]` — casando com os rótulos `MIN: 4.2ms` / `MAX: 16.1ms` do rodapé do painel.

- [ ] **Step 4: Implementar `src/app/(auth)/signup/signup-form.tsx`**

```tsx
'use client';

import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { linkRiotAccount } from '@/app/actions/user-riot';
import { CheckboxRow } from '@/components/auth/checkbox-row';
import { Field, FIELD_CONTROL_CLASS } from '@/components/auth/field';
import { PasswordField } from '@/components/auth/password-field';
import { SubmitButton } from '@/components/auth/submit-button';
import { HENRIKDEV_AFFINITIES, type HenrikDevAffinity } from '@/contracts/henrikdev';
import {
  parseEmail,
  parseName,
  parsePassword,
  parsePasswordConfirmation,
} from '@/lib/validation/credentials';
import { parseRiotId } from '@/lib/validation/riot-id';
import { cx } from '@/lib/cx';

/**
 * SignupForm — tela 8: nome, e-mail, Riot ID opcional (+ região), senha,
 * confirmação e aceite de termos.
 *
 * DUAS decisões de contrato:
 *
 * 1. `signUp.email` é chamado SEM `callbackURL`. O cliente do Better Auth traz
 *    um `redirectPlugin` LIGADO por padrão: com `callbackURL`, ele navega o
 *    navegador assim que a resposta chega, atropelando o vínculo do Riot ID e a
 *    navegação final. A navegação é nossa, no fim de `submit()`.
 * 2. Falha no vínculo NÃO invalida a conta (que já foi criada). O usuário vai
 *    para `/dashboard/settings`, onde o formulário de vínculo já existe e
 *    mostra o erro.
 */

export interface SignupFormProps {
  readonly callbackPath: string;
  readonly className?: string;
}

const EMAIL_IN_USE = 'Este e-mail já está cadastrado. Tente entrar.';
const GENERIC_SIGNUP_ERROR = 'Não foi possível criar a conta. Tente novamente.';
const TERMS_REQUIRED = 'Aceite os termos para continuar.';

/** Rótulos do Stitch (4 opções) expandidos para as 6 afinidades REAIS do
 * contrato HenrikDev — o backend rejeita `KR / ASIA PACIFIC` como valor único
 * e LATAM não estava representado. */
const REGION_LABELS: Record<HenrikDevAffinity, string> = {
  br: 'BR',
  latam: 'LATAM',
  na: 'NA (NORTH AMER)',
  eu: 'EMEA (EUROPE)',
  ap: 'AP (ASIA PACIFIC)',
  kr: 'KR (KOREA)',
};

export function SignupForm({ callbackPath, className }: SignupFormProps) {
  const router = useRouter();

  const nameId = useId();
  const emailId = useId();
  const riotId = useId();
  const regionId = useId();
  const passwordId = useId();
  const confirmationId = useId();
  const termsId = useId();
  const errorId = useId();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [riotName, setRiotName] = useState('');
  const [region, setRegion] = useState<HenrikDevAffinity>('br');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /** Validações em ordem; devolve o `ParsePasswordResult` quando tudo passa. */
  function validate(): { ok: true; password: string } | { ok: false } {
    const checks = [
      parseName(name),
      parseEmail(email),
      parsePassword(password),
      parsePasswordConfirmation(password, confirmation),
    ];
    for (const check of checks) {
      if (!check.ok) {
        setError(check.message);
        return { ok: false };
      }
    }
    if (!acceptedTerms) {
      setError(TERMS_REQUIRED);
      return { ok: false };
    }
    return { ok: true, password: password };
  }

  async function submit(): Promise<void> {
    const base = validate();
    if (!base.ok) {
      return;
    }

    const trimmedRiot = riotName.trim();
    const parsedRiot = trimmedRiot === '' ? null : parseRiotId(trimmedRiot);
    if (parsedRiot !== null && !parsedRiot.ok) {
      setError(parsedRiot.message);
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const parsedName = parseName(name);
      const parsedEmail = parseEmail(email);
      if (!parsedName.ok || !parsedEmail.ok) {
        return;
      }

      const { authClient } = await import('@/lib/auth-client');
      // Sem `callbackURL` — ver o docblock do módulo.
      const { error: signUpError } = await authClient.signUp.email({
        name: parsedName.value,
        email: parsedEmail.value,
        password: base.password,
      });

      if (signUpError !== null && signUpError !== undefined) {
        setError(
          signUpError.code === 'USER_ALREADY_EXISTS' ? EMAIL_IN_USE : GENERIC_SIGNUP_ERROR,
        );
        return;
      }

      if (parsedRiot === null) {
        router.push(callbackPath);
        return;
      }

      const linked = await linkRiotAccount({
        region,
        name: parsedRiot.value.name,
        tag: parsedRiot.value.tag,
      });
      router.push(linked.ok ? callbackPath : '/dashboard/settings');
    } catch {
      setError('Falha de rede ao contatar o servidor de autenticação.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      data-signup-form
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void submit();
      }}
      noValidate
      className={className}
    >
      <div className="flex flex-col gap-2.5">
        <Field
          id={nameId}
          name="name"
          label="01 // NOME DE OPERADOR / USUÁRIO"
          badge="OBRIGATÓRIO"
          autoComplete="name"
          placeholder="ex: NexusOperator"
          value={name}
          disabled={loading}
          onChange={(event) => setName(event.target.value)}
        />

        <Field
          id={emailId}
          name="email"
          label="02 // E-MAIL DE TRABALHO OU PESSOAL"
          badge="VERIFICÁVEL"
          type="email"
          autoComplete="email"
          placeholder="ex: player@exemplo.com"
          value={email}
          disabled={loading}
          onChange={(event) => setEmail(event.target.value)}
        />

        <div className="flex flex-col gap-1.5">
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-[1fr_auto]">
            <Field
              id={riotId}
              name="riotId"
              label="03 // RIOT ID INICIAL (IMPORTAÇÃO AUTOMÁTICA)"
              badge="OPCIONAL • IMPORTAÇÃO IMEDIATA"
              placeholder="ex: Aspas#LEV ou SeuNick#TAG"
              value={riotName}
              disabled={loading}
              onChange={(event) => setRiotName(event.target.value)}
            />
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={regionId}
                className="font-hud text-label-md uppercase text-text-primary"
              >
                REGIÃO
              </label>
              <select
                id={regionId}
                name="region"
                value={region}
                disabled={loading}
                onChange={(event) => setRegion(event.target.value as HenrikDevAffinity)}
                className={cx(FIELD_CONTROL_CLASS, 'pl-2 pr-6')}
              >
                {HENRIKDEV_AFFINITIES.map((affinity) => (
                  <option key={affinity} value={affinity}>
                    {`REGIÃO: ${REGION_LABELS[affinity]}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-body-sm text-text-secondary">
            Importa automaticamente as últimas 20 partidas competitivas e partidas personalizadas no
            primeiro acesso para geração do primeiro relatório telemétrico.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <PasswordField
            id={passwordId}
            name="password"
            label="04 // SENHA DE ACESSO"
            badge="COMPLEXIDADE: FORTE"
            autoComplete="new-password"
            showStrength
            value={password}
            disabled={loading}
            onChange={(event) => setPassword(event.target.value)}
          />
          <PasswordField
            id={confirmationId}
            name="passwordConfirmation"
            label="05 // CONFIRMAR SENHA"
            badge="VALIDADO"
            autoComplete="new-password"
            value={confirmation}
            disabled={loading}
            onChange={(event) => setConfirmation(event.target.value)}
          />
          <p className="text-body-sm text-text-secondary">
            Confirmação de chave criptográfica para descriptografia local de VODs.
          </p>
        </div>

        <CheckboxRow
          id={termsId}
          name="terms"
          checked={acceptedTerms}
          disabled={loading}
          onChange={(event) => setAcceptedTerms(event.target.checked)}
          label={
            <>
              Concordo com os{' '}
              {/* TODO(rotas-publicas): páginas inexistentes (spec §10). */}
              <a href="#" className="underline underline-offset-2">
                Termos de Serviço
              </a>{' '}
              e a{' '}
              <a href="#" className="underline underline-offset-2">
                Política de Telemetria de Dados
              </a>{' '}
              (Compromisso irrestrito de zero vazamento de dados de scrims, composições secretas e
              callouts táticos).
            </>
          }
        />

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <SubmitButton loading={loading} className="sm:flex-1">
            CRIAR CONTA E INICIAR TELEMETRIA
          </SubmitButton>
          <a
            href="/login"
            className="inline-flex items-center justify-center rounded-md border border-line bg-surface-pressed px-3 py-2 font-hud text-label uppercase text-text-primary transition-colors duration-[var(--duration-fast)] hover:bg-surface-hover"
          >
            CANCELAR
          </a>
        </div>

        {error !== null ? (
          <p id={errorId} role="alert" className="text-body-sm text-loss">
            {error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
```

> O `ErrorState` do link de reset/login: manter `<a>` (e não `<Link>`) em "CANCELAR" e "REGISTRAR AGENTE" pelo motivo do prefetch descrito na Task 6.

- [ ] **Step 5: Reescrever `src/app/(auth)/signup/page.tsx`**

```tsx
import { AuthTabs } from '@/components/auth/auth-tabs';
import { AuthTerminal } from '@/components/auth/auth-terminal';
import { AuthDivider } from '@/components/auth/auth-divider';
import { InfoRow } from '@/components/auth/info-row';
import { resolveCallbackPath } from '@/components/auth/resolve-callback-path';
import { RiotCallout } from '@/components/auth/riot-callout';
import { SsoButtons } from '@/components/auth/sso-buttons';
import { TelemetryPanel } from '@/components/auth/telemetry-panel';
import { TelemetryStrip } from '@/components/auth/telemetry-strip';
import { Sparkline } from '@/components/ui/sparkline';
import { SignupForm } from './signup-form';

/**
 * PÁGINA: /signup (Stitch tela 8 — "Cadastro & Novo Operador").
 *
 * Diferente da tela 7: card de registro (col-span-8) + sidebar de inteligência
 * (col-span-4), alinhados ao TOPO (sem `justify-center`), e sem a coluna de
 * telemetria pesada à esquerda.
 *
 * `instant = false`: consome `searchParams`.
 */

export const instant = false;

interface PageProps {
  searchParams: Promise<{ next?: string | string[] }>;
}

/** Série do gráfico de latência do Stitch, espelhada em ms. */
const LATENCY_SERIES = [16.1, 14.2, 15, 11.4, 12.6, 9.2, 10.8, 10.1, 5.4, 8.1, 4.2] as const;

const ACTIVATION_STEPS = [
  {
    icon: 'history',
    title: 'ANÁLISE DE ATÉ 20 PARTIDAS RECENTES',
    body: 'Recuperação de dados brutos de rounds, first bloods e economia por rodada.',
  },
  {
    icon: 'bot',
    title: 'SÍNTESE COGNITIVA MINIMAX (-98.5% TOKENS)',
    body: 'Sumarização ultracompacta em linguagem natural para leitura em 30 segundos.',
  },
  {
    icon: 'target',
    title: 'DETECÇÃO DE OVERPEEKING & RETAKE',
    body: 'Algoritmo de trigonometria espacial identificando duelos em desvantagem numérica.',
  },
  {
    icon: 'check',
    title: 'SUPORTE NATIVO AO PATCH RIOT v9.11',
    body: 'Pesos calibrados para balanceamento de duelistas, flashes e tempo de defuse.',
  },
] as const;

export default async function SignupPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const callbackPath = resolveCallbackPath(query.next);

  return (
    <div
      data-signup-page
      className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3"
    >
      <TelemetryStrip
        variant="bar"
        items={['SYS_ENV: PROD_GLOBAL // PROTOCOL_V4.2.1', 'LATENCY: 12ms (SA-EAST)', 'ZERO SCRIM LEAK CERTIFIED']}
        trailing={
          <span className="border border-line bg-accent px-1 py-0.5 font-hud text-label-xs uppercase text-on-accent">
            CADASTRO ABERTO
          </span>
        }
      />

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-12">
        <div className="flex flex-col gap-3 lg:col-span-8">
          <AuthTerminal
            protocolLine="// PROTOCOLO DE REGISTRO // NOVO OPERADOR TELEMÉTRICO"
            metaBadge="HASH ID: REC_9942_NEW"
          >
            <AuthTabs />

            <div>
              <h1 className="font-display text-display-xl-mobile uppercase tracking-tighter text-text-primary sm:text-display-xl">
                INICIALIZAR CONTA VALORANT.COACH
              </h1>
              <p className="mt-1 text-body-md text-text-secondary">
                Crie seu perfil telemétrico para calcular micro-decisões, benchmark de elo e
                coaching de IA.
              </p>
            </div>

            <SsoButtons
              callbackPath={callbackPath}
              labels={{ google: 'Cadastrar com Google', discord: 'Cadastrar com Discord' }}
            />

            <RiotCallout variant="status" title="STATUS HOMOLOGAÇÃO RIOT GAMES OAUTH DIRECT">
              Riot Sign-On (OAuth direto) em processo de homologação de produção com a Riot Games.
              Você pode vincular seu Riot ID (ex:{' '}
              <span className="font-hud text-text-primary">TenZ#0001</span>) imediatamente após a
              criação da conta.
            </RiotCallout>

            <AuthDivider label="OU PREENCHA O FORMULÁRIO DE REGISTRO" />

            <SignupForm callbackPath={callbackPath} />
          </AuthTerminal>
        </div>

        <div className="flex flex-col gap-3 lg:col-span-4">
          <TelemetryPanel eyebrow="PROTOCOLO DE ATIVAÇÃO" badge="TIER // FREE VOD">
            <p className="mb-2">
              Ao finalizar seu cadastro, o motor analítico aplica automaticamente o seguinte
              roteiro de auditoria tática:
            </p>
            <div className="flex flex-col gap-2.5">
              {ACTIVATION_STEPS.map((step) => (
                <InfoRow key={step.title} icon={step.icon} title={step.title}>
                  {step.body}
                </InfoRow>
              ))}
            </div>
          </TelemetryPanel>

          <TelemetryPanel
            eyebrow="TELEMETRIA DE LATÊNCIA DA API"
            badge="99.98% UP"
            footer={
              <span className="flex items-center justify-between gap-2">
                <span>MIN: 4.2ms</span>
                <span>MÉDIA: 9.8ms</span>
                <span>MAX: 16.1ms</span>
              </span>
            }
          >
            <Sparkline
              points={LATENCY_SERIES}
              width={200}
              height={48}
              ariaLabel="Telemetria de latência da API"
              className="mb-2 w-full"
            />
            <div className="flex items-center justify-between gap-2 font-hud text-label-xs uppercase text-text-primary">
              <span>INGESTION PIPELINE</span>
              <span>120 FPS PARSER</span>
            </div>
          </TelemetryPanel>

          <TelemetryPanel eyebrow="ACESSO" title="JÁ POSSUI UMA CONTA TELEMÉTRICA?">
            Acesse imediatamente com suas credenciais para verificar os treinos e o histórico de
            VODs.{' '}
            <a
              href="/login"
              className="font-hud text-label-xs uppercase text-text-primary underline-offset-4 hover:underline"
            >
              ACESSAR O LOGIN
            </a>
          </TelemetryPanel>

          <TelemetryPanel eyebrow="SEGURANÇA" title="CRIPTOGRAFIA DE ARQUIVOS VOD">
            Logs de partidas e dados analíticos blindados sob chave única de operador.
          </TelemetryPanel>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Remover os arquivos órfãos**

```bash
git rm src/app/(auth)/login/email-auth-forms.tsx
git rm tests/app/login/email-auth-forms.test.tsx
git status --short
```

Conferir que ninguém mais importa `email-auth-forms` nem `social-login-buttons`:
`grep -rn "email-auth-forms\|social-login-buttons" src tests` deve sair vazio.

- [ ] **Step 7: Rodar e ver passar**

```bash
npx vitest run tests/app/signup tests/app/login tests/components/auth
npm run typecheck
```
Expected: PASS.

- [ ] **Step 8: Smoke visual contra o Stitch**

`npm run dev` → `/signup` em 1280px e 390px, lado a lado com `.stitch/signup.html`. Conferir: card branco com hairline e `shadow-hard-3` (o arquivo do Stitch usa `shadow-sm` blur, **normalizado** conforme o spec §3.1), sidebar com 3 painéis, sparkline visível, medidor de força acendendo ao digitar, select com 6 regiões. Encerrar o dev.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(auth): tela 8 (/signup) com Riot ID opcional, força de senha e termos"
```

---

### Task 8: Verificação final, cobertura e documentação

**Files:**
- Modify: `AGENTS.md` (invariantes novos), `docs/README.md` (se indexar specs/plans)
- Test: suíte inteira + cobertura

**Interfaces:**
- Consumes: tudo.
- Produces: nada (verificação).

- [ ] **Step 1: Suíte inteira + typecheck + build**

```bash
npx vitest run --reporter=dot 2>&1 | tail -6
npm run typecheck
npm run build
```
Expected: 0 falhas; baseline da Task 1 era 908 testes + os novos (~30). `tsc` limpo; build sem erro (confirma que `better-auth`, as fontes locais e o `(auth)`/`(app)` coexistem).

- [ ] **Step 2: Cobertura — confirmar que analytics segue em 100%**

```bash
npm run test:coverage 2>&1 | tail -30
```
Expected: `src/services/analytics/**` em 100/100/100/100 (nada ali foi tocado). Se algum arquivo novo em `src/components/auth/` aparecer com 0%, é código não exercitado — os testes das Tasks 4 e 5 devem cobri-lo; adicionar caso antes de seguir.

- [ ] **Step 3: Registrar os invariantes novos em `AGENTS.md`**

Acrescentar em "Outros invariantes caros":

```markdown
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
- **Senha fora do Stitch**: força e confirmação são validação de UX em
  `src/lib/validation/credentials.ts`. O servidor só conhece
  `PASSWORD_MIN_LENGTH`/`PASSWORD_MAX_LENGTH`. A promessa de "30 dias" sai de
  `src/lib/session-policy.ts`, a mesma constante que configura o `createAuth`.
```

- [ ] **Step 4: Confirmar a higiene do lockfile (nenhuma dependência foi adicionada)**

```bash
git diff --stat HEAD~7 -- package.json package-lock.json
```
Expected: vazio. Se não estiver, `npx npm@10 install --package-lock-only && npx npm@10 ci --dry-run`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs: invariantes de route groups, redirect do Better Auth e política de senha/sessão"
```

---

## Auto-revisão do plano

**Cobertura do spec**

| Seção do spec | Task |
|---|---|
| §4 Reestruturação de rotas | 1 (+2 para `(auth)`) |
| §5 Chrome (`AuthHeader`/`AuthTabs`/`AuthFooter`/`TelemetryStrip`) | 2 |
| §5 Conteúdo (11 primitivas) | 4 e 5 |
| §6 `rememberMe` + `session.expiresIn` | 3 + 6 |
| §6 Confirmação de senha / medidor / termos | 3, 4, 7 |
| §6 Riot ID + região no cadastro | 7 |
| §6 Login `signIn.email` puro | 6 |
| §7 Testes (atualizar + novos + hooks preservados) | 2, 4, 5, 6, 7 |
| §8 Ordem de trabalho | ordem das tasks |
| §9 Riscos | Steps de smoke + Step de suíte da Task 1 |
| §10 Pendências | TODOs registrados no código (Task 5 do rodapé, Task 6 do reset, Task 7 dos termos) |

**Fora de escopo confirmado:** reset de senha, login por Riot ID, RSO oficial, páginas de Termos/Privacidade/Status. Nenhuma task os implementa.

**Ponto de atenção para o revisor humano**

- Task 7, Step 3: o `Sparkline` compartilhado desenha só a linha e escolhe a cor pela tendência — o Stitch desenha área amarela + marcadores. O plano usa o primitivo **como está**; enriquecê-lo afeta `/players` e `/matches`. Se a fidelidade da área importar, isso vira um item próprio.
- `Sparkline` ganha `data-sparkline` (aditivo, sem quebrar consumidores existentes).
- `bg-surface-pressed` (#e2e2e2) aproxima `surface-container-high` (#e8e8e8) do Stitch. Se a diferença incomodar, adicionar `--color-surface-high` ao bloco `@theme inline` de `globals.css` é uma linha.
