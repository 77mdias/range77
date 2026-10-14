import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';
import { StatusDot } from '@/components/ui/status-dot';
import { NavSearch } from './nav-search';
import { cx } from '@/lib/cx';

/**
 * TopNav — header global (Stitch "Protocol Precision", pixel-fiel): barra
 * FIXA no topo, fundo branco opaco com hairline preta (sem blur), altura
 * `h-14` e margem de página `px-margin`. Três clusters:
 *   - esquerda: marca (logo + wordmark) + status pill do pipeline;
 *   - centro: abas full-height com divisórias verticais — a ativa ganha
 *     fundo acento + `border-b-2` preta (assinatura do design);
 *   - direita: busca rápida (ilha `NavSearch`), notificações e slot de
 *     perfil atrás de divisória vertical.
 *
 * Server Component: `items`/`activeHref`/`user` vêm do shell; a busca é a
 * única ilha client. Abas somem abaixo de `xl`, busca abaixo de `md` —
 * exatamente como no Stitch (sem menu mobile no design).
 */

export interface TopNavItem {
  readonly href: string;
  readonly label: string;
}

export interface TopNavProps {
  readonly items: readonly TopNavItem[];
  /** Href ativo (fundo acento + borda inferior). */
  readonly activeHref?: string;
  /** Texto do status pill (ex.: "API Pipeline: Active (3-Layer Mode)"). */
  readonly statusText?: string;
  /** Slot do perfil (NavUser ou fallback "Entrar"). */
  readonly user?: ReactNode;
  readonly className?: string;
}

export function TopNav({
  items,
  activeHref,
  statusText,
  user,
  className,
}: TopNavProps) {
  return (
    <header
      data-component="top-nav"
      className={cx(
        'fixed inset-x-0 top-0 z-50 w-full border-b border-line bg-surface',
        className,
      )}
    >
      <div className="flex h-14 w-full items-center justify-between gap-2 px-3 md:px-4">
        {/* Marca + status do pipeline */}
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/"
            aria-label="ValCoach — início"
            className="flex items-center gap-2"
          >
            <span
              aria-hidden="true"
              className="flex size-8 items-center justify-center rounded-md border border-line bg-accent font-display text-heading-sm leading-none text-text-primary"
            >
              V
            </span>
            <span className="hidden font-display text-heading-sm uppercase leading-none tracking-tight text-text-primary sm:inline-block">
              VALORANT.COACH
            </span>
          </Link>
          {statusText !== undefined ? (
            <span
              data-top-nav-status
              className="hidden items-center gap-0.75 rounded-md border border-line bg-surface-raised px-1.5 py-0.75 font-hud text-label-xs uppercase text-text-primary md:inline-flex"
            >
              <StatusDot variant="live" className="border border-line" />
              {statusText}
            </span>
          ) : null}
        </div>

        {/* Abas: full-height, divisórias verticais, ativa em acento */}
        {items.length > 0 ? (
          <nav
            aria-label="Principal"
            className="hidden h-full items-center xl:flex"
            data-top-nav-items
          >
            {items.map((item) => {
              const active = item.href === activeHref;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cx(
                    'inline-flex h-full items-center border-r border-line px-2',
                    'font-hud text-label uppercase transition-colors duration-[var(--duration-fast)]',
                    active
                      ? 'border-b-2 bg-accent text-text-primary'
                      : 'text-text-secondary hover:bg-surface-recessed hover:text-text-primary',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        ) : null}

        {/* Ações: busca rápida + notificações + perfil */}
        <div className="flex shrink-0 items-center gap-1.5" data-top-nav-actions>
          <NavSearch />
          <button
            type="button"
            aria-label="Notificações"
            data-nav-bell
            className="flex size-8 items-center justify-center rounded-md border border-line bg-surface-raised text-text-primary transition-colors duration-[var(--duration-fast)] hover:bg-surface-hover"
          >
            <Icon name="bell" size="md" />
          </button>
          <div
            className="flex items-center gap-1 border-l border-line pl-1"
            data-nav-profile-slot
          >
            {user}
          </div>
        </div>
      </div>
    </header>
  );
}
