import type { ReactNode } from 'react';
import { TagLabel } from '@/components/ui/tag-label';
import { cx } from '@/lib/cx';

/**
 * TelemetryPanel — bloco eyebrow + título + corpo do Stitch. Usado nos cards
 * da coluna esquerda da tela 7 e nos painéis da sidebar da tela 8.
 * `accent` reproduz o callout "PROTOCOL ADVICE" (barra amarela + sombra dura).
 */
export interface TelemetryPanelProps {
  readonly eyebrow: string;
  readonly badge?: string;
  readonly title?: string;
  readonly accent?: boolean;
  readonly footer?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}

export function TelemetryPanel({
  eyebrow,
  badge,
  title,
  accent = false,
  footer,
  children,
  className,
}: TelemetryPanelProps) {
  return (
    <section
      data-telemetry-panel
      {...(accent ? { 'data-accent': '' } : {})}
      className={cx(
        'flex flex-col gap-2 rounded-md border border-line bg-surface-raised p-3',
        accent && 'border-l-4 border-l-accent shadow-hard-2',
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TagLabel>{eyebrow}</TagLabel>
        {badge !== undefined ? (
          <span className="border border-line bg-surface px-1 py-0.5 font-hud text-label-xs uppercase text-text-secondary">
            {badge}
          </span>
        ) : null}
      </div>

      {title !== undefined ? (
        <h2 className="font-display text-headline-md uppercase text-text-primary">{title}</h2>
      ) : null}

      <div className="text-body-sm leading-relaxed text-text-secondary">{children}</div>

      {footer !== undefined ? (
        <div className="border-t border-line pt-2 font-hud text-label-xs uppercase text-text-secondary">
          {footer}
        </div>
      ) : null}
    </section>
  );
}
