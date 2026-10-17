import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * SUITE TDD — layout do route group `(app)`. Garante que o shell da app
 * (AppTopNav + <main> + AppFooter) vive no grupo, e NÃO mais no layout raiz:
 * é essa separação que dá chrome próprio às telas de auth.
 */

// `AppTopNav` renderiza ilhas client (`NavSearch` usa `useRouter`, a ilha de
// rota ativa usa `usePathname`) — os dois hooks precisam existir no mock.
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// O root layout importa `./globals.css`; o pipeline CSS do vitest não carrega
// o postcss.config.mjs do projeto (Tailwind v4 via PostCSS). O layout é o que
// está sob teste, não a folha de estilo.
vi.mock('@/app/globals.css', () => ({}));

// `next/font/local` só resolve dentro do runtime do Next (loader de build);
// no ambiente node do vitest o default export não é função.
vi.mock('next/font/local', () => ({
  default: () => ({ variable: '--mock-font', className: 'mock-font' }),
}));

import RootLayout from '@/app/layout';
import AppGroupLayout from '@/app/(app)/layout';

describe('AppGroupLayout', () => {
  it('renderiza o shell da app e o filho', () => {
    const html = renderToStaticMarkup(
      <AppGroupLayout>
        <span data-child />
      </AppGroupLayout>,
    );
    expect(html).toContain('data-component="top-nav"');
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
    expect(html).not.toContain('data-component="top-nav"');
  });
});
