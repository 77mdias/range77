'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { TopNav, type TopNavItem } from './top-nav';

/**
 * AppTopNav — ilha client do header global: resolve a rota ativa
 * (`usePathname`) e monta o `TopNav`. As abas seguem o Stitch e são
 * CONTEXTUAIS ao jogador: dentro de `/players/{region}/{name}/{tag}` elas
 * apontam para as telas daquele jogador (Visão Geral / Partidas & Breakdown /
 * Agentes & Mapas). Fora de um contexto de jogador, só as rotas globais
 * reais existem (Busca / Console) — nunca inventamos um "player conectado".
 */

const PLAYER_ROUTE = /^\/players\/([^/]+)\/([^/]+)\/([^/]+)(?:\/|$)/;

function playerItems(base: string): readonly TopNavItem[] {
  return [
    { href: base, label: 'Visão Geral' },
    { href: `${base}/breakdown`, label: 'Partidas & Breakdown' },
    { href: `${base}/breakdown#agentes-mapas`, label: 'Agentes & Mapas' },
    { href: '/console', label: 'Console API & IA' },
  ];
}

const GLOBAL_ITEMS: readonly TopNavItem[] = [
  { href: '/', label: 'Busca' },
  { href: '/console', label: 'Console API & IA' },
];

export function resolveNavItems(pathname: string): readonly TopNavItem[] {
  const match = PLAYER_ROUTE.exec(pathname);
  if (match === null) {
    return GLOBAL_ITEMS;
  }
  const [region, name, tag] = match.slice(1) as [string, string, string];
  return playerItems(`/players/${region}/${name}/${tag}`);
}

/** Rota ativa: prefixo mais longo vence (breakdown > base; hash ignora­do). */
export function resolveActiveHref(
  items: readonly TopNavItem[],
  pathname: string,
): string | undefined {
  const candidates = [...items]
    .map((item) => ({ item, target: item.href.split('#')[0] ?? item.href }))
    .sort((a, b) => b.target.length - a.target.length);
  for (const { item, target } of candidates) {
    if (pathname === target || pathname.startsWith(`${target}/`)) {
      return item.href;
    }
  }
  return undefined;
}

export function AppTopNav({ user }: { readonly user?: ReactNode }) {
  const pathname = usePathname();
  const items = resolveNavItems(pathname);

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
      items={items}
      activeHref={resolveActiveHref(items, pathname)}
      statusText="Pipeline 3-layer: online"
      actions={actions}
    />
  );
}
