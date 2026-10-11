import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';
import { StatusDot } from '@/components/ui/status-dot';
import { cx } from '@/lib/cx';

/**
 * TopNav — header global (Stitch): cluster de marca + status pill do
 * pipeline, abas de navegação e slot de ações (busca, notificações,
 * perfil). Server Component: `items`/`activeHref` vêm do shell.
 */

export interface TopNavItem {
  readonly href: string;
  readonly label: string;
}

export interface TopNavProps {
  readonly items: readonly TopNavItem[];
  /** Href ativo (destaque com fundo acento). */
  readonly activeHref?: string;
  /** Texto do status pill (ex.: "API Pipeline: Active"). */
  readonly statusText?: string;
  readonly actions?: ReactNode;
  readonly className?: string;
}

export function TopNav({
  items,
  activeHref,
  statusText,
  actions,
  className,
}: TopNavProps) {
  return (
    <header
      data-component="top-nav"
      className={cx(
        'sticky top-0 z-40 w-full border-b border-line bg-surface/95 backdrop-blur',
        className,
      )}
    >
      <div className="flex h-14 w-full items-center justify-between gap-4 px-4 md:px-6 xl:px-8">
        <div className="flex shrink-0 items-center gap-4">
          <Link href="/" className="flex items-center gap-2" aria-label="ValCoach — início">
            <span aria-hidden="true" className="inline-block size-3.5 bg-accent" />
            <span className="hidden font-display text-heading-sm uppercase leading-none tracking-tight text-text-primary sm:inline-block">
              ValCoach
            </span>
          </Link>
          {statusText !== undefined ? (
            <span
              data-top-nav-status
              className="hidden items-center gap-1.5 rounded-md border border-line bg-surface-raised px-2 py-1 font-hud text-label uppercase text-text-secondary md:inline-flex"
            >
              <StatusDot variant="live" />
              {statusText}
            </span>
          ) : null}
        </div>

        {items.length > 0 ? (
          <nav
            aria-label="Principal"
            className="hidden h-full items-center lg:flex"
            data-top-nav-items
          >
            {items.map((item, index) => {
              const active = item.href === activeHref;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cx(
                    'inline-flex h-full items-center px-3',
                    'font-hud text-label uppercase transition-colors duration-[var(--duration-fast)]',
                    'border-line',
                    index < items.length - 1 ? 'border-r' : '',
                    active
                      ? 'bg-accent font-semibold text-text-primary'
                      : 'text-text-secondary hover:bg-surface-raised hover:text-text-primary',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        ) : null}

        {actions !== undefined ? (
          <div className="flex shrink-0 items-center gap-2" data-top-nav-actions>
            {actions}
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-2" data-top-nav-actions>
            <span
              className="inline-flex size-8 items-center justify-center rounded-md border border-line bg-surface-raised text-text-secondary"
              aria-hidden="true"
            >
              <Icon name="bell" size="md" />
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
