import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/icon';
import { StatusDot } from '@/components/ui/status-dot';
import { TagLabel } from '@/components/ui/tag-label';
import { cx } from '@/lib/cx';

/**
 * SystemStatusBar — faixa de notificação tática (topo da landing): dot
 * pulsante + protocolo à esquerda, status operacionais à direita.
 */

export interface SystemStatusItem {
  readonly icon: IconName;
  readonly label: string;
}

export interface SystemStatusBarProps {
  readonly message: ReactNode;
  readonly statuses?: readonly SystemStatusItem[];
  readonly className?: string;
}

export function SystemStatusBar({ message, statuses, className }: SystemStatusBarProps) {
  return (
    <div
      data-component="system-status-bar"
      className={cx('w-full border-b border-line bg-surface-raised py-1.5 px-4', className)}
    >
      <div className="flex w-full flex-wrap items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <StatusDot variant="live" />
          <TagLabel className="truncate">{message}</TagLabel>
        </span>
        {statuses !== undefined && statuses.length > 0 ? (
          <span
            className="hidden items-center gap-3 font-hud text-label uppercase text-text-secondary sm:flex"
            data-status-items
          >
            {statuses.map((status, index) => (
              <span key={status.label} className="flex items-center gap-3">
                {index > 0 ? (
                  <span aria-hidden="true" className="text-line">
                    |
                  </span>
                ) : null}
                <span className="flex items-center gap-1">
                  <Icon name={status.icon} />
                  {status.label}
                </span>
              </span>
            ))}
          </span>
        ) : null}
      </div>
    </div>
  );
}
