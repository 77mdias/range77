'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { MouseEvent } from 'react';
import { Icon } from '@/components/ui/icon';

/**
 * BackButton — "Voltar" da tela da partida. Com histórico no navegador,
 * volta de fato (`router.back()`, preserva aba/scroll do perfil de origem);
 * sem histórico (link aberto direto/nova aba), o `href` de fallback leva ao
 * perfil do jogador da perspectiva — ou à home quando não há `?player=`.
 * É um `<Link>` real: funciona sem JS e com ctrl/cmd+clique.
 */

export interface BackButtonProps {
  readonly fallbackHref: string;
  readonly label: string;
}

export function BackButton({ fallbackHref, label }: BackButtonProps) {
  const router = useRouter();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    if (modified || event.button !== 0 || window.history.length <= 1) {
      return;
    }
    event.preventDefault();
    router.back();
  }

  return (
    <Link
      href={fallbackHref}
      onClick={handleClick}
      data-match-back
      className="inline-flex items-center gap-1 rounded-md border border-line bg-surface-raised px-2 py-1 font-hud text-label uppercase text-text-primary transition-colors duration-[var(--duration-fast)] hover:bg-surface-hover"
    >
      <Icon name="arrow-left" size="sm" />
      {label}
    </Link>
  );
}
