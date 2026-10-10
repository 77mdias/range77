'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { TopNav, type TopNavItem } from './top-nav';

/**
 * AppTopNav — ilha client do header global: resolve a rota ativa
 * (`usePathname`) e monta o `TopNav` com as rotas reais da aplicação.
 * O slot `user` (server-rendered) é repassado como actions.
 */

const NAV_ITEMS: readonly TopNavItem[] = [
  { href: '/', label: 'Busca' },
  { href: '/dashboard', label: 'Dashboard' },
];

function resolveActiveHref(pathname: string): string | undefined {
  const active = NAV_ITEMS.find((item) =>
    item.href === '/' ? pathname === '/' : pathname.startsWith(item.href),
  );
  return active?.href;
}

export function AppTopNav({ user }: { readonly user?: ReactNode }) {
  const pathname = usePathname();

  const actions =
    user ?? (
      <Link
        href="/login"
        className="rounded-md border border-line bg-surface-raised px-3 py-1.5 font-hud text-label uppercase text-text-primary transition-colors duration-[var(--duration-fast)] hover:bg-surface-hover"
      >
        Entrar
      </Link>
    );

  return (
    <TopNav
      items={NAV_ITEMS}
      activeHref={resolveActiveHref(pathname)}
      statusText="Pipeline 3-layer: online"
      actions={actions}
    />
  );
}
