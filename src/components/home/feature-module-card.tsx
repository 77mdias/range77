import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/icon';
import { cx } from '@/lib/cx';

/**
 * FeatureModuleCard — módulo do ecossistema (landing): ID mono + ícone no
 * topo, título uppercase, descrição e rodapé com par chave→valor.
 */

export interface FeatureModuleCardProps {
  /** Identificador (ex.: "MOD_01"). */
  readonly moduleId: string;
  readonly icon: IconName;
  readonly title: string;
  readonly description: ReactNode;
  readonly statLabel: string;
  readonly statValue: string;
  readonly className?: string;
}

export function FeatureModuleCard({
  moduleId,
  icon,
  title,
  description,
  statLabel,
  statValue,
  className,
}: FeatureModuleCardProps) {
  return (
    <article
      data-component="feature-module-card"
      data-module={moduleId}
      className={cx(
        'flex flex-col justify-between rounded-md border border-line bg-surface-raised p-3',
        'transition-colors duration-[var(--duration-fast)] hover:bg-surface',
        className,
      )}
    >
      <div>
        <header className="flex items-center justify-between gap-2">
          <span className="font-hud text-label uppercase text-text-secondary">{moduleId}</span>
          <Icon name={icon} size="md" className="text-text-primary" />
        </header>
        <h3 className="mt-2 font-display text-heading-sm uppercase tracking-tight text-text-primary">
          {title}
        </h3>
        <p className="mt-1.5 text-body leading-relaxed text-text-secondary">{description}</p>
      </div>
      <footer className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2 font-hud text-label uppercase">
        <span className="text-text-secondary">{statLabel}</span>
        <span className="font-bold text-text-primary">{statValue}</span>
      </footer>
    </article>
  );
}
