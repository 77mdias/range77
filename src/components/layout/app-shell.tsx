import Link from 'next/link';
import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

/**
 * Shell da aplicação (Server Component): header sticky com logo
 * tipográfico e navegação, `<main>` para a página e footer discreto.
 * O fundo `void` + textura de grid ficam no `body` (globals.css).
 */

const NAV_ITEMS: readonly { readonly href: string; readonly label: string }[] = [
  { href: '/', label: 'Tracker' },
];

export interface AppShellProps {
  readonly children: ReactNode;
  /** Slot futuro de usuário (avatar/login) — fase 3 (auth). */
  readonly user?: ReactNode;
}

export function AppShell({ children, user }: AppShellProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-surface-raised">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-8 px-4">
          <Link
            href="/"
            className={cx(
              'font-display text-heading-lg leading-none text-text-primary',
              'transition-colors duration-[var(--duration-fast)] ease-out-expo hover:text-accent',
            )}
          >
            VAL<span className="text-accent">COACH</span>
          </Link>

          <nav aria-label="Principal">
            <ul className="flex items-center gap-6">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cx(
                      'text-label uppercase text-text-secondary',
                      'transition-colors duration-[var(--duration-fast)] ease-out-expo hover:text-text-primary',
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Slot de usuário — preenchido na fase 3 (Better Auth). */}
          <div className="ml-auto" data-user-slot>
            {user}
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-line bg-surface-raised">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 text-body text-text-secondary">
          VALCOACH — dados fornecidos pela HenrikDev API. Projeto não afiliado à Riot Games.
        </div>
      </footer>
    </div>
  );
}
