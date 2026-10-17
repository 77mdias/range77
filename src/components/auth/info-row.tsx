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
