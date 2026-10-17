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
